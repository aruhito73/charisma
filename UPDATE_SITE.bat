@echo off
CHCP 65001 > nul
title Обновление данных сайта CHARISMA

echo ======================================================
echo    ОБНОВЛЕНИЕ ДАННЫХ САЙТА CHARISMA
echo ======================================================
echo.

:: Проверка на наличие Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен! 
    echo Пожалуйста, установите Node.js с сайта https://nodejs.org/
    pause
    exit /b
)

:: Проверка на наличие node_modules
if not exist node_modules (
    echo [ИНФО] Установка необходимых компонентов...
    call npm install
)

echo [1/2] Запуск сканирования данных (Puppeteer)...
echo Пожалуйста, подождите, это может занять около минуты...
echo.

call node update-data.js

if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Что-то пошло не так при обновлении данных.
    echo Проверьте соединение с интернетом или доступность сайта cyberfootball.online.
) else (
    echo.
    echo [УСПЕХ] Все данные успешно обновлены!
)

echo.
echo ======================================================
echo Нажмите любую клавишу, чтобы закрыть это окно...
pause > nul
