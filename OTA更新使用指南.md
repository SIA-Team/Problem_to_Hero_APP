# Expo OTA 更新使用指南

## ✅ 你的项目已配置 OTA 更新

检查 `app.json`：
```json
"updates": {
  "enabled": true,                    // ✅ 已启用
  "checkAutomatically": "ON_LOAD",    // ✅ 启动时自动检查
  "fallbackToCacheTimeout": 0         // ✅ 立即使用新版本
}
```

## 🚀 快速开始

### 场景 1：更新服务器地址

#### 步骤 1：修改代码
编辑 `src/config/env.js`：
```javascript
const ENV = {
  prod: {
    apiUrl: 'http://新服务器IP:端口/qa-hero-app-user',
    contentApiUrl: 'http://新服务器IP:端口/qa-hero-content',
  },
};
```

#### 步骤 2：发布更新
```bash
eas update --branch production --message "更新服务器地址"
```

#### 步骤 3：等待用户更新
- 用户下次打开 APP 自动下载更新
- 下载完成后重启 APP
- 无需下载新 APK

### 场景 2：修复 Bug

#### 步骤 1：修复代码
```javascript
// 修复任何 JavaScript 代码的 Bug
```

#### 步骤 2：发布更新
```bash
eas update --branch production --message "修复登录问题"
```

### 场景 3：添加新功能

#### 步骤 1：开发新功能
```javascript
// 添加新的 React 组件或功能
```

#### 步骤 2：发布更新
```bash
eas update --branch production --message "新增用户反馈功能"
```

## 📋 常用命令

### 发布更新
```bash
# 发布到生产环境
eas update --branch production --message "更新说明"

# 发布到预览环境
eas update --branch preview --message "测试更新"

# 发布到开发环境
eas update --branch development --message "开发测试"
```

### 查看更新
```bash
# 查看所有更新记录
eas update:list

# 查看特定分支的更新
eas update:list --branch production

# 查看所有分支
eas branch:list
```

### 回滚更新
```bash
# 如果新版本有问题，可以回滚到之前的版本
eas update:republish --group <group-id>
```

### 删除更新
```bash
# 删除特定更新
eas update:delete <update-id>
```

## 🔄 更新流程详解

### 用户端流程
```
用户打开 APP
    ↓
检查更新 (1-2秒)
    ↓
发现新版本
    ↓
后台下载 (3-5秒，取决于网络)
    ↓
下载完成
    ↓
提示重启或自动重启
    ↓
使用新版本
```

### 开发者流程
```
修改代码
    ↓
测试功能
    ↓
运行 eas update
    ↓
上传到 Expo 服务器
    ↓
用户自动获取更新
```

## ⚙️ 配置选项

### app.json 配置详解

```json
{
  "expo": {
    "updates": {
      // 是否启用 OTA 更新
      "enabled": true,
      
      // 何时检查更新
      // "ON_LOAD" - 每次启动时检查
      // "ON_ERROR_RECOVERY" - 仅在错误恢复时检查
      "checkAutomatically": "ON_LOAD",
      
      // 回退到缓存的超时时间（毫秒）
      // 0 表示立即使用新版本
      "fallbackToCacheTimeout": 0,
      
      // 更新 URL（可选，使用自己的更新服务器）
      // "url": "https://your-update-server.com/api/manifest"
    },
    
    // 运行时版本策略
    "runtimeVersion": {
      // "sdkVersion" - 使用 Expo SDK 版本
      // "appVersion" - 使用 app.json 中的 version
      "policy": "sdkVersion"
    }
  }
}
```

### 高级配置：自定义更新检查

在 `App.js` 中添加：

```javascript
import * as Updates from 'expo-updates';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          console.log('发现新版本，开始下载...');
          await Updates.fetchUpdateAsync();
          
          // 提示用户重启
          Alert.alert(
            '更新可用',
            '发现新版本，是否立即重启应用？',
            [
              { text: '稍后', style: 'cancel' },
              { 
                text: '立即重启', 
                onPress: () => Updates.reloadAsync() 
              }
            ]
          );
        }
      } catch (error) {
        console.error('检查更新失败:', error);
      }
    }
    
    checkForUpdates();
  }, []);
  
  return <YourApp />;
}
```

## 🎯 最佳实践

### 1. 使用分支管理不同环境

```bash
# 开发环境
eas update --branch development

# 测试环境
eas update --branch staging

# 生产环境
eas update --branch production
```

### 2. 写清楚更新说明

```bash
# ❌ 不好
eas update --branch production --message "update"

# ✅ 好
eas update --branch production --message "修复用户登录失败问题，优化图片加载速度"
```

### 3. 先在预览环境测试

```bash
# 1. 发布到预览环境
eas update --branch preview --message "测试新功能"

# 2. 测试通过后发布到生产环境
eas update --branch production --message "新增用户反馈功能"
```

### 4. 保持更新记录

创建 `CHANGELOG.md`：
```markdown
# 更新日志

## 2026-03-09
- 更新服务器地址到新 IP
- 修复登录页面样式问题

## 2026-03-08
- 优化图片加载速度
- 新增用户反馈功能
```

### 5. 监控更新状态

```javascript
// 在 App.js 中添加更新监控
import * as Updates from 'expo-updates';

Updates.addListener((event) => {
  if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
    console.log('发现新版本');
  } else if (event.type === Updates.UpdateEventType.NO_UPDATE_AVAILABLE) {
    console.log('已是最新版本');
  } else if (event.type === Updates.UpdateEventType.ERROR) {
    console.error('更新失败:', event.message);
  }
});
```

## ⚠️ 注意事项

### OTA 更新的限制

✅ **可以更新**：
- JavaScript/TypeScript 代码
- React 组件
- API 配置、常量
- 业务逻辑
- UI 样式
- 图片、字体等资源

❌ **不能更新**：
- 原生代码（需要重新构建）
- 原生依赖库（需要重新构建）
- `app.json` 配置（需要重新构建）
- Expo SDK 版本（需要重新构建）
- 应用权限（需要重新构建）

### 何时需要重新构建 APK

以下情况必须重新构建：

1. **升级 Expo SDK**
```json
// package.json
"expo": "~54.0.31" → "~55.0.0"  // 需要重新构建
```

2. **添加新的原生依赖**
```bash
npm install react-native-camera  // 需要重新构建
```

3. **修改 app.json 配置**
```json
// app.json
"permissions": ["CAMERA"]  // 添加新权限，需要重新构建
```

4. **修改应用图标、启动屏幕**
```json
// app.json
"icon": "./assets/new-icon.png"  // 需要重新构建
```

### 更新失败处理

如果用户更新失败，APP 会：
1. 继续使用旧版本
2. 下次启动时重试
3. 不会影响 APP 正常使用

## 🧪 测试 OTA 更新

### 方法 1：使用测试脚本

运行 `test-ota-update.bat`：
```bash
test-ota-update.bat
```

### 方法 2：手动测试

```bash
# 1. 修改一个明显的地方（如首页标题）
# src/screens/HomeScreen.js
<Text>测试 OTA 更新 v2</Text>

# 2. 发布更新
eas update --branch production --message "测试 OTA 更新"

# 3. 关闭并重新打开 APP
# 4. 查看是否显示新内容
```

### 方法 3：查看更新日志

在 APP 中添加调试信息：
```javascript
import * as Updates from 'expo-updates';

console.log('当前更新 ID:', Updates.updateId);
console.log('更新时间:', Updates.createdAt);
console.log('是否嵌入式更新:', Updates.isEmbeddedLaunch);
```

## 📊 更新统计

### 查看更新使用情况

```bash
# 查看更新列表
eas update:list --branch production

# 输出示例：
# ID: abc123
# Message: 更新服务器地址
# Created: 2026-03-09 10:30:00
# Platform: android, ios
```

## 🔐 安全性

### 更新签名

Expo 会自动对更新进行签名，确保：
- 更新来自可信源
- 更新未被篡改
- 用户安全

### 回滚机制

如果新版本有严重问题：
```bash
# 1. 找到上一个稳定版本的 ID
eas update:list --branch production

# 2. 重新发布该版本
eas update:republish --group <group-id>
```

## 💡 常见问题

### Q1: 更新需要多长时间？
A: 通常 3-10 秒，取决于网络速度和更新大小。

### Q2: 用户必须重启 APP 吗？
A: 是的，下载完成后需要重启才能使用新版本。

### Q3: 可以强制用户更新吗？
A: 可以，在代码中检测到更新后自动调用 `Updates.reloadAsync()`。

### Q4: 更新失败怎么办？
A: APP 会继续使用旧版本，不影响正常使用。

### Q5: 可以针对特定用户推送更新吗？
A: 可以，使用 EAS Update 的高级功能（需要付费计划）。

## 🎓 学习资源

- [Expo Updates 官方文档](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Update 文档](https://docs.expo.dev/eas-update/introduction/)
- [更新最佳实践](https://docs.expo.dev/eas-update/best-practices/)

## 📞 获取帮助

如果遇到问题：
1. 查看 Expo 官方文档
2. 检查 `eas update:list` 输出
3. 查看 APP 日志
4. 在 Expo 论坛提问
