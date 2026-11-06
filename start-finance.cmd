@echo off
title Finance server - https://localhost:4173
rem Starts the local finance server in a visible console window.
rem Called by the "Finance server" scheduled task at logon.
cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

rem Node exit code goes to Task Scheduler: on crash the task restarts the server.
"%NODE_EXE%" "server\index.mjs"
