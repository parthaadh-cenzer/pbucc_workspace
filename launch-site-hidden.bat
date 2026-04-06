@echo off
setlocal

REM Absolute project path. Replace this if you move the project.
set "PROJECT_DIR=G:\Pbucc Marketing\Website\team-workspace"
set "DEFAULT_URL=http://localhost:3000"
set "FALLBACK_URL=http://localhost:3001"
set "WAIT_SECONDS=10"

if not exist "%PROJECT_DIR%\package.json" (
  echo [ERROR] package.json not found at:
  echo %PROJECT_DIR%
  echo.
  echo Update PROJECT_DIR in launch-site-hidden.bat and try again.
  pause
  exit /b 1
)

echo Starting Next.js dev server in a minimized terminal...
start "Team Workspace Dev Server" /min cmd /k "cd /d \"%PROJECT_DIR%\" && npm run dev"

echo Waiting %WAIT_SECONDS% seconds for startup...
timeout /t %WAIT_SECONDS% /nobreak >nul

REM Prefer 3000. If unavailable, open 3001 when it is active.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p3000 = Test-NetConnection -ComputerName 'localhost' -Port 3000 -InformationLevel Quiet; " ^
  "$p3001 = Test-NetConnection -ComputerName 'localhost' -Port 3001 -InformationLevel Quiet; " ^
  "if ($p3000) { Start-Process '%DEFAULT_URL%' } elseif ($p3001) { Start-Process '%FALLBACK_URL%' } else { Start-Process '%DEFAULT_URL%' }"

endlocal
exit /b 0
