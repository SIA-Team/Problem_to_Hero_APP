# iOS 版本兼容性详细说明

## 📱 iOS 版本支持范围

### 当前配置

根据 React Native 和 Expo SDK 的要求：

```json
{
  "ios": {
    "deploymentTarget": "13.4"  // 最低支持 iOS 13.4
  }
}
```

### 支持的 iOS 版本

| iOS 版本 | 发布年份 | 支持状态 | 市场占有率 | 说明 |
|---------|---------|---------|-----------|------|
| iOS 13.4+ | 2020 | ✅ 最低支持 | ~2% | 最低版本 |
| iOS 14.x | 2020 | ✅ 完全支持 | ~5% | |
| iOS 15.x | 2021 | ✅ 完全支持 | ~10% | |
| iOS 16.x | 2022 | ✅ 完全支持 | ~25% | |
| iOS 17.x | 2023 | ✅ 完全支持 | ~45% | |
| iOS 18.x | 2024 | ✅ 完全支持 | ~10% | 最新版本 |

**覆盖率**：约 97% 的 iOS 设备

### 支持的设备

- ✅ iPhone 6s 及以上（2015 年及以后）
- ✅ iPad Air 2 及以上（2014 年及以后）
- ✅ iPad mini 4 及以上（2015 年及以后）
- ✅ iPad Pro 所有型号
- ✅ iPod touch（第 7 代）

---

## 🔒 iOS 特定限制和配置

### 1. App Transport Security (ATS) ⚠️ 重要

**问题**：iOS 9+ 默认只允许 HTTPS 连接，禁止 HTTP

**影响**：你的服务器使用 HTTP (`http://123.144.100.10:30560`)

**已修复**：
```json
"NSAppTransportSecurity": {
  "NSAllowsArbitraryLoads": true
}
```

**状态**：✅ 已配置

**说明**：
- `NSAllowsArbitraryLoads: true` 允许所有 HTTP 连接
- 这是临时方案，生产环境应使用 HTTPS
- App Store 审核可能要求说明原因

**更安全的配置**（推荐）：
```json
"NSAppTransportSecurity": {
  "NSExceptionDomains": {
    "123.144.100.10": {
      "NSExceptionAllowsInsecureHTTPLoads": true,
      "NSIncludesSubdomains": false
    }
  }
}
```

---

### 2. 权限说明（Privacy Descriptions）

**要求**：iOS 要求为每个权限提供使用说明

**已配置的权限**：

```json
"infoPlist": {
  "NSPhotoLibraryUsageDescription": "允许访问您的相册以更换头像",
  "NSCameraUsageDescription": "允许使用相机拍摄头像",
  "NSPhotoLibraryAddUsageDescription": "允许保存照片到相册"
}
```

**状态**：✅ 已配置

**说明**：
- 用户首次使用相关功能时会看到这些说明
- 说明应该清晰、简洁、真实
- App Store 审核会检查说明是否合理

---

### 3. 后台模式（Background Modes）

**当前状态**：未配置后台模式

**如果未来需要**：

```json
"ios": {
  "backgroundModes": [
    "audio",           // 后台音频
    "location",        // 后台定位
    "fetch",           // 后台获取
    "remote-notification"  // 推送通知
  ]
}
```

**无需立即配置**

---

### 4. 状态栏配置

**已配置**：
```json
"UIViewControllerBasedStatusBarAppearance": false
```

**效果**：允许全局控制状态栏样式

**状态**：✅ 已配置

---

### 5. iPad 支持

**已配置**：
```json
"supportsTablet": true
```

**效果**：应用支持 iPad，可以在 iPad 上运行

**状态**：✅ 已配置

---

## 🚫 iOS 特定限制

### 1. 不支持的设备

- ❌ iPhone 6 及更早（iOS 12 及以下）
- ❌ iPad Air（第 1 代）
- ❌ iPad mini（第 1-3 代）
- ❌ iPod touch（第 6 代及更早）

**原因**：无法升级到 iOS 13.4

### 2. 32 位设备

- ❌ 所有 32 位设备不支持
- iOS 11 开始只支持 64 位应用

### 3. App Store 限制

**HTTP 使用**：
- ⚠️ 使用 `NSAllowsArbitraryLoads` 可能被审核拒绝
- 需要在审核时说明使用 HTTP 的原因
- 建议尽快升级到 HTTPS

**隐私政策**：
- 需要提供隐私政策链接
- 说明数据收集和使用方式

---

## 📋 必需的权限配置

### 相机和相册权限

| 权限 Key | 说明 | 用途 | 状态 |
|---------|------|------|------|
| NSCameraUsageDescription | 相机使用说明 | 拍照上传头像 | ✅ 已配置 |
| NSPhotoLibraryUsageDescription | 相册访问说明 | 选择图片 | ✅ 已配置 |
| NSPhotoLibraryAddUsageDescription | 保存照片说明 | 保存图片 | ✅ 已配置 |

### 未来可能需要的权限

| 权限 Key | 说明 | 用途 | 状态 |
|---------|------|------|------|
| NSLocationWhenInUseUsageDescription | 使用时定位 | 位置服务 | ❌ 未配置 |
| NSMicrophoneUsageDescription | 麦克风使用 | 录音功能 | ❌ 未配置 |
| NSContactsUsageDescription | 通讯录访问 | 邀请好友 | ❌ 未配置 |
| NSCalendarsUsageDescription | 日历访问 | 添加日程 | ❌ 未配置 |
| NSFaceIDUsageDescription | Face ID 使用 | 生物识别 | ❌ 未配置 |

---

## 🔧 iOS 特殊配置

### 1. HTTP 安全配置（已修复）

**方案 1：允许所有 HTTP（当前配置）**

```json
"NSAppTransportSecurity": {
  "NSAllowsArbitraryLoads": true
}
```

**优点**：简单，所有 HTTP 都能访问
**缺点**：不安全，App Store 可能拒绝

---

**方案 2：只允许特定域名（推荐）**

```json
"NSAppTransportSecurity": {
  "NSExceptionDomains": {
    "123.144.100.10": {
      "NSExceptionAllowsInsecureHTTPLoads": true,
      "NSIncludesSubdomains": false
    }
  }
}
```

**优点**：更安全，只允许特定服务器
**缺点**：需要列出所有 HTTP 域名

---

**方案 3：使用 HTTPS（最佳）**

```json
// 不需要任何配置
```

**优点**：
- ✅ 最安全
- ✅ 不需要特殊配置
- ✅ App Store 审核无问题
- ✅ 用户数据加密

**缺点**：需要配置服务器 SSL 证书

---

### 2. 屏幕方向配置

**当前配置**：
```json
"orientation": "portrait"
```

**效果**：只支持竖屏

**如果需要支持横屏**：
```json
"orientation": "default"  // 支持所有方向
```

---

### 3. 启动画面配置

**当前配置**：
```json
"splash": {
  "resizeMode": "contain",
  "backgroundColor": "#ef4444"
}
```

**效果**：红色背景的启动画面

**状态**：✅ 已配置

---

## 🧪 iOS 测试建议

### 必测设备

1. **iPhone SE（第 2 代或第 3 代）** - 小屏幕
2. **iPhone 14/15** - 标准屏幕
3. **iPhone 14/15 Pro Max** - 大屏幕
4. **iPad** - 平板适配

### 必测版本

1. **iOS 13.4** - 最低支持版本
2. **iOS 16.x** - 主流版本
3. **iOS 17.x** - 当前主流版本
4. **iOS 18.x** - 最新版本

### 测试场景

#### 1. 首次安装
- ✅ 自动注册功能
- ✅ HTTP 连接（确认能访问服务器）
- ✅ 设备指纹生成

#### 2. 权限请求
- ✅ 相机权限弹窗和说明
- ✅ 相册权限弹窗和说明
- ✅ 权限被拒绝后的处理

#### 3. 网络功能
- ✅ HTTP 请求（注册、登录）
- ✅ 图片上传
- ✅ 网络错误处理

#### 4. UI 适配
- ✅ 不同屏幕尺寸
- ✅ 安全区域（刘海屏）
- ✅ iPad 横屏/竖屏

---

## 🐛 iOS 常见问题

### 问题 1: 无法连接服务器

**症状**：首次安装显示登录页，网络错误

**原因**：ATS 阻止 HTTP 连接

**解决方案**：✅ 已添加 `NSAllowsArbitraryLoads: true`

**状态**：已修复

---

### 问题 2: 权限弹窗不显示

**症状**：点击相机/相册没有反应

**原因**：缺少权限说明

**解决方案**：✅ 已配置所有权限说明

**状态**：已修复

---

### 问题 3: App Store 审核被拒

**可能原因**：

1. **使用 HTTP**
   - 说明：需要在审核时说明为什么使用 HTTP
   - 建议：升级到 HTTPS

2. **权限说明不清晰**
   - 说明：权限说明应该清晰、真实
   - 当前：✅ 说明已清晰

3. **缺少隐私政策**
   - 说明：需要提供隐私政策链接
   - 建议：在 App Store Connect 中添加

---

## 📊 iOS vs Android 对比

| 特性 | iOS | Android | 说明 |
|-----|-----|---------|------|
| HTTP 限制 | ✅ 已配置 | ✅ 已配置 | 都需要特殊配置 |
| 权限说明 | ✅ 已配置 | ✅ 自动处理 | iOS 更严格 |
| 最低版本 | iOS 13.4 | Android 6.0 | iOS 更新 |
| 覆盖率 | ~97% | ~96% | 相近 |
| 审核 | 严格 | 宽松 | iOS 更严格 |

---

## 🚀 构建 iOS 应用

### 使用 EAS Build

```bash
# 开发版本
eas build --platform ios --profile development

# 预览版本（TestFlight）
eas build --platform ios --profile preview

# 生产版本（App Store）
eas build --platform ios --profile production
```

### 本地构建（需要 Mac）

```bash
# 生成 iOS 项目
npx expo prebuild --platform ios

# 使用 Xcode 打开
open ios/qaapp.xcworkspace

# 或使用命令行构建
xcodebuild -workspace ios/qaapp.xcworkspace \
  -scheme qaapp \
  -configuration Release \
  -archivePath build/qaapp.xcarchive \
  archive
```

---

## 📝 App Store 提交清单

### 必需信息

- [ ] 应用名称
- [ ] 应用描述
- [ ] 关键词
- [ ] 应用图标（1024x1024）
- [ ] 截图（不同设备尺寸）
- [ ] 隐私政策链接
- [ ] 支持 URL

### 审核准备

- [ ] 测试账号（如果需要登录）
- [ ] 审核说明（如使用 HTTP 的原因）
- [ ] 演示视频（可选）

### 技术要求

- [x] 支持 iOS 13.4+
- [x] 支持 64 位
- [x] 权限说明完整
- [ ] 隐私政策（需要添加）
- [ ] HTTPS（建议升级）

---

## 🔒 安全和隐私

### 数据收集

**当前收集的数据**：
- 设备指纹（用于自动注册）
- 用户名和密码
- 用户头像
- 用户发布的内容

**需要在隐私政策中说明**：
- 收集哪些数据
- 如何使用数据
- 是否分享给第三方
- 如何保护数据安全

### App Store 隐私标签

需要在 App Store Connect 中填写：
- 联系信息（用户名）
- 照片或视频（头像）
- 用户内容（问题、回答）
- 标识符（设备指纹）

---

## 💡 iOS 特定优化建议

### 1. 使用 Face ID / Touch ID

```javascript
import * as LocalAuthentication from 'expo-local-authentication';

// 检查是否支持
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// 认证
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: '验证身份以登录',
});
```

**需要添加权限**：
```json
"NSFaceIDUsageDescription": "使用 Face ID 快速登录"
```

---

### 2. 支持 Dark Mode

```javascript
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme();
const isDark = colorScheme === 'dark';
```

**配置**：
```json
"userInterfaceStyle": "automatic"  // 支持深色模式
```

---

### 3. 支持 iPad 多任务

```json
"ios": {
  "requireFullScreen": false  // 允许分屏
}
```

---

## 📚 参考资料

- [iOS 版本分布](https://developer.apple.com/support/app-store/)
- [App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [iOS 权限指南](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy)
- [App Store 审核指南](https://developer.apple.com/app-store/review/guidelines/)

---

## ✅ iOS 配置检查清单

### 已完成

- [x] 最低版本设置（iOS 13.4）
- [x] HTTP 安全配置（NSAppTransportSecurity）
- [x] 相机权限说明
- [x] 相册权限说明
- [x] 状态栏配置
- [x] iPad 支持
- [x] Bundle Identifier

### 待完成（可选）

- [ ] 隐私政策链接
- [ ] App Store 截图
- [ ] 应用图标优化
- [ ] 深色模式支持
- [ ] Face ID 支持

---

## 💡 总结

### 当前状态

✅ **支持 iOS 13.4 - iOS 18**（覆盖 97% 设备）

✅ **HTTP 安全配置已添加**

✅ **所有必需权限已配置**

✅ **iPad 支持已启用**

### 唯一的问题

⚠️ **使用 HTTP 而非 HTTPS**

**影响**：
- App Store 审核可能要求说明
- 用户数据不加密
- 不符合最佳实践

**建议**：
- 短期：在审核时说明原因
- 长期：升级到 HTTPS

### 可以构建了！

iOS 配置已完成，可以使用 EAS Build 构建 iOS 应用了！

```bash
eas build --platform ios --profile production
```
