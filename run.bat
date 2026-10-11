@echo off
rem ====================================================================
rem  Startup template for Torii's local web apps.
rem  1) Copy this file into the project folder as run.bat (or start.bat).
rem  2) Edit ONLY the lines marked "EDIT".
rem  3) Keep this file ASCII only. Japanese text breaks in the Windows console.
rem
rem  What it does every time it starts:
rem    port check -> start the server -> open the browser when it is ready.
rem    It never kills other programs. If the number is taken, it tells you who uses it.
rem  Details: D:\Nocoya_Work\03-Dev\_shared\docs\local-server-ports.md
rem ====================================================================
setlocal
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
title EnglishWords1800 (mainichi eitango)
rem EDIT: window title above, project name below (lowercase, same as the folder name)
set "PROJECT=englishwords1800"
rem EDIT: only if the port number can never change (e.g. it is inside a Google redirect URI).
rem       Otherwise keep this line commented out and the number is assigned automatically.
rem set "PIN=8010"

set "LAUNCHER=D:\Nocoya_Work\03-Dev\_shared\devlaunch.py"
if not exist "%LAUNCHER%" set "LAUNCHER=tools\devlaunch.py"
set "PY=python"
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
set "PINARG="
if defined PIN set "PINARG=--pin %PIN%"

rem EDIT: the start command. Write {port} where the port number goes.
rem   Python (FastAPI):  "%PY%" -m uvicorn app.main:app --host 127.0.0.1 --port {port}
rem   Node (Next.js):    npm run dev -- --port {port}
rem   Node (Vite):       npm run dev -- --port {port} --strictPort
rem If the app answers {"app": "<PROJECT>"} at /healthz, a second start only opens the browser.
"%PY%" "%LAUNCHER%" --project %PROJECT% %PINARG% -- "%PY%" tools\serve.py --host 127.0.0.1 --port {port}
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" pause
exit /b %CODE%
