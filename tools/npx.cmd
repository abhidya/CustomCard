@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0npx.ps1" %*
exit /b %ERRORLEVEL%
