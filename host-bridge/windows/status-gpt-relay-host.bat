@echo off
REM Show Chrome and host-bridge state.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpt-relay.ps1" -Action status
echo.
pause
