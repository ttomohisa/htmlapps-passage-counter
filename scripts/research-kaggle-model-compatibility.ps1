# Experimental test ONLY. This script temporarily substitutes a different
# Google/TensorFlow-Kaggle model on the ephemeral CI runner, then restores the
# original repository source. It does NOT change the actual PR's bundled model.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$originalConfig = Get-Content -Raw -Encoding UTF8 "./model.config.json"
$originalBuilder = Get-Content -Raw -Encoding UTF8 "./build-standalone.ps1"
$expected = "2e04c53bfeac0ac2a30c057c7e2a777594ce39baaac35a92f74fb1e8c4fc4e0b"
$url = "https://www.kaggle.com/api/v1/models/tensorflow/efficientdet/tfLite/lite0-detection-metadata/1/download"
$temp = Join-Path $env:RUNNER_TEMP "kaggle-alternative-model"
$archive = Join-Path $temp "licensed-model.tar.gz"
$modelFile = Join-Path $temp "1.tflite"
New-Item -ItemType Directory -Force -Path $temp, "./dist", "./.cache" | Out-Null
$status = "NOT_CHECKED"
$issue = $null
$modelBytes = $null
$smokeBrowser = "NOT_RUN"
$smokeIntegration = "NOT_RUN"
try {
  Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing -TimeoutSec 60
  & tar.exe -xf $archive -C $temp
  if ($LASTEXITCODE -ne 0) { throw "Could not extract Kaggle tarball." }
  if (-not (Test-Path -LiteralPath $modelFile)) { throw "Expected Kaggle 1.tflite absent." }
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $modelFile).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Official Kaggle model hash did not match pinned candidate." }
  $modelBytes = (Get-Item -LiteralPath $modelFile).Length
  Copy-Item -LiteralPath $modelFile -Destination (Join-Path $Root ".cache/person-model-$expected.tflite")

  $model = $originalConfig | ConvertFrom-Json
  $model.url = $url
  $model.sha256 = $expected
  $model.license = "Apache-2.0" # Only the official Kaggle variation: NOT MediaPipe GCS model.
  $model.name = "TensorFlow/Kaggle EfficientDet-Lite0 with metadata (temporary test)"
  $model.version = "1"
  [System.IO.File]::WriteAllText((Join-Path $Root "model.config.json"),
    ($model | ConvertTo-Json -Depth 15),[System.Text.Encoding]::UTF8)

  # Keep an exact single-download-origin guard for this temporary substitute.
  $guard = "if ([string]" + '$modelConfig' + ".url -notmatch '^https://storage\.googleapis\.com/mediapipe-models/') {"
  $guardReplacement = "if ([string]" + '$modelConfig' + ".url -ne '$url') {"
  if (-not $originalBuilder.Contains($guard)) { throw "Model source guard changed unexpectedly" }
  [System.IO.File]::WriteAllText((Join-Path $Root "build-standalone.ps1"),
    $originalBuilder.Replace($guard,$guardReplacement),[System.Text.Encoding]::UTF8)

  & (Join-Path $Root "build-standalone.ps1")
  if ($LASTEXITCODE -ne 0) { throw "Standalone build with Kaggle model failed." }
  $status = "BUILT"
  & node scripts/smoke-browser.mjs
  if ($LASTEXITCODE -ne 0) { throw "Chrome browser smoke with Kaggle model failed." }
  $smokeBrowser = "PASS"
  & node scripts/smoke-v07-integration.mjs
  if ($LASTEXITCODE -ne 0) { throw "Chrome/Edge integration smoke with Kaggle model failed." }
  $smokeIntegration = "PASS"
  $status = "BROWSER_COMPATIBLE"
} catch {
  $issue = $_.Exception.Message
  if ($status -eq "NOT_CHECKED") { $status = "FAILED_BEFORE_BROWSER_TEST" }
  elseif ($status -eq "BUILT") { $status = "BROWSER_INCOMPATIBLE_OR_TEST_FAILED" }
  Write-Host "[kaggle-experiment] $status -- $issue"
} finally {
  [System.IO.File]::WriteAllText((Join-Path $Root "model.config.json"),$originalConfig,[System.Text.Encoding]::UTF8)
  [System.IO.File]::WriteAllText((Join-Path $Root "build-standalone.ps1"),$originalBuilder,[System.Text.Encoding]::UTF8)
  $report = [ordered]@{
    auditedAt = [DateTimeOffset]::UtcNow.ToString("o")
    scope = "Ephemeral Kaggle alternative runtime compatibility test; no source changes committed."
    sourceUrl = $url
    sourceLicenseClaim = "Apache-2.0 displayed for TensorFlow/Kaggle family; exact variant license metadata review remains necessary"
    kaggleModelHash = $expected
    kaggleModelBytes = $modelBytes
    originalMediaPipeModelHash = "0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb"
    version = "v1.0.0"
    status = $status
    smokeBrowser = $smokeBrowser
    smokeIntegration = $smokeIntegration
    error = $issue
    affectsPublishedModel = $false
    licenseConclusion = "Passing compatibility would support a future deliberately licensed model switch; it would not license the current distinct MediaPipe binary."
  }
  $json = $report | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText((Join-Path $Root "dist/kaggle-compatibility-audit.json"),$json,[System.Text.Encoding]::UTF8)
  Write-Host "[kaggle-experiment] RESULT=$status Chrome=$smokeBrowser Integration=$smokeIntegration"
  Write-Host "[kaggle-experiment] Actual repository config and builder restored; model unchanged in PR."
}
