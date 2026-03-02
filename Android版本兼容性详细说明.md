# Android 版本兼容性详细说明

## 🔴 问题根源

**生产版本 APK 无法自动注册，显示登录页**

## 🔍 问题分析

### 错误日志
```
❌ 设备指纹注册/登录失败
错误类型: Object
错误消息: 网络连接失败，请检查网络
⚠️ 请求配置错误
```

### 根本原因

**Android 9 (API 28) 及以上版本默认禁止明文 HTTP 流量**

从 Android 9 开始，Google 为了提高安全性，默认只允许 HTTPS 连接，禁止明文 HTTP 连接。

你的服务器地址：`http://123.144.100.10:30560`（使用 HTTP，不是 HTTPS）

因此生产版本的 APK 无法连接到服务器！

### 为什么开发版本可以？

- **开发版本**：使用 Expo Development Client，有特殊的网络配置
- **生产版本**：独立 APK，受 Android 系统限制

---

## ✅ 解决方案

### 方案 1: 允许明文流量（临时方案）

在 `android/app/src/main/AndroidManifest.xml` 中添加：

```xml
<application
  ...
  android:usesCleartextTraffic="true">
```

**优点**：
- 快速解决问题
- 无需修改服务器

**缺点**：
- 不安全（数据明文传输）
- Google Play 可能拒绝上架
- 用户数据容易被窃取

### 方案 2: 使用 HTTPS（推荐）⭐

将服务器升级为 HTTPS：

1. **申请 SSL 证书**
   - 免费证书：Let's Encrypt
   - 付费证书：阿里云、腾讯云等

2. **配置 Nginx/Apache**
   ```nginx
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:30560;
       }
   }
   ```

3. **更新应用配置**
   ```javascript
   // src/config/env.js
   prod: {
     apiUrl: 'https://api.yourdomain.com/qa-hero-app-user',
   }
   ```

**优点**：
- ✅ 安全
- ✅ 符合 Android 安全规范
- ✅ 可以上架 Google Play
- ✅ 用户数据加密传输

**缺点**：
- 需要域名
- 需要配置 SSL 证书
- 需要修改服务器配置

### 方案 3: 网络安全配置文件（精细控制）

创建 `android/app/src/main/res/xml/network_security_config.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 允许特定域名使用明文流量 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">123.144.100.10</domain>
    </domain-config>
</network-security-config>
```

然后在 `AndroidManifest.xml` 中引用：

```xml
<application
  ...
  android:networkSecurityConfig="@xml/network_security_config">
```

**优点**：
- 只允许特定域名使用 HTTP
- 其他连接仍然强制 HTTPS
- 比方案 1 更安全

**缺点**：
- 仍然不如 HTTPS 安全
- Google Play 可能有限制

---

## 📋 当前已应用的修复

✅ 已在 `AndroidManifest.xml` 中添加：
```xml
android:usesCleartextTraffic="true"
```

这是**临时解决方案**，允许应用使用明文 HTTP 连接。

---

## 🚀 下一步操作

### 立即测试

1. **重新构建生产版本**：
   ```bash
   eas build --platform android --profile production
   ```

2. **安装并测试**：
   - 安装新的 APK
   - 首次打开应该能自动注册成功
   - 不再显示登录页

### 长期规划

**强烈建议升级到 HTTPS**：

1. 申请域名（如 `api.yourdomain.com`）
2. 申请 SSL 证书（Let's Encrypt 免费）
3. 配置 Nginx 反向代理
4. 更新应用配置使用 HTTPS
5. 移除 `android:usesCleartextTraffic="true"`

---

## 📊 Android 版本说明

| Android 版本 | API Level | HTTP 支持 | 说明 |
|-------------|-----------|----------|------|
| Android 8.1 及以下 | ≤ 27 | ✅ 默认允许 | 无限制 |
| Android 9 | 28 | ❌ 默认禁止 | 需要配置 |
| Android 10 | 29 | ❌ 默认禁止 | 需要配置 |
| Android 11 | 30 | ❌ 默认禁止 | 需要配置 |
| Android 12+ | 31+ | ❌ 默认禁止 | 需要配置 |

**目标 API Level**: 34（Android 14）

---

## 🔒 安全建议

### 为什么要使用 HTTPS？

1. **数据加密**：防止中间人攻击
2. **身份验证**：确认服务器身份
3. **数据完整性**：防止数据被篡改
4. **用户信任**：浏览器显示安全标识
5. **SEO 优势**：搜索引擎优先 HTTPS 网站
6. **应用商店要求**：Google Play 强制要求

### HTTP 的风险

- ❌ 用户密码可能被窃取
- ❌ Token 可能被劫持
- ❌ 用户数据可能被篡改
- ❌ 容易受到中间人攻击
- ❌ 公共 WiFi 下极不安全

---

## 💡 总结

### 问题
生产版本 APK 无法连接到 HTTP 服务器，导致自动注册失败

### 原因
Android 9+ 默认禁止明文 HTTP 流量

### 临时解决方案
添加 `android:usesCleartextTraffic="true"`

### 最佳解决方案
升级服务器到 HTTPS

### 下一步
1. 重新构建 APK 测试
2. 规划 HTTPS 升级方案
3. 申请域名和 SSL 证书

---

## 📞 需要帮助？

如果在配置 HTTPS 时遇到问题，可以：
1. 查看 Let's Encrypt 官方文档
2. 使用 Certbot 自动配置
3. 咨询服务器管理员
4. 使用云服务商的 SSL 证书服务
