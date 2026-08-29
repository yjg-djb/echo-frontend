$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RequiredFiles = @(
  'index.html',
  'styles.css',
  'app.js',
  'panorama.js',
  'panorama.css',
  'vendor/three.min.js',
  'assets/story/wenrufang-1978.webp',
  'assets/memories/1978-wenrufang.wav',
  'assets/memories/1982-shipyard.webp',
  'assets/memories/2012-retirement-tea.wav',
  'assets/interview/q1.wav',
  'assets/interview/q8.wav',
  'assets/interview/a1.wav',
  'assets/interview/a8.wav',
  'assets/audio/chen-wenrufang.wav',
  'assets/panoramas/courtyard-overlook-360.webp',
  'assets/panoramas/hall-center.webp',
  'Product-Spec.md',
  'Product-Spec-CHANGELOG.md'
)

$Missing = @()
foreach ($RelativePath in $RequiredFiles) {
  $Target = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $Target)) {
    $Missing += $RelativePath
  }
}

if ($Missing.Count -gt 0) {
  throw "缺少必要文件：$($Missing -join ', ')"
}

$Index = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'index.html')
$RequiredMarkers = @(
  '时光回响',
  's-family',
  's-elder-invite',
  's-interview',
  's-confirm',
  's-home',
  's-gallery',
  's-book',
  's-book-customize',
  'chatThread',
  'interviewShareUrl',
  '鲁小豫',
  '回响',
  'confirmStateBadge',
  'privacyScopeToggle',
  'wenrufang-1978',
  '走进记忆长廊',
  '蓝印白布',
  '制作实体书',
  'chen-wenrufang.wav'
)

foreach ($Marker in $RequiredMarkers) {
  if (-not $Index.Contains($Marker)) {
    throw "index.html 缺少验收标记：$Marker"
  }
}

node --check (Join-Path $ProjectRoot 'app.js')
node --check (Join-Path $ProjectRoot 'panorama.js')

$Styles = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'styles.css')
$PanoCss = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'panorama.css')
foreach ($SoftToken in @('#eef1f4', '#ff6938', '--shadow-inset', 'control-rebound')) {
  if (-not $Styles.Contains($SoftToken)) {
    throw "styles.css 缺少 soft-UI 设计标记：$SoftToken"
  }
}
foreach ($LegacyToken in @('#c8954d', '#292017', '#9f3828', '--paper:#f4efe4')) {
  if ($Styles.Contains($LegacyToken) -or $PanoCss.Contains($LegacyToken)) {
    throw "旧暖金皮肤残留：$LegacyToken"
  }
}
if (-not $PanoCss.Contains('rgba(246,248,250')) {
  throw "panorama.css 缺少浅色玻璃 chrome 标记"
}
$PanoJs = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'panorama.js')
if (-not $PanoJs.Contains('showPanoFallback')) {
  throw "panorama.js 缺少 WebGL 静态降级"
}

$App = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'app.js')
foreach ($AppMarker in @('assets/interview/q1.wav', 'assets/memories/1960-summer-wharf.webp', '1978-wenrufang.wav', 'sourceOf', 'askState', 'pressFeedback')) {
  if (-not $App.Contains($AppMarker)) {
    throw "app.js 缺少素材引用：$AppMarker"
  }
}

$RadioAudio = Get-Item -LiteralPath (Join-Path $ProjectRoot 'assets/audio/chen-wenrufang.wav')
if ($RadioAudio.Length -lt 500000) {
  throw "收音机原声文件异常：$($RadioAudio.Length) bytes"
}

$InterviewClips = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'assets/interview') -Filter '*.wav'
if ($InterviewClips.Count -ne 16) {
  throw "采访原声不完整：仅发现 $($InterviewClips.Count) / 16 个 wav"
}

$Panoramas = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'assets/panoramas') -Filter '*.webp'
if ($Panoramas.Count -lt 12) {
  throw "360° 全景资源不完整：仅发现 $($Panoramas.Count) 个 WebP 文件"
}

Write-Host "验证通过：页面结构、脚本语法、采访原声 16 段、记忆长廊与 360° 全景资源均完整。"
