@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist node_modules\ws call npm i ws --no-save
node tools\make-boss-voices.cjs
echo.
echo 完成後請告訴 Claude：會把 defense\audio\boss 裡的 mp3 提交並同步網站。
pause
