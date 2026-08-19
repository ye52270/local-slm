@echo off
rem  VDI resource logger (numbers only, no mail content). Run in a separate window, Ctrl+C to stop.
rem  Usage: Monitor.cmd                (every 10s -> resource-log.csv)
rem         Monitor.cmd -Interval 30
rem  Report: powershell -ExecutionPolicy Bypass -File Report-Resources.ps1 resource-log.csv
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Monitor-Resources.ps1" %*
