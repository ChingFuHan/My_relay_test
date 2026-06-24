@echo off
REM Stop host-bridge and the dedicated GPT Relay debug Chrome.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpt-relay.ps1" -Action stop
echo.
pause
