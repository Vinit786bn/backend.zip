@echo off
echo ========================================
echo Starting Carbon Wallet Backend & AI...
echo ========================================
echo.

echo [1/2] Starting Local AI Engine (Ollama)...
start /b ollama serve >nul 2>nul

echo [2/2] Starting Node Server...
node server.js
pause
