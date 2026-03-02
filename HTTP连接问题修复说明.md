# HTTP 连接问题修复说明

## 🔴 问题描述

生产版本 APK 安装后，自动注册失败，显示 "Network request failed"。

**错误原因**：
- Android 9+ 默认禁止 HTTP 明文传输
- 真实服务器地址是 `http://123.144.100.10:30560`（不是 HTTPS）
- 系统阻止了 HTTP 请求

## ✅ 已修复内容

### 1. 创建网络安全配置文件
**文件**：`android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 允许所有 HTTP 明文传输 -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- 明确允许特定域名的 HTTP 连接 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">123.144.100.10</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

### 2. 更新 AndroidManifest.xml
添加了 `android:networkSecurityConfig="@xml/network_security_config"` 属性。

## 📦 重新构建 APK

修复后需要重新构建 APK：

### 方案 1：使用 EAS Build（推荐）
```bash
# 构建预览版（用于测试）
eas build --platform android --profile preview

# 构建生产版
eas build --platform android --profile production
```

### 方案 2：本地构建
```bash
cd android
./gradlew assembleRelease
```

构建完成后的 APK 位置：
```
android/app/build/outputs/apk/release/app-release.apk
```

## 🧪 测试步骤

1. 安装新构建的 APK
2. 打开应用
3. 应用会自动尝试注册
4. 检查网络诊断页面，确认服务器连接成功

## 📝 注意事项

### 安全性考虑
- ⚠️ 当前配置允许所有 HTTP 连接（适合开发/测试）
- 🔒 生产环境建议后端升级为 HTTPS
- 🔒 或者只允许特定 IP 的 HTTP 连接

### 长期解决方案
建议后端同事将服务器升级为 HTTPS：
- 申请 SSL 证书（免费：Let's Encrypt）
- 配置 Nginx/Apache 支持 HTTPS
- 修改 `src/config/env.js` 中的地址为 `https://`

## 🔄 版本更新流程

每次修改 Android 原生配置后：
1. 必须重新构建 APK
2. 卸载旧版本
3. 安装新版本
4. 测试验证

## 📱 当前环境配置

**开发环境**：
- Mock 地址：`https://m1.apifoxmock.com/m1/7857964-7606903-default`
- 真实地址：`http://123.144.100.10:30560/qa-hero-app-user`
- 当前使用：真实地址（`USE_MOCK = false`）

**网络安全配置**：
- ✅ 允许 HTTP 明文传输
- ✅ 允许 `123.144.100.10` 的 HTTP 连接
- ✅ 允许 localhost 和模拟器地址

## 🚀 快速修复命令

```bash
# 1. 重新构建（EAS）
eas build --platform android --profile preview

# 2. 或本地构建
cd android && ./gradlew assembleRelease

# 3. 安装到设备
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 4. 清空缓存测试
adb shell pm clear com.qa.app
```

## ❓ 常见问题

### Q: 为什么开发版本可以连接，生产版本不行？
A: 开发版本通过 Metro bundler 加载代码，网络请求在开发环境中处理。生产版本是独立 APK，受 Android 系统网络安全策略限制。

### Q: 修改配置后需要重新构建吗？
A: 是的，任何 Android 原生配置修改（AndroidManifest.xml、网络安全配置等）都需要重新构建 APK。

### Q: 可以只修改 JS 代码吗？
A: 不行，这是 Android 系统级别的限制，必须修改原生配置。

### Q: 如何验证修复是否生效？
A: 安装新 APK 后，打开应用的"网络诊断"页面，点击"开始测试"，查看服务器连接是否成功。
