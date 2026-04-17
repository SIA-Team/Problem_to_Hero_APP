@echo off
echo ========================================
echo 启动 Development Client 服务器
echo ========================================
echo.
echo 请选择启动模式:
echo.
echo 1. LAN 模式 (局域网，手机和电脑需要在同一 WiFi)
echo 2. Tunnel 模式 (公网隧道，手机可以在任何网络)
echo.
set /p choice="请输入选择 (1 或 2): "

if "%choice%"=="1" (
    echo.
    echo 正在启动 LAN 模式...
    echo 确保手机和电脑连接到同一个 WiFi
    echo.
    npx expo start --dev-client --lan
) else if "%choice%"=="2" (
    echo.
    echo 正在启动 Tunnel 模式...
    echo 这可能需要几分钟来建立隧道连接
    echo.
    npx expo start --dev-client --tunnel
) else (
    echo.
    echo 无效的选择，默认使用 LAN 模式
    echo.
    npx expo start --dev-client --lan
)

pause
