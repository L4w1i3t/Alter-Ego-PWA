REM filepath: c:\Users\Charles\Desktop\Programming\AI\PROJECTS\ALTEREGO-pwa\deploy-github.bat
@echo off
REM Deployment script for ALTER EGO PWA to GitHub Pages

echo Installing cross-env and other dependencies if needed...
call npm install

if %ERRORLEVEL% neq 0 (
  echo Failed to install dependencies. Aborting deployment.
  exit /b 1
)

echo Building application for GitHub Pages...
set GITHUB_PAGES=true
call npm run build

if %ERRORLEVEL% neq 0 (
  echo Build failed. Aborting deployment.
  exit /b 1
)

echo Build completed successfully!

REM Create a github-pages directory if it doesn't exist
if not exist github-pages mkdir github-pages

REM Copy the contents of the dist folder to the github-pages directory
echo Copying build files to github-pages directory...
xcopy /s /y dist\* github-pages\

echo GitHub Pages deployment preparation complete!
echo You can now upload the contents of the 'github-pages' directory to your GitHub Pages repository.
echo To test locally: npx serve -s github-pages