@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "DEFAULT_URL=http://localhost:3000"
set "WAIT_SECONDS=10"

if not exist "%PROJECT_DIR%\package.json" (
  echo [ERROR] package.json not found at:
  echo %PROJECT_DIR%
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

echo Starting Next.js dev server in a new terminal...
start "Team Workspace Dev Server" cmd /k "cd /d \"%PROJECT_DIR%\" && npm run dev"

echo Waiting %WAIT_SECONDS% seconds for startup...
timeout /t %WAIT_SECONDS% /nobreak >nul

start "" "%DEFAULT_URL%"

endlocal
exit /b 0
