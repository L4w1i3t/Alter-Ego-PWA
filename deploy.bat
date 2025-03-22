@echo off
REM Deployment script for ALTER EGO PWA

echo Building application...
call npm run build

if %ERRORLEVEL% neq 0 (
  echo Build failed. Aborting deployment.
  exit /b 1
)

echo Build completed successfully!

REM Create a production directory if it doesn't exist
if not exist production mkdir production

REM Copy the contents of the dist folder to the production directory
echo Copying build files to production directory...
xcopy /s /y dist\* production\

echo Deployment preparation complete!
echo You can now upload the contents of the 'production' directory to your web server.
echo To test locally: npx serve -s production
