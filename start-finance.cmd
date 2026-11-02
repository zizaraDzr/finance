@echo off
title Finance server - https://localhost:4173
rem Запускает локальный сервер финансов в видимом окне консоли.
rem Вызывается задачей планировщика "Finance server" при входе в систему.
cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

rem Код выхода node возвращается планировщику: при падении задача перезапустит сервер.
"%NODE_EXE%" "server\index.mjs"
