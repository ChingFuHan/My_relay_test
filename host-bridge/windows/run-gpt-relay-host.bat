@echo off
REM Main entry: start Chrome + host-bridge, then verify health.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpt-relay.ps1" -Action run
echo.
pause
