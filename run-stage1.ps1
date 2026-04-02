Set-Location $PSScriptRoot
$env:INPUT = "restaurants-jeonju.json"
$env:OUTPUT = "restaurants-verified.json"
node scripts/stage1-verify.mjs
Write-Host ""
Write-Host "완료. 아무 키나 누르면 창이 닫힙니다." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
