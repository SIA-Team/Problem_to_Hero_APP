# Expo OTA 功能开关说明

## ✅ 已关闭 OTA 更新功能

修改位置：`app.json`

```json
"updates": {
  "enabled": false,  // ✅ 已关闭
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

## 📋 当前状态

### 关闭后的影响

✅ **不受影响的功能**：
- APP 正常运行
- 所有功能正常使用
- 本地开发不受影响
- 构建 APK 不受影响

❌ **停用的功能**：
- APP 不会检查更新
- 无法通过 OTA 推送更新
- 用户不会自动获取新版本

### 更新方式

关闭 OTA 后，更新 APP 的唯一方式：
```
修改代码 → 重新构建 APK → 用户下载安装
```

## 🔄 如何重新启用

### 方法 1：手动修改配置文件

编辑 `app.json`：
```json
"updates": {
  "enabled": true,  // 改为 true
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

### 方法 2：使用快捷脚本

创建一个开关脚本 `toggle-ota.js`：

```javascript
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 切换 OTA 状态
const currentStatus = appJson.expo.updates.enabled;
appJson.expo.updates.enabled = !currentStatus;

// 保存
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`✅ OTA 更新已${!currentStatus ? '启用' : '关闭'}`);
```

使用：
```bash
node toggle-ota.js
```

### 方法 3：使用命令行脚本

创建 `toggle-ota.bat`：
```batch
@echo off
echo ========================================
echo Expo OTA 功能开关
echo ========================================
echo.

node toggle-ota.js

echo.
pause
```

## ⚠️ 重要提示

### 关闭 OTA 后需要重新构建

如果你已经发布了启用 OTA 的 APK，关闭 OTA 后需要：

1. **重新构建 APK**
```bash
eas build --platform android --profile production
```

2. **分发新的 APK**
- 用户需要下载并安装新版本
- 旧版本仍会尝试检查更新（但不会有影响）

### 不需要重新构建的情况

如果你还没有发布 APK，只是在开发阶段：
- ✅ 直接修改配置即可
- ✅ 下次构建时会使用新配置

## 📊 OTA 开关对比

| 场景 | OTA 启用 | OTA 关闭 |
|------|---------|---------|
| 更新服务器地址 | 发布 OTA 更新（几分钟） | 重新构建 APK（30分钟） |
| 修复 Bug | 发布 OTA 更新 | 重新构建 APK |
| 添加新功能 | 发布 OTA 更新 | 重新构建 APK |
| 用户获取更新 | 自动下载（几秒） | 手动下载安装 |
| 更新成本 | 免费无限 | 消耗构建配额 |
| 更新速度 | 即时 | 需要用户手动更新 |

## 🎯 建议

### 何时关闭 OTA

✅ **适合关闭的场景**：
- 开发初期，频繁重新构建
- 不想依赖 Expo 服务器
- 需要完全控制更新流程
- 企业内部应用，有自己的分发渠道

❌ **不建议关闭的场景**：
- 已发布给用户的生产环境
- 需要快速修复 Bug
- 需要频繁更新配置
- 用户分散，难以通知更新

### 推荐策略

**开发阶段**：
```
OTA: 关闭 ❌
原因: 频繁重新构建，OTA 意义不大
```

**测试阶段**：
```
OTA: 启用 ✅
原因: 方便快速推送修复给测试人员
```

**生产环境**：
```
OTA: 启用 ✅
原因: 快速响应问题，提升用户体验
```

## 🔧 配置模板

### 完全关闭 OTA
```json
{
  "expo": {
    "updates": {
      "enabled": false
    }
  }
}
```

### 启用但手动检查
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_ERROR_RECOVERY"  // 仅错误时检查
    }
  }
}
```

### 完全启用（推荐生产环境）
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",  // 启动时检查
      "fallbackToCacheTimeout": 0       // 立即使用新版本
    }
  }
}
```

## 📝 检查清单

关闭 OTA 后，确认以下事项：

- [ ] `app.json` 中 `updates.enabled` 设置为 `false`
- [ ] 如果已发布 APK，计划重新构建
- [ ] 通知团队成员 OTA 已关闭
- [ ] 更新文档说明当前配置
- [ ] 准备好手动分发 APK 的流程

## 🚀 快速恢复

如果将来想重新启用 OTA：

1. 修改 `app.json`：`"enabled": true`
2. 重新构建 APK（如果已发布）
3. 发布更新：`eas update --branch production`

就这么简单！

---

**当前状态**: ❌ OTA 已关闭  
**修改时间**: 2026-03-09  
**下次构建**: 将使用关闭 OTA 的配置
