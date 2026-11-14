@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cap-nhat-danh-sach.ps1"
echo.
pause
