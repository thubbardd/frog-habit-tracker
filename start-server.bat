@echo off
title Groyper Tracker — Local Server
cd /d "%~dp0"
echo ============================================
echo   Groyper Habit Tracker - Local Server
echo ============================================
echo.
echo Server starting on http://localhost:8000
echo Open that URL in your browser.
echo.
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 8000
pause
