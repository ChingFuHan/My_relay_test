@echo off
REM Install host-bridge dependencies.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gpt-relay.ps1" -Action setup
echo.
pause
