[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$HtmlPath = Join-Path $Root 'index.html'
$Html = Get-Content -LiteralPath $HtmlPath -Raw
$PanoramaJs = Get-Content -LiteralPath (Join-Path $Root 'panorama.js') -Raw
$Full = Get-ChildItem -LiteralPath (Join-Path $Root 'assets\panoramas') -Filter '*.webp' | Where-Object { $_.Name -notlike '*-thumb.webp' }
$Thumbs = Get-ChildItem -LiteralPath (Join-Path $Root 'assets\panoramas') -Filter '*-thumb.webp'

$Checks = [ordered]@{
  'screens-9' = ([regex]::Matches($Html, 'id="s-[a-z]+"').Count -eq 9)
  'embedded-images-14' = ([regex]::Matches($Html, 'data:image/').Count -eq 14)
  'panorama-runtime-once' = ([regex]::Matches($Html, 'panorama\.js').Count -eq 1)
  'legacy-manor-disabled' = (-not $Html.Contains("tryLoad(0);`n})();"))
  'full-panoramas-7' = ($Full.Count -eq 7)
  'thumbs-7' = ($Thumbs.Count -eq 7)
  'panorama-assets-under-6mb' = (($Full | Measure-Object Length -Sum).Sum -lt 6MB)
  'overlook-hero' = (Test-Path -LiteralPath (Join-Path $Root 'assets\hero\courtyard-overlook.png'))
  'three-local' = (Test-Path -LiteralPath (Join-Path $Root 'vendor\three.min.js'))
  'service-worker' = (Test-Path -LiteralPath (Join-Path $Root 'sw.js'))
  'favicon' = (Test-Path -LiteralPath (Join-Path $Root 'favicon.svg'))
  'dual-sphere-cinema' = $PanoramaJs.Contains('const materials = [0, 1]')
  'full-sphere-pitch' = $PanoramaJs.Contains('degToRad(85)')
  'panorama-overview' = $PanoramaJs.Contains('pano-overview-trigger')
  'opening-intro' = $PanoramaJs.Contains('duration: 2200')
  'six-coordinate-network' = $PanoramaJs.Contains("id: 'gate-entry'") -and $PanoramaJs.Contains("id: 'hall-threshold'")
}

$Failed = @($Checks.GetEnumerator() | Where-Object { -not $_.Value })
[pscustomobject]@{
  Path = $HtmlPath
  SHA256 = (Get-FileHash -LiteralPath $HtmlPath -Algorithm SHA256).Hash
  Passed = $Checks.Count - $Failed.Count
  Total = $Checks.Count
  PanoramaBytes = ($Full | Measure-Object Length -Sum).Sum
  Failed = ($Failed.Name -join ', ')
} | Format-List

if ($Failed.Count) { throw "Verification failed: $($Failed.Name -join ', ')" }
Write-Output 'Photoreal H5 static verification passed.'
