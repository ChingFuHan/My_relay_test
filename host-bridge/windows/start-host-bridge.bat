@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist node_modules (
  call npm install
)

set "HOST_BRIDGE_TOKEN=change-me"
set "CHROME_CDP_URL=http://127.0.0.1:9222"
set "HOST_BRIDGE_HOST=0.0.0.0"
set "HOST_BRIDGE_PORT=8765"

node server.mjs
endlocal
