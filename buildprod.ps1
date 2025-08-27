# PowerShell Build Script for ALTER EGO PWA
Write-Host "Building ALTER EGO PWA for production..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Gray
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "Node modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Running full CI pipeline..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1/3: Cleaning previous builds..." -ForegroundColor Yellow
npm run clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to clean build cache" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Step 2/3: Running CI pipeline (TypeScript + Build)..." -ForegroundColor Yellow
npm run ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: CI pipeline failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Step 3/3: Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Production build ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Build output is in the 'dist' folder." -ForegroundColor Gray
Write-Host ""
Write-Host "Optional commands:" -ForegroundColor Cyan
Write-Host "- 'npm run build:analyze' to analyze bundle size" -ForegroundColor Gray
Write-Host "- 'npm run format' to format code with Prettier" -ForegroundColor Gray
Write-Host "- 'npm run ci:full' for full CI with formatting check" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to start the production server
$startServer = Read-Host "Do you want to start the production server? (y/N)"
if ($startServer -eq 'y' -or $startServer -eq 'Y') {
    npm run start-prod
}
