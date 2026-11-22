@echo off
chcp 65001 >nul
cd /d "%~dp0"

netstat -ano | findstr /C:":8000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo Сервер уже запущен. Открываю страницу.
  start "" http://127.0.0.1:8000/
  pause
  exit /b 0
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo Первый запуск: создаю окружение и ставлю пакеты.
  python -m venv backend\.venv
  if errorlevel 1 (
    echo Не найден Python. Установите Python 3 и запустите файл ещё раз.
    pause
    exit /b 1
  )
  backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo Пакеты не установились.
    pause
    exit /b 1
  )
)

echo Cargo Guard. Это окно не закрывать. Остановка: Ctrl+C
echo Страница откроется через пару секунд: http://127.0.0.1:8000/
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000/"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
echo.
echo Сервер остановлен.
pause
