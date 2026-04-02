Set-Location $PSScriptRoot
node scripts/stage2-insert.mjs
Write-Host ""
Write-Host "완료. 아무 키나 누르면 창이 닫힙니다." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
