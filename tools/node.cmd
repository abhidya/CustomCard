@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0node.ps1" %*
exit /b %ERRORLEVEL%
