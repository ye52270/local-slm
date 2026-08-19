<#
  채점 (PowerShell 5.1+, Python 불필요) — eval\score.py 와 같은 지표
    powershell -ExecutionPolicy Bypass -File eval\score.ps1 eval\labels.json $env:USERPROFILE\Downloads\results-Qwen2B-2026-08-19.json $env:USERPROFILE\Downloads\results-Qwen4B-2026-08-19.json
  category 를 채운 라벨만 채점 대상. 결과 파일 옆에 *.score.json(메일별 상세)을 남긴다.
#>
param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Labels,
    [Parameter(Mandatory = $true, Position = 1, ValueFromRemainingArguments = $true)][string[]]$Results
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Bigrams([string]$s) {
    $t = [regex]::Replace(($s + ''), '[\s\W_]+', '')
    $set = New-Object 'System.Collections.Generic.HashSet[string]'
    for ($i = 0; $i -lt $t.Length - 1; $i++) { [void]$set.Add($t.Substring($i, 2)) }
    return ,$set
}
function Overlap([string]$x, [string]$y) {
    # (PowerShell 변수는 대소문자를 구분하지 않으므로 $a/$A 같은 이름을 섞어 쓰지 않는다)
    $sx = Bigrams $x; $sy = Bigrams $y
    if ($sx.Count -eq 0 -or $sy.Count -eq 0) { return 0.0 }
    $n = 0; foreach ($g in $sx) { if ($sy.Contains($g)) { $n++ } }
    return ($n / [Math]::Min($sx.Count, $sy.Count))
}

$lab = @{}
$L = Get-Content -Raw -Encoding UTF8 $Labels | ConvertFrom-Json
foreach ($it in @($L.items)) { if ([string]$it.category) { $lab[[string]$it.id] = $it } }

"{0,-28}{1,4}{2,8}{3,7}{4,7}{5,7}{6,7}{7,5}{8,6}{9,7}{10,7}" -f '모델', 'n', '할일F1', '재현', '정밀', '유무', '기한', '놓침', '지어냄', '분류', '평균s'
foreach ($f in $Results) {
    $R = Get-Content -Raw -Encoding UTF8 $f | ConvertFrom-Json
    $rows = @{}
    foreach ($row in @($R.rows)) { if ($row.result) { $rows[[string]$row.id] = $row } }   # $r 은 $R 과 같은 변수(대소문자 무시)라 쓰지 않는다
    $ids = @($lab.Keys | Where-Object { $rows.ContainsKey($_) })
    if (-not $ids.Count) { Write-Host "$f : 라벨과 겹치는 메일이 없습니다 (labels 의 category 를 채웠는지 확인)"; continue }
    $tp = 0; $fp = 0; $fn = 0; $hasOk = 0; $dlOk = 0; $dlMiss = 0; $dlInv = 0; $dlWrong = 0; $catOk = 0; $prOk = 0; $prN = 0; $ms = @(); $per = @()
    foreach ($i in $ids) {
        $g = $lab[$i]; $p = $rows[$i].result
        $gold = @($g.action_items | Where-Object { ([string]$_).Trim() })
        $pred = @($p.action_items)
        $matched = @{}
        foreach ($ga in $gold) {
            $hit = $null
            for ($k = 0; $k -lt $pred.Count; $k++) { if (-not $matched.ContainsKey($k) -and (Overlap $ga $pred[$k]) -ge 0.35) { $hit = $k; break } }
            if ($null -eq $hit) { $fn++ } else { $tp++; $matched[$hit] = 1 }
        }
        $fp += $pred.Count - $matched.Count
        if (($gold.Count -gt 0) -eq ($pred.Count -gt 0)) { $hasOk++ }
        $gd = if ($g.deadline) { [string]$g.deadline } else { $null }
        $pd = if ($p.deadline) { [string]$p.deadline } else { $null }
        if ($gd -eq $pd) { $dlOk++ } elseif ($gd -and -not $pd) { $dlMiss++ } elseif ($pd -and -not $gd) { $dlInv++ } else { $dlWrong++ }
        if ([string]$g.category -eq [string]$p.category) { $catOk++ }
        if ([string]$g.priority) { $prN++; if ([string]$g.priority -eq [string]$p.priority) { $prOk++ } }
        if ($p.timing -and $p.timing.totalMs) { $ms += [double]$p.timing.totalMs }
        $per += [ordered]@{ id = $i; subject = ([string]$g.subject); gold_actions = $gold.Count; pred_actions = $pred.Count; deadline = "$gd -> $pd"; category = "$($g.category) -> $($p.category)" }
    }
    $n = $ids.Count
    $prec = if ($tp + $fp) { $tp / ($tp + $fp) } else { 1.0 }
    $rec = if ($tp + $fn) { $tp / ($tp + $fn) } else { 1.0 }
    $f1 = if ($prec + $rec) { 2 * $prec * $rec / ($prec + $rec) } else { 0.0 }
    $avg = if ($ms.Count) { [Math]::Round((($ms | Measure-Object -Sum).Sum / $ms.Count) / 1000, 1) } else { $null }
    $s = [ordered]@{
        n = $n; model = $R.model; prompt_version = $R.prompt_version
        action_precision = [Math]::Round($prec, 3); action_recall = [Math]::Round($rec, 3); action_f1 = [Math]::Round($f1, 3)
        has_action_acc = [Math]::Round($hasOk / $n, 3)
        deadline_acc = [Math]::Round($dlOk / $n, 3); deadline_missed = $dlMiss; deadline_invented = $dlInv; deadline_wrong = $dlWrong
        category_acc = [Math]::Round($catOk / $n, 3)
        priority_acc = if ($prN) { [Math]::Round($prOk / $prN, 3) } else { $null }
        avg_sec = $avg; per_mail = $per
    }
    $mname = [string]$R.model; if ($mname.Length -gt 27) { $mname = $mname.Substring(0, 27) }
    "{0,-28}{1,4}{2,8}{3,7}{4,7}{5,7}{6,7}{7,5}{8,6}{9,7}{10,7}" -f $mname, $n, $s.action_f1, $s.action_recall, $s.action_precision, $s.has_action_acc, $s.deadline_acc, $dlMiss, $dlInv, $s.category_acc, $avg
    $out = [System.IO.Path]::ChangeExtension($f, '.score.json')
    $json = $s | ConvertTo-Json -Depth 5
    $json = [regex]::Replace($json, '\\u([0-9a-fA-F]{4})', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) })
    [System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "   → 메일별 상세: $out"
}
