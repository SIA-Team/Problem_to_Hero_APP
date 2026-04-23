# EAS CLI 设备管理快速指南

使用 EAS CLI 管理设备比在 Apple Developer 后台手动操作简单得多！

---

## 方法 1：生成注册 URL（最推荐）⭐⭐⭐⭐⭐

这是最简单的方式，让团队成员自助注册。

### 步骤：

```bash
eas device:create --url
```

### 执行后会发生什么：

1. EAS 会生成一个专属的注册 URL
2. 你会看到类似这样的输出：
   ```
   ✔ Generated device registration URL:
   
   https://expo.dev/accounts/[your-account]/devices/register/[token]
   
   Share this URL with your team members to register their devices.
   The URL will expire in 7 days.
   ```

### 分享给团队成员：

把这个 URL 发给团队成员，并告诉他们：

```
嗨，请在你的 iPhone 上用 Safari 浏览器打开这个链接注册设备：

https://expo.dev/accounts/.../devices/register/...

步骤：
1. 在 iPhone 上用 Safari 打开链接（必须是 Safari）
2. 点击"Register Device"按钮
3. 点击"允许"下载配置文件
4. 打开"设置"应用
5. 看到"已下载描述文件"，点击进入
6. 点击"安装"
7. 输入设备密码
8. 点击"安装"确认
9. 完成后会自动跳转，显示"Device registered successfully"

你的设备就注册好了！
```

### 优点：

- ✅ 团队成员自助完成，无需发送 UDID
- ✅ 自动同步到 Apple Developer 账号
- ✅ 自动获取设备信息（型号、名称等）
- ✅ 无需手动输入 UDID
- ✅ 减少出错可能

---

## 方法 2：交互式添加

如果团队成员已经提供了 UDID，可以使用交互式命令。

### 步骤：

```bash
eas device:create
```

### 交互流程：

```
? Select platform: (Use arrow keys)
❯ iOS
  Android

? Device name: 张三 - iPhone 14 Pro

? Device ID (UDID): 00008030-001234567890ABCDEF123456

✔ Device registered successfully!
```

### 添加多个设备：

重复运行命令即可：

```bash
# 添加第一个设备
eas device:create
# 输入设备 1 的信息

# 添加第二个设备
eas device:create
# 输入设备 2 的信息

# 继续添加...
```

---

## 方法 3：查看已注册的设备

随时查看所有已注册的设备：

```bash
eas device:list
```

### 输出示例：

```
Devices for @your-account/qa-native-app:

iOS Devices:
┌────────────────────────────────────┬──────────────────────────┬──────────────────────────────────────────┐
│ Name                               │ Model                    │ UDID                                     │
├────────────────────────────────────┼──────────────────────────┼──────────────────────────────────────────┤
│ 张三 - iPhone 14 Pro               │ iPhone 14 Pro            │ 00008030-001234567890ABCDEF123456        │
│ 李四 - iPhone 13                   │ iPhone 13                │ 00008030-001234567890GHIJKL789012        │
│ 王五 - iPad Pro                    │ iPad Pro (11-inch)       │ 00008030-001234567890MNOPQR345678        │
└────────────────────────────────────┴──────────────────────────┴──────────────────────────────────────────┘

Total: 3 devices
```

---

## 方法 4：删除设备

如果需要移除某个设备：

```bash
# 先查看设备列表，获取设备 ID
eas device:list

# 删除指定设备
eas device:delete
```

### 交互流程：

```
? Select devices to delete: (Press <space> to select, <a> to toggle all)
❯ ◯ 张三 - iPhone 14 Pro (00008030-001234567890ABCDEF123456)
  ◯ 李四 - iPhone 13 (00008030-001234567890GHIJKL789012)
  ◯ 王五 - iPad Pro (00008030-001234567890MNOPQR345678)

? Are you sure you want to delete these devices? (y/N)
```

---

## 完整工作流程

### 场景：新团队成员加入

**第 1 步：生成注册 URL**

```bash
eas device:create --url
```

**第 2 步：分享 URL**

把生成的 URL 发给新成员（微信、邮件、Slack 等）

**第 3 步：等待成员注册**

成员在 iPhone 上完成注册后，你会收到通知（如果配置了通知）

**第 4 步：验证设备已添加**

```bash
eas device:list
```

确认新设备出现在列表中

**第 5 步：重新构建**

```bash
npm run ios:build:dev
```

EAS 会自动：
- 检测到新设备
- 更新 Provisioning Profile
- 构建包含新设备的版本

**第 6 步：分享构建**

构建完成后，把下载链接发给团队成员：

```bash
# 构建完成后会显示类似这样的链接
https://expo.dev/accounts/[account]/projects/[project]/builds/[build-id]
```

**第 7 步：团队成员安装应用**

成员在 iPhone 上打开链接，点击安装即可

**第 8 步：本地开发**

团队成员拉取代码后：

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 填写配置

# 启动开发服务器
npm run start:dev:device
```

在已安装的 Development 构建中连接本地服务器即可开始开发

---

## 常用命令速查表

```bash
# 生成设备注册 URL（推荐）
eas device:create --url

# 交互式添加设备
eas device:create

# 查看所有已注册设备
eas device:list

# 删除设备
eas device:delete

# 查看 EAS 账号信息
eas whoami

# 登录 EAS
eas login

# 重新构建 Development 版本
npm run ios:build:dev

# 查看构建状态
npm run build:status
eas build:list

# 查看构建详情
eas build:view [build-id]
```

---

## 常见问题

### Q1: 注册 URL 有效期多久？

A: 默认 7 天。过期后可以重新生成。

```bash
# 重新生成
eas device:create --url
```

---

### Q2: 团队成员说打开链接没反应？

A: 确保：
- ✅ 使用 Safari 浏览器（不是 Chrome 或其他浏览器）
- ✅ 在 iPhone 上打开（不是电脑）
- ✅ 链接未过期
- ✅ 网络连接正常

---

### Q3: 添加设备后需要多久才能使用？

A: 立即生效。但需要重新构建应用：

```bash
npm run ios:build:dev
```

构建完成后（通常 10-20 分钟），新设备就可以安装了。

---

### Q4: 可以同时生成多个注册 URL 吗？

A: 可以。每次运行 `eas device:create --url` 都会生成一个新的 URL，互不影响。

```bash
# 为成员 A 生成
eas device:create --url
# 发给成员 A

# 为成员 B 生成
eas device:create --url
# 发给成员 B
```

---

### Q5: 免费账号有设备数量限制吗？

A: 
- **Apple Developer 免费账号**：最多 3 台设备
- **Apple Developer 付费账号**：最多 100 台设备
- **EAS 本身**：无限制

限制来自 Apple Developer，不是 EAS。

---

### Q6: 如何知道设备注册成功了？

A: 三种方式：

1. 团队成员会看到成功提示
2. 运行 `eas device:list` 查看设备列表
3. 在 Apple Developer 后台查看（会自动同步）

---

### Q7: 设备注册后，旧的构建还能用吗？

A: 不能。旧构建的 Provisioning Profile 不包含新设备，必须重新构建。

---

### Q8: 可以批量导入设备吗？

A: EAS CLI 目前不支持批量导入文件。但可以：

**方案 1**：生成一个 URL，多人使用（推荐）
```bash
eas device:create --url
# 把这个 URL 发给所有团队成员
```

**方案 2**：使用脚本循环添加
```bash
# 如果有 UDID 列表，可以写个简单脚本
# 但通常方案 1 更简单
```

**方案 3**：在 Apple Developer 后台批量导入
- 然后运行 `eas device:list` 同步

---

## 最佳实践

### 1. 使用注册 URL 而不是手动输入 UDID

```bash
# ✅ 推荐
eas device:create --url

# ❌ 不推荐（除非已有 UDID）
eas device:create
```

### 2. 为不同用途生成不同的 URL

```bash
# 为开发团队生成
eas device:create --url
# 发给开发人员

# 为测试团队生成
eas device:create --url
# 发给测试人员
```

### 3. 定期清理无效设备

```bash
# 每季度检查一次
eas device:list

# 删除不再使用的设备
eas device:delete
```

### 4. 在文档中记录设备信息

创建 `docs/team-devices.md`：

```markdown
# 团队设备列表

| 成员 | 设备 | 添加日期 | 状态 |
|------|------|---------|------|
| 张三 | iPhone 14 Pro | 2024-01-15 | ✅ 使用中 |
| 李四 | iPhone 13 | 2024-01-16 | ✅ 使用中 |
| 王五 | iPad Pro | 2024-01-20 | ❌ 已移除 |

## 注册 URL

最新生成时间：2024-01-15
有效期至：2024-01-22

\`\`\`
https://expo.dev/accounts/.../devices/register/...
\`\`\`
```

---

## 下一步

添加设备后，记得：

1. ✅ 重新构建 Development 版本
   ```bash
   npm run ios:build:dev
   ```

2. ✅ 分享构建链接给团队成员

3. ✅ 团队成员安装应用

4. ✅ 团队成员本地运行开发服务器
   ```bash
   npm run start:dev:device
   ```

5. ✅ 开始开发 🎉

---

## 相关文档

- [EAS Device Management 官方文档](https://docs.expo.dev/build/device-management/)
- [EAS Build 官方文档](https://docs.expo.dev/build/introduction/)
- [Development Builds 指南](https://docs.expo.dev/develop/development-builds/introduction/)

---

**提示**：如果你需要帮助，随时运行：

```bash
eas device:create --help
eas device:list --help
eas device:delete --help
```
