@echo off
chcp 65001 >nul
title 幻靈守護戰 本機伺服器（關閉此視窗就會停止）
cd /d "%~dp0..\survivors"
start "" "http://127.0.0.1:4202/幻靈奇旅/defense/"
echo 伺服器執行中：http://127.0.0.1:4202/幻靈奇旅/defense/
echo 玩的時候請保持這個視窗開著；關閉視窗就會停止。
node serve.cjs
pause
