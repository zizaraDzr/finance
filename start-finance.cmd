@echo off
rem Запускает локальный сервер финансов.
rem Планировщик вызывает этот файл через start-finance.vbs (без окна консоли).
cd /d "%~dp0"

if not exist "logs" mkdir "logs"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" "server\index.mjs" >> "logs\server.log" 2>&1
