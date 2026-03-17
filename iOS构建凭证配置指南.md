# iOS 构建凭证配置指南

## 🔴 当前问题

构建失败原因：
```
Invalid username and password combination. 
Used 'com.problemtohero.app' as the username.
```

这是因为 EAS 尝试使用 Bundle ID (`com.problemtohero.app`) 作为 Apple ID 登录，但实际上需要的是真实的 Apple 开发者账号邮箱。

## 📋 解决方案

### 方案 1：交互式配置凭证（推荐）

在终端中运行以下命令，按照提示配置 Apple 凭证：

```bash
eas credentials
```

然后选择：
1. `iOS` 平台
2. `production` 配置
3. `Set up a new Apple App Store Connect API Key` 或 `Set up credentials manually`

### 方案 2：使用 App Store Connect API Key（最佳实践）

这是 Apple 推荐的自动化构建方式，无需每次输入密码。

#### 步骤：

1. **登录 App Store Connect**
   - 访问：https://appstoreconnect.apple.com
   - 使用你的 Apple 开发者账号登录

2. **创建 API Key**
   - 进入 `Users and Access` > `Keys` 标签
   - 点击 `+` 创建新的 API Key
   - 名称：`EAS Build Key`
   - 访问权限：选择 `Developer` 或 `Admin`
   - 点击 `Generate`

3. **下载 API Key**
   - 下载 `.p8` 文件（只能下载一次，请妥善保存）
   - 记录以下信息：
     - Key ID（例如：ABC123DEF4）
     - Issuer ID（在 Keys 页面顶部）

4. **配置到 EAS**
   ```bash
   eas credentials
   ```
   
   选择：
   - Platform: `iOS`
   - Profile: `production`
   - 选择 `App Store Connect API Key`
   - 输入 Key ID
   - 输入 Issuer ID
   - 上传 `.p8` 文件

### 方案 3：手动输入 Apple ID（临时方案）

如果你想快速测试，可以在构建时手动输入凭证：

```bash
eas build --platform ios --profile production
```

当提示时：
- **Apple ID**: 输入你的 Apple 开发者账号邮箱（不是 Bundle ID）
- **Password**: 输入对应的密码
- **2FA Code**: 如果启用了双因素认证，输入验证码

## ⚠️ 重要注意事项

### 1. Apple 开发者账号要求

构建 iOS 应用需要：
- ✅ Apple Developer Program 会员资格（$99/年）
- ✅ 有效的 Apple ID
- ✅ 已接受最新的协议

检查账号状态：https://developer.apple.com/account

### 2. Bundle ID 配置

当前配置的 Bundle ID：`com.problemtohero.app`

确保：
- 这个 Bundle ID 已在 Apple Developer Portal 注册
- 你的账号有权限使用这个 Bundle ID
- Bundle ID 与 App Store Connect 中的应用匹配

### 3. 证书和配置文件

EAS 会自动管理：
- Distribution Certificate（发布证书）
- Provisioning Profile（配置文件）

但你需要确保：
- Apple 账号有创建证书的权限
- 没有达到证书数量限制

## 🔧 故障排查

### 问题 1：Apple ID 登录失败

**可能原因**：
- 使用了错误的凭证（如 Bundle ID 而不是邮箱）
- 密码错误
- 需要双因素认证
- 账号未激活或已过期

**解决方法**：
1. 确认使用正确的 Apple ID 邮箱
2. 在浏览器中登录 https://appleid.apple.com 验证账号
3. 确保账号是 Apple Developer Program 成员

### 问题 2：Distribution Certificate 验证失败

**错误信息**：
```
Distribution Certificate is not validated for non-interactive builds.
```

**解决方法**：
使用交互式模式重新配置：
```bash
eas build --platform ios --profile production
```

或者使用 App Store Connect API Key（推荐）

### 问题 3：Bundle ID 不匹配

**解决方法**：
1. 检查 `app.json` 中的 `ios.bundleIdentifier`
2. 在 Apple Developer Portal 注册该 Bundle ID
3. 确保账号有权限使用

## 📱 推荐的完整流程

### 首次构建 iOS 应用：

1. **准备 Apple 账号**
   ```bash
   # 检查账号状态
   # 访问 https://developer.apple.com/account
   ```

2. **配置 API Key（推荐）**
   ```bash
   eas credentials
   # 选择 iOS > production > App Store Connect API Key
   ```

3. **启动构建**
   ```bash
   eas build --platform ios --profile production
   ```

4. **等待构建完成**
   - 构建时间：通常 15-30 分钟
   - 可以在 https://expo.dev 查看构建状态

5. **下载和分发**
   - 下载 `.ipa` 文件
   - 上传到 TestFlight 或 App Store

## 🎯 快速开始命令

### 如果你已有 Apple 开发者账号：

```bash
# 1. 配置凭证（首次）
eas credentials

# 2. 启动构建
eas build --platform ios --profile production

# 3. 查看构建状态
eas build:list
```

### 如果你还没有 Apple 开发者账号：

1. 注册 Apple Developer Program：https://developer.apple.com/programs/
2. 支付 $99/年 会员费
3. 等待账号激活（通常 24-48 小时）
4. 然后按照上面的步骤配置

## 📚 相关文档

- [EAS Build iOS 配置](https://docs.expo.dev/build/setup/)
- [Apple Developer Portal](https://developer.apple.com/account)
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS 凭证管理](https://docs.expo.dev/app-signing/managed-credentials/)

## 💡 提示

- 使用 App Store Connect API Key 是最稳定的方式
- API Key 可以在团队中共享，无需共享 Apple ID 密码
- 首次构建可能需要更多时间来设置证书
- 保存好 API Key 的 `.p8` 文件，它只能下载一次

---

**下一步**：请先配置 Apple 凭证，然后重新运行构建命令。
