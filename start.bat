@echo off
echo ============================================
echo  Synthetic Sensex Order Book - Starting...
echo ============================================
echo.

cd /d "%~dp0"

REM Check if .env exists
if not exist .env (
    echo [INFO] No .env file found - starting in DEMO mode
    echo [INFO] Copy .env.example to .env and add your Kite API keys for live data
    echo.
)

REM Install dependencies if needed
pip install -r backend\requirements.txt -q 2>nul

echo Starting server on http://localhost:8765
echo Dashboard: http://localhost:8765
echo.

cd backend
python main.py
