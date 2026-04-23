# 添加团队成员设备到 iOS Development 构建指南

## 目录
1. [获取团队成员的设备 UDID](#获取设备-udid)
2. [在 Apple Developer 后台添加设备](#添加设备到-apple-developer)
3. [使用 EAS CLI 添加设备](#使用-eas-cli-添加设备推荐)
4. [重新构建 Development 版本](#重新构建)
5. [分享构建给团队成员](#分享构建)

---

## 获取设备 UDID

### 方法 1：通过网站获取（最简单）⭐⭐⭐⭐⭐

让团队成员访问以下任一网站，按照提示安装配置文件即可获取 UDID：

**推荐网站**：
- https://udid.tech/
- https://get.udid.io/
- https://www.whatsmyudid.com/

**步骤**：
1. 在 iPhone/iPad 上用 Safari 浏览器打开上述网站
2. 点击"获取 UDID"或"Install Profile"
3. 按照提示安装配置文件
4. 网站会显示设备的 UDID
5. 复制 UDID 并发送给你

**示例 UDID 格式**：
```
00008030-001234567890ABCD
```

---

### 方法 2：通过 Finder/iTunes（Mac/Windows）

**Mac 用户（macOS Catalina 及以上）**：
1. 用数据线连接 iPhone 到 Mac
2. 打开 Finder
3. 在侧边栏选择你的设备
4. 点击设备名称下方的信息，会循环显示：
   - 序列号
   - UDID ← 这个就是
   - 型号
5. 右键点击 UDID → 拷贝

**Windows 用户或旧版 Mac**：
1. 安装 iTunes
2. 连接设备
3. 点击设备图标
4. 在"摘要"页面，点击"序列号"标签
5. 会显示 UDID
6. 右键复制

---

### 方法 3：通过 Xcode（仅 Mac）

1. 连接设备到 Mac
2. 打开 Xcode
3. 菜单栏：Window → Devices and Simulators
4. 选择你的设备
5. 在右侧面板可以看到 "Identifier"（即 UDID）
6. 右键复制

---

## 添加设备到 Apple Developer

### 在 Apple Developer 后台手动添加

1. 登录 [Apple Developer](https://developer.apple.com/account/)
2. 进入 "Certificates, Identifiers & Profiles"
3. 左侧菜单选择 "Devices"
4. 点击右上角 "+" 按钮
5. 填写信息：
   - **Platform**: iOS
   - **Device Name**: 团队成员名字（如：张三的 iPhone）
   - **Device ID (UDID)**: 粘贴获取的 UDID
6. 点击 "Continue" → "Register"

**批量添加**：
1. 在 Devices 页面点击 "+" 按钮
2. 选择 "Register Multiple Devices"
3. 下载模板文件
4. 按照格式填写（每行一个设备）：
   ```
   Device ID	Device Name
   00008030-001234567890ABCD	张三的 iPhone
   00008030-001234567890EFGH	李四的 iPhone
   ```
5. 上传文件
6. 点击 "Continue" → "Register"

---

## 使用 EAS CLI 添加设备（推荐）⭐⭐⭐⭐⭐

EAS 提供了更简单的方式来管理设备，无需手动在 Apple Developer 后台操作。

### 步骤 1：收集团队成员的 UDID

创建一个文件 `team-devices.txt`，格式如下：

```
00008030-001234567890ABCD	张三的 iPhone 14 Pro
00008030-001234567890EFGH	李四的 iPhone 13
00008030-001234567890IJKL	王五的 iPhone 15
```

### 步骤 2：使用 EAS CLI 注册设备

```bash
# 方法 1：交互式添加（推荐）
eas device:create

# 方法 2：从文件批量导入
eas device:create --apple-team-id RQ66NFT7M5

# 方法 3：查看已注册的设备
eas device:list
```

**交互式添加流程**：
1. 运行 `eas device:create`
2. 选择 "iOS"
3. 输入设备名称
4. 输入 UDID
5. 确认添加
6. 重复以上步骤添加更多设备

### 步骤 3：生成注册 URL（最简单）⭐⭐⭐⭐⭐

让团队成员自己注册设备：

```bash
eas device:create --url
```

这会生成一个 URL，发送给团队成员：
1. 团队成员在 iPhone 上用 Safari 打开这个 URL
2. 按照提示安装配置文件
3. 设备会自动注册到你的 Apple Developer 账号
4. 你会收到通知

---

## 重新构建

添加新设备后，需要重新生成 provisioning profile 并构建：

### 方法 1：使用 EAS Build（推荐）

```bash
# 重新构建 Development 版本
npm run ios:build:dev

# 或者直接运行
eas build --profile development --platform ios
```

EAS 会自动：
- 检测到新添加的设备
- 重新生成 provisioning profile
- 构建包含所有设备的新版本

### 方法 2：清除缓存后构建

如果遇到问题，可以清除缓存：

```bash
# 清除 EAS 构建缓存
eas build --profile development --platform ios --clear-cache
```

---

## 分享构建

### 构建完成后

1. **获取下载链接**：
   - 构建完成后，EAS 会提供一个下载链接
   - 链接格式：`https://expo.dev/accounts/[account]/projects/[project]/builds/[build-id]`

2. **分享给团队成员**：
   ```
   嗨，这是我们的 Development 构建：
   
   下载链接：https://expo.dev/accounts/.../builds/...
   
   安装步骤：
   1. 在 iPhone 上用 Safari 打开上面的链接
   2. 点击"Install"按钮
   3. 按照提示安装应用
   4. 如果提示"未受信任的企业级开发者"：
      - 打开"设置" → "通用" → "VPN与设备管理"
      - 点击开发者名称
      - 点击"信任"
   ```

3. **团队成员本地开发**：
   ```bash
   # 团队成员拉取代码后
   npm install
   
   # 复制环境变量
   cp .env.example .env
   # 填写必要的配置
   
   # 启动本地开发服务器
   npm run start:dev:device
   
   # 在已安装的 Development 构建中：
   # 1. 摇晃设备打开开发菜单
   # 2. 点击"Enter URL manually"
   # 3. 输入本地服务器地址（会显示在终端）
   # 4. 连接成功后即可开始开发
   ```

---

## 常见问题

### Q1: 免费 Apple Developer 账号可以添加多少设备？
A: 最多 3 台设备。付费账号（$99/年）可以添加 100 台设备。

### Q2: 添加设备后需要多久才能使用？
A: 立即生效。重新构建后，新设备就可以安装了。

### Q3: 设备数量达到上限怎么办？
A: 
- 免费账号：只能移除旧设备添加新设备
- 付费账号：每年可以重置一次设备列表（在账号续费时）

### Q4: 如何移除设备？
A:
```bash
# 使用 EAS CLI
eas device:list
eas device:delete [device-id]

# 或在 Apple Developer 后台
# Devices → 选择设备 → Disable
```

### Q5: Development 构建和 Production 构建有什么区别？
A:
- **Development**: 
  - 可以连接本地开发服务器
  - 包含调试工具
  - 需要注册设备 UDID
  - 仅限内部测试
  
- **Production**: 
  - 优化后的生产版本
  - 通过 App Store 或 TestFlight 分发
  - 不需要注册 UDID
  - 可以公开发布

### Q6: 团队成员更换设备怎么办？
A: 重复上述步骤，添加新设备的 UDID，然后重新构建。

---

## 最佳实践

### 1. 使用 EAS 设备注册 URL
- 最简单的方式
- 团队成员自助注册
- 自动同步到 Apple Developer

### 2. 维护设备列表文档
创建 `docs/team-devices.md`：
```markdown
# 团队设备列表

| 成员 | 设备型号 | UDID | 添加日期 |
|------|---------|------|---------|
| 张三 | iPhone 14 Pro | 00008030-... | 2024-01-15 |
| 李四 | iPhone 13 | 00008030-... | 2024-01-16 |
```

### 3. 定期清理无效设备
- 每季度检查一次设备列表
- 移除离职员工的设备
- 移除不再使用的旧设备

### 4. 使用 Internal Distribution
你的 `eas.json` 已经配置了 `"distribution": "internal"`，这是正确的：
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",  // ✅ 正确
      "channel": "development"
    }
  }
}
```

---

## 快速开始检查清单

- [ ] 收集团队成员的设备 UDID
- [ ] 在 Apple Developer 或使用 EAS CLI 添加设备
- [ ] 运行 `npm run ios:build:dev` 重新构建
- [ ] 获取构建下载链接
- [ ] 分享链接给团队成员
- [ ] 团队成员安装应用
- [ ] 团队成员本地运行 `npm run start:dev:device`
- [ ] 在 Development 构建中连接本地服务器
- [ ] 开始开发 🎉

---

## 相关命令速查

```bash
# 查看已注册设备
eas device:list

# 添加新设备（交互式）
eas device:create

# 生成设备注册 URL
eas device:create --url

# 删除设备
eas device:delete [device-id]

# 重新构建 Development 版本
npm run ios:build:dev

# 查看构建状态
npm run build:status

# 启动本地开发服务器
npm run start:dev:device
```

---

## 参考资料

- [EAS Build - Internal Distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS Device Management](https://docs.expo.dev/build/device-management/)
- [Apple Developer - Register Devices](https://developer.apple.com/account/resources/devices/list)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
