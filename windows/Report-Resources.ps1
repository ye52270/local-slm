<#
  리소스 로그 분석 — Monitor-Resources.ps1 이 남긴 CSV 를 요약한다 (숫자만, 공유 가능).
    powershell -ExecutionPolicy Bypass -File Report-Resources.ps1 resource-log.csv
  출력: 기간, 시스템 CPU/메모리(평균·최대), llama-server 메모리(평균·최대), 모델이 메모리에 올라가 있던 시간 비율,
        요약 작업 중(llama CPU>15%) 시간 비율과 그때의 CPU, 시간대별 표.
#>
param([Parameter(Mandatory = $true, Position = 0)][string]$Csv, [int]$BusyCpu = 15, [int]$LoadedMb = 800)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$rows = @(Import-Csv -Path $Csv -Encoding UTF8)
if (-not $rows.Count) { throw "기록이 없습니다: $Csv" }
function N($v) { $d = 0.0; if ([double]::TryParse([string]$v, [ref]$d)) { $d } else { $null } }
function Stat($arr, $name) {
    $a = @($arr | Where-Object { $null -ne $_ })
    if (-not $a.Count) { return "{0,-26} -" -f $name }
    $m = $a | Measure-Object -Average -Maximum -Minimum
    "{0,-26} 평균 {1,7:N1}   최대 {2,7:N1}   최소 {3,7:N1}" -f $name, $m.Average, $m.Maximum, $m.Minimum
}
$t0 = [datetime]$rows[0].time; $t1 = [datetime]$rows[-1].time
$span = $t1 - $t0
Write-Host ("기간  {0:MM-dd HH:mm} → {1:MM-dd HH:mm}  ({2:N1} 시간, 표본 {3}개)" -f $t0, $t1, $span.TotalHours, $rows.Count)
Write-Host ""
Write-Host (Stat ($rows | ForEach-Object { N $_.sys_cpu_pct }) "시스템 CPU %")
Write-Host (Stat ($rows | ForEach-Object { N $_.sys_mem_pct }) "시스템 메모리 사용 %")
Write-Host (Stat ($rows | ForEach-Object { N $_.sys_mem_used_mb }) "시스템 메모리 사용 MB")
Write-Host (Stat ($rows | ForEach-Object { N $_.llama_ws_mb }) "llama-server 메모리 MB")
Write-Host (Stat ($rows | ForEach-Object { N $_.llama_cpu_pct }) "llama-server CPU %")
Write-Host (Stat ($rows | ForEach-Object { N $_.edge_ws_mb }) "브라우저(Edge) 메모리 MB")
Write-Host (Stat ($rows | ForEach-Object { N $_.outlook_ws_mb }) "Outlook 메모리 MB")
Write-Host ""
$loaded = @($rows | Where-Object { (N $_.llama_ws_mb) -ge $LoadedMb })
$busy = @($rows | Where-Object { (N $_.llama_cpu_pct) -ge $BusyCpu })
$idle = @($rows | Where-Object { (N $_.llama_cpu_pct) -lt $BusyCpu })
Write-Host ("모델이 메모리에 올라가 있던 시간   {0,5:N1}%  ({1}/{2} 표본, 기준 ≥{3}MB)" -f (100.0 * $loaded.Count / $rows.Count), $loaded.Count, $rows.Count, $LoadedMb)
Write-Host ("요약 작업 중이던 시간             {0,5:N1}%  ({1} 표본, 기준 llama CPU ≥{2}%)" -f (100.0 * $busy.Count / $rows.Count), $busy.Count, $BusyCpu)
if ($busy.Count) { Write-Host ("  작업 중 시스템 CPU 평균 {0:N0}%  · llama CPU 평균 {1:N0}%  · 시스템 메모리 평균 {2:N0}%" -f (($busy | ForEach-Object { N $_.sys_cpu_pct }) | Measure-Object -Average).Average, (($busy | ForEach-Object { N $_.llama_cpu_pct }) | Measure-Object -Average).Average, (($busy | ForEach-Object { N $_.sys_mem_pct }) | Measure-Object -Average).Average) }
if ($idle.Count) { Write-Host ("  유휴 시 시스템 CPU 평균 {0:N0}%  · 시스템 메모리 평균 {1:N0}%  · llama 메모리 평균 {2:N0} MB" -f (($idle | ForEach-Object { N $_.sys_cpu_pct }) | Measure-Object -Average).Average, (($idle | ForEach-Object { N $_.sys_mem_pct }) | Measure-Object -Average).Average, (($idle | ForEach-Object { N $_.llama_ws_mb }) | Measure-Object -Average).Average) }
Write-Host ""
Write-Host "시간대별 (평균)"
Write-Host ("{0,-6}{1,8}{2,9}{3,10}{4,10}{5,8}" -f '시각', 'sysCPU%', 'sysMem%', 'llamaMB', 'llamaCPU%', '표본')
$rows | Group-Object { ([datetime]$_.time).ToString('MM-dd HH') } | Sort-Object Name | ForEach-Object {
    $g = $_.Group
    "{0,-6}{1,8:N0}{2,9:N0}{3,10:N0}{4,10:N1}{5,8}" -f $_.Name.Substring(6), (($g | ForEach-Object { N $_.sys_cpu_pct }) | Measure-Object -Average).Average, (($g | ForEach-Object { N $_.sys_mem_pct }) | Measure-Object -Average).Average, (($g | ForEach-Object { N $_.llama_ws_mb }) | Measure-Object -Average).Average, (($g | ForEach-Object { N $_.llama_cpu_pct }) | Measure-Object -Average).Average, $g.Count
}
