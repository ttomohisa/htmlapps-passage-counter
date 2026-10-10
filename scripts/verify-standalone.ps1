param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [bool]$RequireNetworkBlock = $true,
  [bool]$RequireCanonicalIcon = $true,
  [string[]]$ForbiddenPlaceholders = @(
    "__APP_CONFIG_JSON__",
    "__BUILD_MANIFEST_JSON__",
    "__EMBEDDED_ASSET_BUNDLE_JSON__",
    "__APP_ICON_DATA_URI__"
  )
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path $Path)) { throw "HTML file not found: $Path" }
$html = Get-Content -Raw -Encoding UTF8 $Path

$checks = @(
  @{ Message = "HTML document marker is missing"; Failed = -not $html.TrimStart().StartsWith("<!doctype html>", [StringComparison]::OrdinalIgnoreCase) },
  @{ Message = "Viewport metadata is missing"; Failed = $html -notmatch '<meta\s+name=["'']viewport["'']' },
  @{ Message = "An external script URL remains"; Failed = $html -match '<script[^>]+src\s*=\s*["'']https?://' },
  @{ Message = "An external stylesheet URL remains"; Failed = $html -match '<link[^>]+href\s*=\s*["'']https?://' },
  @{ Message = "An external frame URL remains"; Failed = $html -match '<(?:iframe|frame)[^>]+src\s*=\s*["'']https?://' },
  @{ Message = "An external CSS url() remains"; Failed = $html -match 'url\(\s*["'']?https?://' },
  @{ Message = "An external module import remains"; Failed = $html -match '(?:import\s+.+?from\s*|import\s*\()\s*["'']https?://' }
)

foreach ($placeholder in @($ForbiddenPlaceholders)) {
  if ([string]::IsNullOrWhiteSpace([string]$placeholder)) { continue }
  if ($html.Contains([string]$placeholder)) {
    throw "Build placeholder remains: $placeholder"
  }
}

# Native WASM bundles may use fetch(blob:) for embedded module bytes. A
# blob-only connect-src allows that internal read but never an HTTP origin.
if ($RequireNetworkBlock) {
  $csp = [regex]::Match($html, '<meta[^>]+http-equiv=["'']Content-Security-Policy["''][^>]+content=["''](?<value>[^"'']+)')
  if (-not $csp.Success) { throw "CSP meta tag is missing." }
  $directive = [regex]::Match($csp.Groups["value"].Value, '(?:^|;)\s*connect-src\s+(?<sources>[^;]+)', 'IgnoreCase')
  if (-not $directive.Success) { throw "CSP connect-src directive is missing." }
  $sources = $directive.Groups["sources"].Value.Trim()
  if ($sources -ne "'none'" -and $sources -ne "blob:") {
    throw "Only connect-src 'none' or connect-src blob: is allowed; got: $sources"
  }
}

if ($RequireCanonicalIcon) {
  $faviconMatch = [regex]::Match($html, '<link[^>]+rel=["'']icon["''][^>]+href=["''](?<uri>data:image/svg\+xml;base64,[A-Za-z0-9+/=]+)["'']')
  $brandIconMatch = [regex]::Match($html, '<img[^>]+id=["'']appBrandIcon["''][^>]+src=["''](?<uri>data:image/svg\+xml;base64,[A-Za-z0-9+/=]+)["'']')
  if (-not $faviconMatch.Success) {
    throw "Embedded SVG favicon is missing from standalone HTML"
  }
  if (-not $brandIconMatch.Success) {
    throw "Header brand icon is missing from standalone HTML"
  }
  if ($faviconMatch.Groups["uri"].Value -ne $brandIconMatch.Groups["uri"].Value) {
    throw "Header brand icon must use the exact same embedded SVG asset as the favicon"
  }
}

foreach ($check in $checks) {
  if ($check.Failed) { throw $check.Message }
}

Write-Host "[OK] Standalone verification passed: $Path" -ForegroundColor Green
