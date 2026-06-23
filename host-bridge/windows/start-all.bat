@echo off
setlocal
set "ROOT=%~dp0"

call "%ROOT%start-chrome-debug.bat"
timeout /t 3 /nobreak >nul
call "%ROOT%start-host-bridge.bat"

endlocal
