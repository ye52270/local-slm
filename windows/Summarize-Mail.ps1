<#
.SYNOPSIS
  로컬 SLM(GGUF, llama.cpp CPU)으로 Outlook 메일을 요약해 발신자 / 요약 / 할 일 / 기한을 콘솔에 표시한다.

.DESCRIPTION
  Python 없이 PowerShell 5.1 이상만으로 동작한다.
  - Outlook(클래식 데스크탑)에서 COM으로 메일을 읽는다.
  - bin\llama-server.exe 를 자동으로 띄우고 /v1/chat/completions 에 JSON 스키마를 강제해 슬롯을 채운다.
  - 메일 내용은 이 PC 밖으로 나가지 않는다 (127.0.0.1 만 사용).

.EXAMPLE
  .\Summarize-Mail.ps1 -Selected            # Outlook에서 지금 선택한 메일 요약
  .\Summarize-Mail.ps1 -Latest 5            # 받은 편지함 최근 5통
  .\Summarize-Mail.ps1 -Subject "약관"       # 제목에 '약관'이 들어간 최근 메일
  .\Summarize-Mail.ps1 -Latest 3 -KeepServer   # 끝나도 서버 유지(다음 실행이 빨라짐)
  .\Summarize-Mail.ps1 -Watch               # 새 메일 도착 시 자동 요약·캐시 (다른 창에서 -Selected 하면 즉시)
  .\Summarize-Mail.ps1 -Panel -Watch        # 브리핑 패널 + 감시: 새 메일이 오면 패널이 요약하고 오브·말풍선으로 알림
#>
[CmdletBinding()]
param(
    [switch]$Selected,
    [int]$Latest = 3,
    [string]$Subject,
    [string]$Model,             # 기본: models\ 안의 첫 *.gguf
    [int]$Port = 8080,
    [int]$Ctx = 2048,           # 메일 요약엔 충분. 긴 메일은 -MaxBodyChars 로 잘림
    [int]$Threads = 0,          # 0 = 물리 코어 수 자동
    [int]$MaxBodyChars = 900,      # 본문 예산(자). 넘으면 앞부분+기한/요청 문장만 추려 넣음
    [int]$MaxTokens = 180,
    [switch]$LowMem,            # 메모리 우선: --no-repack + KV q8 (x86 에서는 속도가 크게 떨어지므로 기본 꺼짐)
    [switch]$Watch,             # 백그라운드 감시: 새 메일이 오면 미리 요약해 캐시 (실시간 조회용)
    [int]$WatchInterval = 0,    # 감시 주기(초). 0 = 기본값(콘솔 -Watch 30초, -Panel -Watch 300초)
    [switch]$Gentle,            # VDI 리소스 절약: 낮은 우선순위·코어-1·유휴 시 모델 내림·폴링 없음 (-Panel/-Watch 는 기본 켜짐)
    [switch]$NoCache,
    [switch]$ShowInput,         # 모델에 실제로 들어가는 본문(정리·필터 후)을 출력 (진단용)
    [switch]$KeepServer,
    [switch]$Json,
    [switch]$Export,            # 읽은 메일을 web\data\inbox.json 으로 내보내기만 한다(요약 안 함)
    [string]$ExportPath,        # 기본: <스크립트 폴더>\web\data\inbox.json
    [switch]$Panel,             # 내보내기 → 서버(정적 web\ 포함) 기동 → 브라우저로 브리핑 패널 열기 (서버 유지)
    [string]$Today = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
if ($Panel -or $Watch) { $Gentle = $true }
if ($WatchInterval -le 0) { $WatchInterval = if ($Panel) { 300 } else { 30 } }
$OutputEncoding = [System.Text.Encoding]::UTF8

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinDir  = Join-Path $Root 'bin'
$ModelDir = Join-Path $Root 'models'
$Server  = Join-Path $BinDir 'llama-server.exe'
$Base    = "http://127.0.0.1:$Port"

# ------------------------------------------------------------------ prompt --

# 프롬프트/스키마/후처리 규칙을 바꾸면 올린다 → 캐시 키가 달라져 옛 결과가 자동 무효화된다.
$PromptVersion = 'v4'

$SystemPrompt = @"
이메일 비서. 메일을 읽고 JSON으로만, 한국어로 답한다. 오늘: $Today
- summary: 핵심 한 문장(50자 이내), 인사말 제외.
- action_items: 수신자가 직접 해야 할 행동만, 각 30자 이내, 최대 3개. 없으면 [].
- deadline: 본문에 명시된 기한만 YYYY-MM-DD, 없으면 null. 수신일시는 기한이 아니다. 연도 없으면 수신일 기준.
- priority: 조치 필요+보안/계정/마감=high, 확인만=medium, 광고/잡담/만료된 인증코드=low.
- category: action_required/notice/verification/personal/newsletter/other
- 보안 경고문·면책 문구·서명·인사말은 무시하고 실제 업무 내용만 본다.
- 본문에 없는 내용은 만들지 않는다.
"@

$Schema = [ordered]@{
    type = 'object'
    properties = [ordered]@{
        summary      = @{ type = 'string' }
        action_items = @{ type = 'array'; items = @{ type = 'string' } }
        deadline     = @{ type = @('string', 'null') }
        priority     = @{ type = 'string'; enum = @('high', 'medium', 'low') }
        category     = @{ type = 'string'; enum = @('action_required', 'notice', 'verification', 'personal', 'newsletter', 'other') }
    }
    required = @('summary', 'action_items', 'deadline', 'priority', 'category')
}

# ------------------------------------------------------------------ server --

# 사내 프록시가 잡혀 있어도 127.0.0.1 로만 가도록 프록시를 끈 HttpClient 를 쓴다.
Add-Type -AssemblyName System.Net.Http
$script:Handler = New-Object System.Net.Http.HttpClientHandler
$script:Handler.UseProxy = $false
$script:Http = New-Object System.Net.Http.HttpClient($script:Handler)
$script:Http.Timeout = [TimeSpan]::FromMinutes(10)
$script:QuickHandler = New-Object System.Net.Http.HttpClientHandler
$script:QuickHandler.UseProxy = $false
$script:Quick = New-Object System.Net.Http.HttpClient($script:QuickHandler)
$script:Quick.Timeout = [TimeSpan]::FromSeconds(2)

function Get-Quick {
    param([string]$Path)
    try {
        $resp = $script:Quick.GetAsync("$Base$Path").Result
        if (-not $resp.IsSuccessStatusCode) { return $null }
        return ($resp.Content.ReadAsStringAsync().Result | ConvertFrom-Json)
    } catch { return $null }
}

function Test-Health {
    $r = Get-Quick '/health'
    return ($r -and $r.status -eq 'ok')
}

function Get-LoadedModel {
    $r = Get-Quick '/props'
    if ($r -and $r.role -eq 'router') { return 'router' }
    if ($r -and $r.model_path) { return [string]$r.model_path }
    return ''
}

function Resolve-Model {
    if ($Model) {
        if (Test-Path $Model) { return (Resolve-Path $Model).Path }
        $cand = Join-Path $ModelDir $Model
        if (Test-Path $cand) { return $cand }
        throw "모델 파일을 찾을 수 없습니다: $Model"
    }
    $all = @(Get-ChildItem -Path $ModelDir -Filter *.gguf -ErrorAction SilentlyContinue)
    if (-not $all.Count) { throw "models\ 폴더에 .gguf 파일이 없습니다. GGUF 모델을 넣어 주세요: $ModelDir" }
    # 기본 모델: 4B(정확도 — 실메일 30통 비교에서 2B 보다 확실히 나음) → 2B → 3B. -Model 로 언제든 지정 가능
    foreach ($pref in @('4B', '2B', '3B')) {
        $hit = $all | Where-Object { $_.Name -match $pref } | Sort-Object Name | Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return ($all | Sort-Object Name | Select-Object -First 1).FullName
}

$script:ServerProc = $null
function Start-Server {
    param([string]$ModelPath, [switch]$Router)
    if (Test-Health) {
        $loaded = Get-LoadedModel
        if ($Router -and $loaded -eq 'router') { Write-Host "· llama-server(라우터) 재사용" -ForegroundColor DarkGray; return }
        if (-not $Router -and (Split-Path -Leaf $loaded) -eq (Split-Path -Leaf $ModelPath)) {
            Write-Host "· llama-server 재사용 ($(Split-Path -Leaf $ModelPath))" -ForegroundColor DarkGray
            return
        }
        throw "포트 $Port 에 다른 서버($loaded)가 떠 있습니다. Stop-Process -Name llama-server 로 내리거나 -Port 를 바꿔 주세요."
    }
    if (-not (Test-Path $Server)) { throw "llama-server.exe 가 없습니다: $Server" }

    $t = $Threads
    if ($t -le 0) {
        $cores = 0
        try { $cores = [int](Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfCores -Sum).Sum } catch {}
        if ($cores -le 0) { $cores = [int]$env:NUMBER_OF_PROCESSORS }
        $t = if ($Gentle) { [Math]::Max(1, $cores - 1) } else { [Math]::Max(1, $cores) }   # 절약 모드는 사용자 작업용 코어 하나를 남긴다
    }
    # 라우터 모드(-Panel): models\ 의 gguf 를 전부 노출하고 요청의 model 필드로 골라 쓴다. 한 번에 1개만 메모리에 올린다.
    if ($Router) { $modelArgs = @('--models-dir', "`"$ModelDir`"", '--models-max', '1') } else { $modelArgs = @('-m', "`"$ModelPath`"") }
    $srvArgs = $modelArgs + @('--port', $Port, '-c', $Ctx, '-t', $t, '--jinja',
              '--reasoning-budget', '0', '--parallel', '1', '--host', '127.0.0.1')
    $webDir = Join-Path $Root 'web'
    if (Test-Path (Join-Path $webDir 'index.html')) { $srvArgs += @('--path', "`"$webDir`"") }   # 브리핑 패널 정적 서빙
    if ($Gentle) {
        # VDI 절약: 낮은 프로세스 우선순위, 유휴 폴링 없음, 5분 유휴 시 모델을 메모리에서 내림(다음 요청 때 다시 로드), 워밍업 생략
        $srvArgs += @('--prio', '-1', '--poll', '0', '--sleep-idle-seconds', '300', '--no-warmup')
    }
    if ($LowMem) {
        # 메모리 우선: repack 복사본 제거 + KV 캐시 q8. x86 에서는 프롬프트 처리가 크게 느려진다.
        $srvArgs += @('--no-repack', '-fa', 'on', '--cache-type-k', 'q8_0', '--cache-type-v', 'q8_0', '-ub', '256')
    }
    $what = if ($Router) { "라우터 · models\ 전체" } else { Split-Path -Leaf $ModelPath }
    Write-Host "· llama-server 기동 중 ($what, $t threads) ..." -NoNewline -ForegroundColor DarkGray
    $log = Join-Path $Root 'llama-server.log'
    $script:ServerProc = Start-Process -FilePath $Server -ArgumentList $srvArgs -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError (Join-Path $Root 'llama-server.err.log')
    if ($Gentle) { try { $script:ServerProc.PriorityClass = 'BelowNormal' } catch {} }
    for ($i = 0; $i -lt 240; $i++) {
        if (Test-Health) {
            Write-Host " 준비 완료" -ForegroundColor DarkGray
            return
        }
        if ($script:ServerProc.HasExited) { Write-Host ""; throw "llama-server 가 종료됐습니다. 로그: $log" }
        Start-Sleep -Milliseconds 500
    }
    Stop-Server
    throw "llama-server 기동 시간 초과 (2분). 로그: $log"
}

function Show-CpuInfo {
    # 어떤 CPU 커널이 올라왔는지 표시 (haswell=AVX2 이상이면 정상, x64/sse42 면 하이퍼바이저가 AVX2 를 막은 상태)
    try {
        $files = @((Join-Path $Root 'llama-server.log'), (Join-Path $Root 'llama-server.err.log')) | Where-Object { Test-Path $_ }
        $lines = @()
        foreach ($f in $files) { $lines += [System.IO.File]::ReadAllLines($f) }
        $k = $lines | Where-Object { $_ -match '(ggml-cpu-[a-z0-9]+)\.dll' } | Select-Object -First 1
        $kern = ''; if ($k -and $k -match '(ggml-cpu-[a-z0-9]+)\.dll') { $kern = $Matches[1] }
        $si = $lines | Where-Object { $_ -match 'system_info:' } | Select-Object -First 1
        $avx = ''; if ($si) { $avx = (($si -split '\|') | Where-Object { $_ -match 'AVX' } | ForEach-Object { $_.Trim() }) -join ' ' }
        if ($kern -or $avx) { Write-Host "· CPU 커널: $kern  $avx" -ForegroundColor DarkGray }
    } catch {}
}

function Stop-Server {
    if ($script:ServerProc -and -not $script:ServerProc.HasExited) {
        try { $script:ServerProc.Kill() } catch {}
    }
}

# --------------------------------------------------------------------- llm --

function Invoke-Chat {
    param([string]$User)
    $payload = [ordered]@{
        messages = @(
            @{ role = 'system'; content = $SystemPrompt },
            @{ role = 'user';   content = $User }
        )
        temperature = 0.1
        max_tokens  = $MaxTokens
        chat_template_kwargs = @{ enable_thinking = $false }
        response_format = @{ type = 'json_schema'; json_schema = @{ name = 'mail'; schema = $Schema } }
    }
    $json = $payload | ConvertTo-Json -Depth 12 -Compress
    $content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, 'application/json')
    $resp = $script:Http.PostAsync("$Base/v1/chat/completions", $content).Result
    $body = $resp.Content.ReadAsStringAsync().Result
    if (-not $resp.IsSuccessStatusCode) { throw "llama-server 오류 $($resp.StatusCode): $body" }
    $r = $body | ConvertFrom-Json
    return @{
        content   = $r.choices[0].message.content
        tokens    = $r.usage.completion_tokens
        ptokens   = $r.usage.prompt_tokens
        pms       = [int]$r.timings.prompt_ms
        gms       = [int]$r.timings.predicted_ms
        ms        = [int](($r.timings.prompt_ms + $r.timings.predicted_ms))
    }
}

# ----------------------------------------------------------------- outlook --

function Get-SmtpAddress {
    param($Mail)
    $addr = [string]$Mail.SenderEmailAddress
    if ($Mail.SenderEmailType -eq 'EX' -or $addr -like '/O=*' -or $addr -like '/o=*') {
        try {
            $u = $Mail.Sender.GetExchangeUser()
            if ($u -and $u.PrimarySmtpAddress) { return $u.PrimarySmtpAddress }
        } catch {}
        try {   # PR_SENDER_SMTP_ADDRESS — 시스템 메일함(Exchange 자체 발송)도 여기엔 SMTP 가 들어 있다
            $smtp = $Mail.PropertyAccessor.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x5D01001F')
            if ($smtp) { return [string]$smtp }
        } catch {}
        if ($addr -like '/O=*' -or $addr -like '/o=*') { return 'exchange' }   # X500 주소는 표시 안 함
    }
    return $addr
}

function Clean-Body {
    param([string]$Text)
    if (-not $Text) { return '' }
    $t = $Text -replace "`r`n", "`n"
    # 메일 게이트웨이가 앞에 붙이는 외부메일/보안 경고 배너 제거 (요약·할 일을 오염시키고 토큰만 먹음)
    $bannerRe = '(보안\s*경고|외부\s*(에서|로부터)?\s*(발송|수신|유입)|외부\s*메일|열람\s*시\s*주의|악성\s*코드|피싱|스미싱|랜섬웨어|발신자[^\n]{0,20}(확인|주소)|링크[^\n]{0,20}(확인|주의|클릭|주소)|첨부[^\n]{0,25}(주의|확인|확장자)|주의\s*하시기|반드시\s*확인|^\s*[①②③④⑤]|CAUTION|EXTERNAL|This (email|message) (originated|was sent) from outside|Do not click)'
    $ls = $t -split "`n"
    $keep = New-Object System.Collections.Generic.List[string]
    for ($i = 0; $i -lt $ls.Count; $i++) {
        $l = $ls[$i]
        if ($i -lt 15 -and $l -match $bannerRe) { continue }   # 앞머리 15줄 안의 배너 줄만 걷어냄
        $keep.Add($l)
    }
    $t = ($keep -join "`n").TrimStart("`n", ' ')
    # 회신/전달 체인: 인용된 원문은 잘라낸다 (앞부분은 최소 150자 보존).
    # 구분선 또는 인용 헤더 줄(From:/Sent:/Subject:/보낸 사람:/제목:/날짜: ...)이 처음 나오는 지점에서 자른다.
    $cut = -1
    # 구분선: 앞에 공백/탭이 있어도 잡는다. "----- 원본 메시지 -----", "-----Original Message-----", "_____", "> " 인용
    $sepRe = '\n[ \t]*(-{3,}[ \t]*(원본\s*메시지|Original\s*Message|Forwarded\s*message|전달된\s*메시지)[^\n]*|_{8,}|-{16,}|>\s)'
    $sep = [regex]::Match($t, $sepRe, 'IgnoreCase')
    while ($sep.Success -and $sep.Index -le 150) { $sep = $sep.NextMatch() }
    if ($sep.Success) { $cut = $sep.Index }
    # 인용 헤더 줄: From:/Sent:/Subject:/보낸 사람:/발신인:/수신인:/참조인:/제목:/날짜: ...
    $hdr = [regex]::Match($t, '\n[ \t]*(From|Sent|To|Cc|Subject|Date|보낸\s*사람|보낸\s*날짜|받는\s*사람|참조(인)?|발신(인|자)?|수신(인|자)?|보낸이|받는이|날짜|일시|일자|제목)\s*:', 'IgnoreCase')
    while ($hdr.Success -and $hdr.Index -le 150) { $hdr = $hdr.NextMatch() }
    if ($hdr.Success -and ($cut -lt 0 -or $hdr.Index -lt $cut)) { $cut = $hdr.Index }
    $m = [regex]::Match($t, '\n(On .+wrote:|\d{4}[.년].+(님이|wrote)[^\n]*:)\s*\n')
    if ($m.Success -and $m.Index -gt 150 -and ($cut -lt 0 -or $m.Index -lt $cut)) { $cut = $m.Index }
    if ($cut -gt 0) { $t = $t.Substring(0, $cut) }
    $t = [regex]::Replace($t, '<https?://[^>]+>', '')
    $t = [regex]::Replace($t, 'https?://[^\s<>"'')\]]+', '[링크]')   # 링크는 요약 대상이 아님(토큰 절약)
    $t = [regex]::Replace($t, '[ \t]+\n', "`n")
    $t = [regex]::Replace($t, '\n{3,}', "`n`n")
    return $t.Trim()
}

function Select-Relevant {
    <#
      긴 본문을 SLM 에 통째로 넣지 않고, 앞부분(맥락) + 기한/요청/행동 관련 문장만 추려서 예산 안에 맞춘다.
      CPU 에서는 프롬프트 토큰이 시간의 절반 이상이라 입력을 줄이는 것이 가장 큰 속도 레버다.
    #>
    param([string]$Text, [int]$Budget)
    if ($Text.Length -le $Budget) { return $Text }
    $head = $Text.Substring(0, [Math]::Min(500, $Text.Length))
    $rest = $Text.Substring($head.Length)
    $keyRe = '(\d{1,2}\s*월\s*\d{1,2}\s*일|\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[/.]\d{1,2}|\d{1,2}\s*:\s*\d{2}|까지|기한|마감|기간|일정|회신|답변|회답|제출|등록|신청|참석|확인\s*(바랍|부탁|요청)|요청|부탁|필요합니다|해야|하시기 바랍|바랍니다|주시기|주세요|안내드립|공지|변경|만료|유효|삭제|비밀번호|승인|결재|납부|결제|deadline|due|by\s+\d|please|required|must|action|reply|submit|confirm|expire|urgent|ASAP)'
    $lines = $rest -split "`n"
    $picked = New-Object System.Collections.Generic.List[string]
    $used = $head.Length
    foreach ($ln in $lines) {
        $l = $ln.Trim()
        if (-not $l) { continue }
        if ($l -match $keyRe) {
            if ($l.Length -gt 300) { $l = $l.Substring(0, 300) }
            if ($used + $l.Length + 1 -gt $Budget) { break }
            $picked.Add($l); $used += $l.Length + 1
        }
    }
    $out = $head.TrimEnd() + "`n…(중략)`n" + ($picked -join "`n")
    if ($picked.Count -eq 0) { $out = $Text.Substring(0, $Budget) + "`n…(이하 생략)" }
    return $out
}

# Outlook 에서 지금 선택한 메일 1통 (패널의 "이 메일 요약" 연동용). 없으면 $null
function Get-SelectedMail {
    try {
        $ol = New-Object -ComObject Outlook.Application
        $exp = $ol.ActiveExplorer(); if (-not $exp) { return $null }
        $sel = $exp.Selection; if ($sel.Count -lt 1) { return $null }
        $m = $sel.Item(1); if ($m.Class -ne 43) { return $null }
        return [pscustomobject]@{ EntryID = [string]$m.EntryID; Subject = [string]$m.Subject; SenderName = [string]$m.SenderName
            SenderAddr = (Get-SmtpAddress $m); Received = $m.ReceivedTime.ToString('yyyy-MM-dd HH:mm'); Body = (Clean-Body ([string]$m.Body)) }
    } catch { return $null }
}

function Get-Mails {
    try { $ol = New-Object -ComObject Outlook.Application } catch {
        throw "Outlook COM 개체를 만들 수 없습니다. 클래식 Outlook 데스크탑이 설치·실행 중이어야 합니다. ($_)"
    }
    $ns = $ol.GetNamespace('MAPI')
    $picked = @()

    if ($Selected) {
        $exp = $ol.ActiveExplorer()
        if (-not $exp) { throw "Outlook 창이 열려 있지 않습니다." }
        $sel = $exp.Selection
        if ($sel.Count -eq 0) { throw "Outlook에서 메일을 먼저 선택해 주세요." }
        for ($i = 1; $i -le $sel.Count; $i++) { $picked += $sel.Item($i) }
    } else {
        $inbox = $ns.GetDefaultFolder(6)   # olFolderInbox
        $items = $inbox.Items
        if ($Subject) {
            $safe = $Subject.Replace("'", "''")
            try { $items = $items.Restrict("@SQL=""urn:schemas:httpmail:subject"" LIKE '%$safe%'") } catch {}
        }
        $items.Sort('[ReceivedTime]', $true)
        $count = 0
        $item = $items.GetFirst()
        while ($item -and $count -lt $Latest) {
            if ($item.Class -eq 43) {   # olMail
                if ($script:SinceTime -and $item.ReceivedTime -le $script:SinceTime) { break }
                if (-not $Subject -or $item.Subject -like "*$Subject*") { $picked += $item; $count++ }
            }
            $item = $items.GetNext()
        }
    }

    $out = @()
    foreach ($m in $picked) {
        if ($m.Class -ne 43) { continue }
        $out += [pscustomobject]@{
            EntryID    = [string]$m.EntryID
            Subject    = [string]$m.Subject
            SenderName = [string]$m.SenderName
            SenderAddr = Get-SmtpAddress $m
            Received   = $m.ReceivedTime.ToString('yyyy-MM-dd HH:mm')
            Body       = Clean-Body ([string]$m.Body)
        }
    }
    return $out
}

# ------------------------------------------------------------------ cache --

$CachePath = Join-Path $Root 'cache.json'
$script:Cache = @{}
function Load-Cache {
    if (Test-Path $CachePath) {
        try {
            $obj = Get-Content -Raw -Encoding UTF8 $CachePath | ConvertFrom-Json
            foreach ($p in $obj.PSObject.Properties) { $script:Cache[$p.Name] = $p.Value }
        } catch {}
    }
}
function Save-Cache {
    $tmp = "$CachePath.tmp"
    ($script:Cache | ConvertTo-Json -Depth 8) | Set-Content -Path $tmp -Encoding UTF8
    Move-Item -Force $tmp $CachePath
}
function Cache-Key { param($Mail, [string]$ModelName) return "$ModelName|$PromptVersion|$($Mail.EntryID)" }

# ---------------------------------------------------------------- extract --

function Get-Slots {
    param($Mail)
    $body = Select-Relevant -Text $Mail.Body -Budget $MaxBodyChars
    $user = @"
[메일]
발신자: $($Mail.SenderName) <$($Mail.SenderAddr)>
수신일시: $($Mail.Received)
제목: $($Mail.Subject)

본문:
$body
"@
    if ($ShowInput) {
        Write-Host ""
        Write-Host ("──── 모델 입력 (본문 {0}자 → 필터 후 {1}자) ────" -f $Mail.Body.Length, $body.Length) -ForegroundColor Yellow
        Write-Host $user
        Write-Host "────────────────────────────────────────" -ForegroundColor Yellow
    }
    $r = Invoke-Chat -User $user
    try { $d = $r.content | ConvertFrom-Json } catch {
        $d = [pscustomobject]@{ summary = $r.content; action_items = @(); deadline = $null; priority = 'low'; category = 'other' }
    }
    # 후처리: 중복/필드명 누출 제거, 날짜 형식 검증
    $items = @(); $seen = @{}
    foreach ($it in @($d.action_items)) {
        $s = ([string]$it).Trim()
        if (-not $s) { continue }
        if ($s -match '^(deadline|priority|category|summary|other)\s*:') { continue }
        if (-not $seen.ContainsKey($s)) { $seen[$s] = 1; $items += $s }
    }
    $dl = $d.deadline
    if ($dl -and ($dl -notmatch '^\d{4}-\d{2}-\d{2}$')) {
        if ($dl -match '(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일') { $dl = '{0}-{1:d2}-{2:d2}' -f $Matches[1], [int]$Matches[2], [int]$Matches[3] }
        else { $dl = $null }
    }
    if ($dl) {
        try {
            $recv = [datetime]::ParseExact($Mail.Received.Substring(0, 10), 'yyyy-MM-dd', $null)
            $dd = [datetime]::ParseExact($dl, 'yyyy-MM-dd', $null)
            # 수신일보다 앞선 기한은 인용된 옛 메일에서 끌려온 것 → 버림
            if ($dd -lt $recv.AddDays(-1)) { $dl = $null }
            # 본문에 근거가 없는 기한(수신일시 헤더를 베낀 경우)은 버림: 해당 월/일 표기나 상대 기한 표현이 있어야 인정
            elseif ($dl) {
                $mo = $dd.Month; $da = $dd.Day
                $ground = ('({0}\s*월\s*{1}\s*일|{0}[.\-/]{1}(?!\d)|{2:d2}[.\-/]{3:d2}|{1}\s*일\s*(까지|이내|오후|오전|\()|오늘|금일|내일|명일|모레|이번\s*주|금주|다음\s*주|차주|주말|월요일|화요일|수요일|목요일|금요일|토요일|일요일|까지|이내|유효|만료|마감|기한|within|by |due|deadline|expire|EOD|ASAP)' -f $mo, $da, $mo, $da)
                if ($body -notmatch $ground) { $dl = $null }
            }
        } catch {}
    }
    return [pscustomobject]@{
        summary = [string]$d.summary; action_items = @($items | Select-Object -First 5)
        deadline = $dl; priority = [string]$d.priority; category = [string]$d.category
        tokens = $r.tokens; ms = $r.ms; ptokens = $r.ptokens; pms = $r.pms; gms = $r.gms
    }
}

# ----------------------------------------------------------------- render --

$CatKo = @{ action_required = '할일'; notice = '공지'; verification = '인증'; personal = '개인'; newsletter = '소식'; other = '기타' }
$PrioColor = @{ high = 'Red'; medium = 'Yellow'; low = 'DarkGray' }

function Wrap-Text {
    param([string]$Text, [int]$Width)
    $lines = @(); $cur = ''
    foreach ($w in ($Text -split '\s+')) {
        if (($cur.Length + $w.Length + 1) -gt $Width -and $cur) { $lines += $cur; $cur = $w }
        elseif ($cur) { $cur = "$cur $w" } else { $cur = $w }
    }
    if ($cur) { $lines += $cur }
    if (-not $lines) { $lines = @('-') }
    return $lines
}

function Show-Table {
    param($Rows, [string]$ModelName)
    $width = 100
    try { $width = [Math]::Min($Host.UI.RawUI.WindowSize.Width - 1, 120) } catch {}
    $inner = $width - 4
    Write-Host ""
    Write-Host "[메일 브리핑]  ($($Rows.Count)통 · 모델 $ModelName · 기준일 $Today)" -ForegroundColor White
    Write-Host ('═' * $width)
    $i = 0
    foreach ($row in $Rows) {
        $i++; $m = $row.Mail; $r = $row.Slots
        Write-Host ("{0,2}. {1}" -f $i, $m.Subject) -ForegroundColor White
        Write-Host "    보낸이  " -NoNewline -ForegroundColor Cyan
        Write-Host "$($m.SenderName) <$($m.SenderAddr)>  " -NoNewline
        Write-Host $m.Received -ForegroundColor DarkGray
        Write-Host "    분류    " -NoNewline -ForegroundColor Cyan
        $pc = $PrioColor[$r.priority]; if (-not $pc) { $pc = 'Gray' }
        Write-Host ("{0,-6} " -f $r.priority.ToUpper()) -NoNewline -ForegroundColor $pc
        $ck = $CatKo[$r.category]; if (-not $ck) { $ck = $r.category }
        Write-Host $ck
        $first = $true
        foreach ($line in (Wrap-Text $r.summary ($inner - 8))) {
            $label = if ($first) { '요약    ' } else { '        ' }
            Write-Host "    $label" -NoNewline -ForegroundColor Cyan; Write-Host $line; $first = $false
        }
        if ($r.action_items -and $r.action_items.Count -gt 0) {
            $first = $true
            foreach ($it in $r.action_items) {
                $label = if ($first) { '할 일   ' } else { '        ' }
                Write-Host "    $label" -NoNewline -ForegroundColor Cyan
                Write-Host "[ ] " -NoNewline -ForegroundColor Green
                Write-Host $it
                $first = $false
            }
        } else {
            Write-Host "    할 일   " -NoNewline -ForegroundColor Cyan; Write-Host "없음" -ForegroundColor DarkGray
        }
        if ($r.deadline) {
            $tag = ''
            try {
                $days = ([datetime]::ParseExact($r.deadline, 'yyyy-MM-dd', $null) - [datetime]::ParseExact($Today, 'yyyy-MM-dd', $null)).Days
                if ($days -lt 0) { $tag = "D+$(-$days) 지남" } else { $tag = "D-$days" }
            } catch {}
            Write-Host "    기한    " -NoNewline -ForegroundColor Cyan
            Write-Host "$($r.deadline) " -NoNewline -ForegroundColor Magenta
            Write-Host $tag -ForegroundColor $(if ($tag -like 'D-*' -and $days -le 3) { 'Red' } elseif ($tag -like 'D-*') { 'Yellow' } else { 'DarkGray' })
        }
        if ($r.cached) { Write-Host "    cached" -ForegroundColor DarkGray }
        else { Write-Host ("    {0:N1}s = 입력 {1}tok {2:N1}s + 출력 {3}tok {4:N1}s" -f ($r.ms / 1000), $r.ptokens, ($r.pms / 1000), $r.tokens, ($r.gms / 1000)) -ForegroundColor DarkGray }
        Write-Host ('─' * $width)
    }
}

# ------------------------------------------------------------------- main --

function Summarize-Batch {
    param($Mails, [string]$ModelPath)
    $modelName = Split-Path -Leaf $ModelPath
    $rows = @()
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $n = 0; $miss = 0
    foreach ($m in $Mails) {
        $n++
        $key = Cache-Key $m $modelName
        $slots = $null
        if (-not $NoCache -and $m.EntryID -and $script:Cache.ContainsKey($key)) {
            $slots = $script:Cache[$key]
            $slots | Add-Member -NotePropertyName cached -NotePropertyValue $true -Force
        } else {
            if ($miss -eq 0) { Start-Server -ModelPath $ModelPath }
            $miss++
            $short = $m.Subject; if ($short.Length -gt 40) { $short = $short.Substring(0, 40) }
            Write-Host ("`r· 추출 중 {0}/{1}  {2,-40}" -f $n, $Mails.Count, $short) -NoNewline -ForegroundColor DarkGray
            $slots = Get-Slots $m
            if ($m.EntryID) { $script:Cache[$key] = $slots; Save-Cache }
        }
        $rows += [pscustomobject]@{ Mail = $m; Slots = $slots }
    }
    Write-Host ("`r· 완료 ({0:N1}s, 새로 추출 {1}통 / 캐시 {2}통)" -f $sw.Elapsed.TotalSeconds, $miss, ($n - $miss)).PadRight(70) -ForegroundColor DarkGray
    if ($miss -gt 0 -and $script:ServerProc) { Show-CpuInfo }

    $rows = @($rows | Sort-Object `
        @{ Expression = { if ($_.Slots.action_items.Count -gt 0) { 0 } else { 1 } } },
        @{ Expression = { if ($_.Slots.deadline) { $_.Slots.deadline } else { '9999-99-99' } } },
        @{ Expression = { @{ high = 0; medium = 1; low = 2 }[$_.Slots.priority] } })
    return $rows
}

try {
    $modelPath = Resolve-Model
    Load-Cache

    if ($Watch -and -not $Panel) {
        # 콘솔 감시 모드(-Watch 단독): 서버를 띄워 두고 새 메일이 오면 즉시 요약해 캐시. Ctrl+C 로 종료.
        # (-Panel -Watch 는 아래 패널 분기에서 처리 — 5분 내보내기 + 선택 메일)
        Start-Server -ModelPath $modelPath
        $script:SinceTime = (Get-Date).AddMinutes(-1)
        Write-Host "· 감시 시작 (주기 $WatchInterval 초, 모델 $(Split-Path -Leaf $modelPath)). 새 메일이 오면 요약해 둡니다. Ctrl+C 로 종료." -ForegroundColor Green
        while ($true) {
            $Latest = 50
            $newMails = @(Get-Mails)
            if ($newMails.Count -gt 0) {
                $script:SinceTime = Get-Date
                Write-Host ("`n[{0}] 새 메일 {1}통" -f (Get-Date -Format 'HH:mm:ss'), $newMails.Count) -ForegroundColor Green
                $rows = @(Summarize-Batch -Mails $newMails -ModelPath $modelPath)
                Show-Table -Rows $rows -ModelName (Split-Path -Leaf $modelPath)
            }
            Start-Sleep -Seconds $WatchInterval
        }
    }

    if (($Export -or $Panel) -and -not $PSBoundParameters.ContainsKey('Latest') -and -not $Selected -and -not $Subject) { $Latest = 20 }
    Write-Host "· Outlook에서 메일 읽는 중 ..." -ForegroundColor DarkGray
    $mails = @(Get-Mails)
    if ($mails.Count -eq 0) { throw "조건에 맞는 메일이 없습니다." }
    Write-Host "· $($mails.Count)통 읽음" -ForegroundColor DarkGray

    if ($Export -or $Panel) {
        # 브리핑 패널(web\)이 읽는 형식. 요약은 브라우저 안의 pipeline.js 가 같은 llama-server 로 수행한다.
        $out = if ($ExportPath) { $ExportPath } else { Join-Path $Root 'web\data\inbox.json' }
        $dir = Split-Path -Parent $out
        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $arr = $mails | ForEach-Object { [ordered]@{ id = $_.EntryID; subject = $_.Subject; sender_name = $_.SenderName; sender_addr = $_.SenderAddr; received = $_.Received; body = $_.Body } }
        [System.IO.File]::WriteAllText($out, (ConvertTo-Json -InputObject @($arr) -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "· 내보냄 → $out" -ForegroundColor DarkGray
        if ($Panel) {
            Start-Server -ModelPath $modelPath -Router
            $url = "http://127.0.0.1:$Port/"
            Write-Host "· 브리핑 패널: $url  (서버는 계속 떠 있습니다. 내리려면 Stop-Process -Name llama-server)" -ForegroundColor Green
            Start-Process $url
            $KeepServer = $true
            if ($Watch) {
                # 패널 감시: 주기적으로 받은 편지함을 다시 내보낸다. 패널이 새 메일만 골라 요약하고 오브·말풍선으로 알린다. Ctrl+C 로 종료(서버 유지).
                Write-Host "· 감시 시작 (주기 $WatchInterval 초, 최근 $Latest 통 · 선택 메일 5초). 새 메일이 오면 패널이 요약합니다. Ctrl+C 로 종료." -ForegroundColor Green
                $selOut = Join-Path (Split-Path -Parent $out) 'selected.json'; $lastSel = ''
                while ($true) {
                    # 선택 메일: 5초마다 확인, 바뀌었을 때만 selected.json 갱신 (패널 팔레트의 "이 메일 요약")
                    $ticks = [Math]::Max(1, [int]($WatchInterval / 5))
                    for ($k = 0; $k -lt $ticks; $k++) {
                        Start-Sleep -Seconds 5
                        try {
                            $sm = Get-SelectedMail
                            $sid = if ($sm) { $sm.EntryID } else { '' }
                            if ($sid -ne $lastSel) {
                                $lastSel = $sid
                                $json2 = if ($sm) { ConvertTo-Json -InputObject ([ordered]@{ id = $sm.EntryID; subject = $sm.Subject; sender_name = $sm.SenderName; sender_addr = $sm.SenderAddr; received = $sm.Received; body = $sm.Body }) -Depth 4 } else { 'null' }
                                $tmp2 = "$selOut.tmp"
                                [System.IO.File]::WriteAllText($tmp2, $json2, (New-Object System.Text.UTF8Encoding($false)))
                                Move-Item -Force $tmp2 $selOut
                            }
                        } catch {}
                    }
                    try {
                        $mails = @(Get-Mails)
                        $arr = $mails | ForEach-Object { [ordered]@{ id = $_.EntryID; subject = $_.Subject; sender_name = $_.SenderName; sender_addr = $_.SenderAddr; received = $_.Received; body = $_.Body } }
                        $tmp = "$out.tmp"
                        [System.IO.File]::WriteAllText($tmp, (ConvertTo-Json -InputObject @($arr) -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
                        Move-Item -Force $tmp $out
                        Write-Host ("`r· {0} 내보냄 {1}통" -f (Get-Date -Format 'HH:mm:ss'), $mails.Count) -NoNewline -ForegroundColor DarkGray
                    } catch { Write-Host "`n· 내보내기 실패: $($_.Exception.Message)" -ForegroundColor Yellow }
                }
            }
        }
        return
    }

    $rows = @(Summarize-Batch -Mails $mails -ModelPath $modelPath)

    if ($Json) {
        $rows | ForEach-Object { [pscustomobject]@{ subject = $_.Mail.Subject; sender = "$($_.Mail.SenderName) <$($_.Mail.SenderAddr)>"; received = $_.Mail.Received; result = $_.Slots } } |
            ConvertTo-Json -Depth 6
    } else {
        Show-Table -Rows $rows -ModelName (Split-Path -Leaf $modelPath)
    }
} finally {
    if ($Panel) { }                                   # 패널 서버는 유지 (Stop-Process -Name llama-server 로 내림)
    elseif (-not $KeepServer -and -not $Watch) { Stop-Server }
    elseif ($Watch) { Stop-Server }
}
