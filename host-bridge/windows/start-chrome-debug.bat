@echo off
setlocal
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "PROFILE=%TEMP%\gpt-relay-chrome"

taskkill /f /im chrome.exe /T >nul 2>nul
timeout /t 2 /nobreak >nul

start "" "%CHROME%" ^
  --remote-debugging-address=127.0.0.1 ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%PROFILE%"

echo Chrome debug profile started.
echo Check: http://127.0.0.1:9222/json/version
endlocal
