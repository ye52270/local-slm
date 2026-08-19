<#
  라벨 템플릿 만들기 (PowerShell 5.1+, Python 불필요)
    powershell -ExecutionPolicy Bypass -File eval\make_labels.ps1 web\data\inbox.json eval\labels.json
  eval\make_labels.py 와 같은 결과. 기존 labels.json 이 있으면 채운 라벨은 보존하고 새 메일만 추가한다.
#>
param(
    [string]$Src = "web\data\inbox.json",
    [string]$Dst = "eval\labels.json"
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$mails = Get-Content -Raw -Encoding UTF8 $Src | ConvertFrom-Json
$existing = @{}
if (Test-Path $Dst) {
    $old = Get-Content -Raw -Encoding UTF8 $Dst | ConvertFrom-Json
    foreach ($it in @($old.items)) { $existing[[string]$it.id] = $it }
}
$items = @()
foreach ($m in @($mails)) {
    $id = [string]$m.id
    if ($existing.ContainsKey($id)) { $items += $existing[$id]; continue }
    $body = [string]$m.body; if ($body.Length -gt 300) { $body = $body.Substring(0, 300) }
    $items += [ordered]@{
        id = $id; subject = [string]$m.subject; sender = [string]$m.sender_name; received = [string]$m.received
        body_preview = $body
        action_items = @(); deadline = $null; category = ""; priority = ""; note = ""
    }
}
$dir = Split-Path -Parent $Dst; if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$json = [ordered]@{ schema = "moldubot-mail-labels-v1"; items = $items } | ConvertTo-Json -Depth 6
# ConvertTo-Json(5.1) 은 한글을 \uXXXX 로 escape 한다 → 읽기 쉽게 되돌린다
$json = [regex]::Replace($json, '\\u([0-9a-fA-F]{4})', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) })
[System.IO.File]::WriteAllText((Resolve-Path -LiteralPath (Split-Path -Parent $Dst) | Select-Object -ExpandProperty Path) + "\" + (Split-Path -Leaf $Dst), $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("{0}건 → {1}  (기존 라벨 {2}건 유지)" -f $items.Count, $Dst, $existing.Count)
