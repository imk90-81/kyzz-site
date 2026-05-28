@echo off
title Kyzz Publish Manager

echo.
echo ========================================
echo   Kyzz Publish Manager
echo ========================================
echo.

cd /d D:\codingfiles\kyzz-site

echo [1/2] Starting API server on port 3210...
start "Kyzz-API" cmd /c "node api-server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Astro dev server...
start "Kyzz-Dev" cmd /c "npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo ========================================
echo   All servers started!
echo ========================================
echo.
echo   Admin page: http://localhost:4321/admin/publish.html
echo   (or port 4322 if 4321 is in use)
echo.
echo   Press any key to stop all servers...
echo.
pause

taskkill /FI "WINDOWTITLE eq Kyzz-API*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Kyzz-Dev*" /F >nul 2>&1