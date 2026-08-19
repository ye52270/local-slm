@echo off
rem  local-slm Windows demo launcher
rem  Usage:  Run-Demo.cmd                (latest 3 inbox mails)
rem          Run-Demo.cmd -Selected      (mail currently selected in Outlook)
rem          Run-Demo.cmd -Subject test  (subject contains "test")
rem          Run-Demo.cmd -Latest 5 -KeepServer
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Summarize-Mail.ps1" %*
echo.
pause
