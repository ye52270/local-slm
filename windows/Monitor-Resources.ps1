<#
  VDI 리소스 기록 — llama-server(라우터+자식 전부)와 시스템 CPU/메모리를 주기적으로 CSV 로 남긴다.
    powershell -ExecutionPolicy Bypass -File Monitor-Resources.ps1            # 10초 간격, resource-log.csv
    powershell -ExecutionPolicy Bypass -File Monitor-Resources.ps1 -Interval 30 -Out logs\res.csv
  별도 창에서 켜 두고 Ctrl+C 로 끝낸다. 메일 내용은 전혀 기록하지 않는다(숫자만) → 어디에 공유해도 안전.
  분석: Report-Resources.ps1 resource-log.csv
#>
param(
    [int]$Interval = 10,
    [string]$Out = "resource-log.csv",
    [string]$ProcessName = "llama-server"
)
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$cores = [int]$env:NUMBER_OF_PROCESSORS; if ($cores -le 0) { $cores = 1 }
$dir = Split-Path -Parent $Out; if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
if (-not (Test-Path $Out)) {
    "time,sys_cpu_pct,sys_mem_used_mb,sys_mem_total_mb,sys_mem_pct,llama_procs,llama_ws_mb,llama_private_mb,llama_cpu_pct,edge_ws_mb,outlook_ws_mb" | Set-Content -Path $Out -Encoding UTF8
}
Write-Host "· 기록 시작 → $Out (간격 ${Interval}s, 코어 $cores). Ctrl+C 로 종료" -ForegroundColor Green

$prevCpu = @{}   # pid → TotalProcessorTime(ms)
$prevAt = Get-Date
while ($true) {
    $now = Get-Date
    $dt = ($now - $prevAt).TotalMilliseconds; if ($dt -le 0) { $dt = $Interval * 1000 }
    # 시스템
    $sysCpu = ''; $memUsed = ''; $memTotal = ''; $memPct = ''
    try { $sysCpu = [int](Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average } catch {}
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $memTotal = [int]($os.TotalVisibleMemorySize / 1024); $memUsed = [int](($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024)
        $memPct = [Math]::Round(100.0 * $memUsed / [Math]::Max(1, $memTotal), 1)
    } catch {}
    # llama-server (라우터 + 자식 프로세스 합계)
    $procs = @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue)
    $ws = 0; $priv = 0; $cpuMs = 0; $curCpu = @{}
    foreach ($p in $procs) {
        $ws += $p.WorkingSet64; $priv += $p.PrivateMemorySize64
        $t = 0; try { $t = $p.TotalProcessorTime.TotalMilliseconds } catch {}
        $curCpu[$p.Id] = $t
        if ($prevCpu.ContainsKey($p.Id)) { $cpuMs += [Math]::Max(0, $t - $prevCpu[$p.Id]) }
    }
    $llamaCpu = if ($procs.Count) { [Math]::Round(100.0 * $cpuMs / $dt / $cores, 1) } else { 0 }
    $prevCpu = $curCpu; $prevAt = $now
    # 참고: 브라우저(패널)·Outlook
    $edge = 0; foreach ($p in @(Get-Process -Name msedge -ErrorAction SilentlyContinue)) { $edge += $p.WorkingSet64 }
    $ol = 0; foreach ($p in @(Get-Process -Name OUTLOOK -ErrorAction SilentlyContinue)) { $ol += $p.WorkingSet64 }

    $line = "{0:yyyy-MM-dd HH:mm:ss},{1},{2},{3},{4},{5},{6},{7},{8},{9},{10}" -f $now, $sysCpu, $memUsed, $memTotal, $memPct, $procs.Count,
        [int]($ws / 1MB), [int]($priv / 1MB), $llamaCpu, [int]($edge / 1MB), [int]($ol / 1MB)
    Add-Content -Path $Out -Value $line -Encoding UTF8
    Write-Host ("`r{0:HH:mm:ss}  sysCPU {1,3}%  mem {2,4}/{3} MB ({4}%)  llama {5}p {6,5} MB {7,5}%  " -f $now, $sysCpu, $memUsed, $memTotal, $memPct, $procs.Count, [int]($ws / 1MB), $llamaCpu) -NoNewline
    Start-Sleep -Seconds $Interval
}
