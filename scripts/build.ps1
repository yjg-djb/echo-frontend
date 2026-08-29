[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
$ReferencePath = Join-Path $Root 'src\reference.html'
$OutputPath = Join-Path $Root 'index.html'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$Reference = [IO.File]::ReadAllText($ReferencePath, $Utf8NoBom)
$HeadMarker = '</head>'
$BodyMarker = '</body>'
$LegacyLaunch = "tryLoad(0);`n})();"
$LegacyReplacement = "window.__legacyManorBoot=boot;`n})();"

if (-not $Reference.Contains($HeadMarker)) { throw 'Missing </head> marker.' }
if (-not $Reference.Contains($BodyMarker)) { throw 'Missing </body> marker.' }
if (-not $Reference.Contains($LegacyLaunch)) { throw 'Missing legacy Three.js launch marker.' }

$HeadInsert = @'
<link rel="stylesheet" href="panorama.css">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#17120e">
'@

$BodyInsert = @'
<script src="vendor/three.min.js"></script>
<script src="panorama.js"></script>
<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
</script>
'@

$Output = $Reference.Replace($LegacyLaunch, $LegacyReplacement)
$Output = $Output.Replace($HeadMarker, "$HeadInsert`n$HeadMarker")
$Output = $Output.Replace($BodyMarker, "$BodyInsert`n$BodyMarker")

if ([regex]::Matches($Output, 'id="(s-[a-z]+)"').Count -ne 9) { throw 'Screen count changed.' }
if ([regex]::Matches($Output, 'data:image/').Count -ne 14) { throw 'Embedded image count changed.' }
if ([regex]::Matches($Output, 'panorama\.js').Count -ne 1) { throw 'Panorama runtime was not injected exactly once.' }

[IO.File]::WriteAllText($OutputPath, $Output, $Utf8NoBom)
$Hash = (Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256).Hash
Write-Host "Built $OutputPath"
Write-Host "SHA256 $Hash"
Write-Host "Bytes $((Get-Item -LiteralPath $OutputPath).Length)"
