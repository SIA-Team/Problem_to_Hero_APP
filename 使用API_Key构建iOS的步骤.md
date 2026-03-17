# 使用 App Store Connect API Key 构建 iOS

## 为什么推荐使用 API Key？

- ✅ 不需要每次输入密码
- ✅ 不受双因素认证影响
- ✅ 更稳定，适合自动化构建
- ✅ Apple 官方推荐的方式

## 详细步骤

### 1. 创建 API Key

1. 登录 App Store Connect：https://appstoreconnect.apple.com
2. 使用你的 Apple ID：`freeahappy@gmail.com`
3. 进入 `Users and Access`（用户和访问）
4. 点击 `Keys` 标签
5. 点击 `+` 按钮创建新的 API Key
6. 填写信息：
   - Name: `EAS Build Key`
   - Access: 选择 `Developer` 或 `Admin`
7. 点击 `Generate`

### 2. 下载 API Key

⚠️ 重要：API Key 只能下载一次！

1. 下载 `.p8` 文件（例如：`AuthKey_ABC123DEF4.p8`）
2. 记录以下信息：
   - **Key ID**：例如 `ABC123DEF4`（在下载页面显示）
   - **Issuer ID**：在 Keys 页面顶部显示（例如：`69a6de12-b123-47e3-e053-5b8c7c11a4d1`）

### 3. 配置到 EAS

在终端运行：

```bash
eas credentials
```

按照提示操作：

```
? Select platform › iOS
? Select build profile › production
? What do you want to do? › Set up App Store Connect API Key

? Key ID: ABC123DEF4
? Issuer ID: 69a6de12-b123-47e3-e053-5b8c7c11a4d1
? Path to .p8 file: ./AuthKey_ABC123DEF4.p8
```

### 4. 开始构建

配置完成后，运行：

```bash
eas build --platform ios --profile production
```

这次不会再要求输入 Apple ID 和密码了！

## 如果当前构建失败了怎么办？

### 选项 1：重试密码登录

在当前提示选择 `yes`：
```
? Would you like to try again? › yes
```

然后：
1. 确保在 https://developer.apple.com/account 能正常登录
2. 仔细输入密码
3. 准备好双因素认证码

### 选项 2：取消并使用 API Key

选择 `no`：
```
? Would you like to try again? › no
```

然后按照上面的步骤配置 API Key。

## 常见问题

### Q: 我找不到 "Keys" 标签？

A: 确保你的账号是 Apple Developer Program 成员，并且有足够的权限。如果是团队账号，需要 Admin 或 Account Holder 权限。

### Q: API Key 下载后放在哪里？

A: 可以放在项目根目录，或者任何安全的位置。配置时提供正确的路径即可。

### Q: API Key 会过期吗？

A: 不会自动过期，但可以在 App Store Connect 中手动撤销。

### Q: 一个 API Key 可以用于多个项目吗？

A: 可以！同一个 Apple Developer 账号下的所有项目都可以使用同一个 API Key。

## 推荐流程

1. 先尝试在网页登录 https://developer.apple.com/account
2. 如果能登录，检查账号状态和协议
3. 创建 App Store Connect API Key
4. 使用 `eas credentials` 配置 API Key
5. 运行 `eas build --platform ios --profile production`

这样就不会再遇到密码登录的问题了！
