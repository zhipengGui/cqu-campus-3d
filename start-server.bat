@echo off
rem huxi 3d map dev server launcher
rem 2026-10: nodejs moved to D:\dev\nodejs and dropped from system PATH; add it back if missing
where npx >nul 2>&1 || set PATH=D:\dev\nodejs;%PATH%
cd /d %~dp0
echo ================================================
echo  Huxi 3D Map server starting...
echo  Open: http://localhost:5188
echo  (Ctrl+C to stop; close this window to kill)
echo ================================================
npx vite --port 5188 --strictPort --host
pause
