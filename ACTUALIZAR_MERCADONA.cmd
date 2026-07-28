@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Actualizando productos y precios de Mercadona para el CP configurado...
echo.
call npm run actualizar-mercadona
if errorlevel 1 (
  echo.
  echo No se pudo completar la actualización. Revisa tu conexión y vuelve a intentarlo.
  pause
  exit /b 1
)
echo.
echo Actualización terminada. Si PFI estaba abierto, recarga la página con Ctrl+F5.
pause
