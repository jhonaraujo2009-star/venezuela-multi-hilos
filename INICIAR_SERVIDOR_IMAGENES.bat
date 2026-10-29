@echo off
title SERVIDOR DE IMAGENES LOCAL
echo ======================================================
echo    INICIANDO SERVIDOR LOCAL DE IMAGENES EN TU PC
echo ======================================================

cd /d "%~dp0server_media"

:: Iniciar el servidor Node en segundo plano
start "Servidor Node 5001" /min node server.js

:: Iniciar el tunel Cloudflare
echo Conectando tunel HTTPS a Internet...
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5001
pause
