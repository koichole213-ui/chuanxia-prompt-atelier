@echo off
cd /d "%~dp0"
title Chuanxia Local Server
node server.mjs --open
if errorlevel 1 pause
