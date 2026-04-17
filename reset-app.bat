@echo off
chcp 65001 >nul
echo ========================================
echo Reset App on Emulator
echo ========================================
echo.

echo [1/5] Stopping Metro Bundler...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Setting up adb...
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools

echo [3/5] Uninstalling app from emulator...
adb uninstall com.problemvshero.app.dev
adb uninstall com.problemvshero.app
echo OK App uninstalled

echo [4/5] Clearing Metro cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
)
if exist .expo (
    rmdir /s /q .expo
)
if exist %TEMP%\metro-* (
    del /q %TEMP%\metro-* 2>nul
)
if exist %TEMP%\react-* (
    del /q %TEMP%\react-* 2>nul
)
echo OK Cache cleared

echo [5/5] Starting server...
echo.
echo ========================================
echo Server starting...
echo After server starts, open the app in emulator
echo It will reinstall automatically
echo ========================================
echo.

set REACT_NATIVE_PACKAGER_HOSTNAME=localhost
adb reverse tcp:8082 tcp:8082
npx expo start -c --port 8082 --dev-client --localhost

pause
