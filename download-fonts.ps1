$fontsDir = "C:\Users\gsaba\OneDrive\Desktop\Registration_System\public\fonts"
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

$fonts = @{
    "Inter-Regular.woff2"  = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2"
    "Inter-Medium.woff2"   = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2"
    "Inter-SemiBold.woff2" = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2"
    "Inter-Bold.woff2"     = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2"
}

foreach ($name in $fonts.Keys) {
    $url = $fonts[$name]
    $out = Join-Path $fontsDir $name
    Write-Host "Downloading $name..."
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
}
Write-Host "All fonts downloaded!"
