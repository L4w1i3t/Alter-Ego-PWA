# PowerShell Development Script for ALTER EGO PWA
Write-Host "Starting ALTER EGO PWA in development mode..." -ForegroundColor Green

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

# Clean previous builds
Write-Host ""
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
# npm run clean only if dist folder exists
if (Test-Path "dist") {
    npm run clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to clean build cache" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "No previous builds found. Skipping clean step." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Building for development..." -ForegroundColor Yellow
npm run build-dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build for development" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Available development commands:" -ForegroundColor Cyan
Write-Host "- npm run start-dev     : Start development server" -ForegroundColor Gray
Write-Host "- npm run build-dev     : Build for development" -ForegroundColor Gray
Write-Host "- npm run typecheck     : Type check without building" -ForegroundColor Gray
Write-Host "- npm run lint          : Check code quality" -ForegroundColor Gray
Write-Host "- npm run format        : Format code with Prettier" -ForegroundColor Gray
Write-Host "- npm run clean         : Clean build cache" -ForegroundColor Gray
Write-Host ""

Write-Host "Starting development server..." -ForegroundColor Green
npm run start-dev

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Development server failed to start" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
