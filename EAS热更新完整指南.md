# EAS 热更新完整指南

## ✅ 你的配置已经准备好了

你的 `app.json` 已经配置了热更新：
```json
"updates": {
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

我已经为你的 `eas.json` 添加了更新通道配置。

## 第一步：使用 EAS 构建 APK

### 构建生产版本
```bash
eas build --platform android --profile production
```

**构建过程：**
1. 代码会上传到 EAS 服务器
2. 在云端构建 APK（大约 10-20 分钟）
3. 构建完成后会提供下载链接
4. 这个 APK 已经内置了热更新功能

### 下载并分发 APK
```bash
# 查看构建状态
eas build:list

# 构建完成后，从 Expo 网站下载 APK
# 或者使用命令行下载
eas build:download --platform android --profile production
```

## 第二步：用户安装 APK

用户安装这个 EAS 构建的 APK 后，APP 就具备了热更新能力。

## 第三步：发布热更新

### 当你修改了代码后（比如修复了分类显示问题）

```bash
# 发布更新到生产环境
eas update --branch production --message "修复分类显示问题"
```

**发布过程：**
1. 打包 JavaScript 代码
2. 上传到 EAS Update 服务器
3. 用户下次打开 APP 时会自动下载更新

### 发布到不同环境

```bash
# 发布到预览环境
eas update --branch preview --message "测试新功能"

# 发布到开发环境
eas update --branch development --message "开发中的功能"
```

## 第四步：用户接收更新

### 自动更新流程

1. **用户打开 APP**
   - APP 启动时自动检查更新（`checkAutomatically: "ON_LOAD"`）
   
2. **下载更新**
   - 如果有新版本，后台下载更新包
   - 下载完成后，下次启动 APP 时应用更新
   
3. **应用更新**
   - 用户关闭并重新打开 APP
   - 新代码生效

### 更新时机配置

你当前的配置是 `"checkAutomatically": "ON_LOAD"`，表示每次启动时检查更新。

其他选项：
- `"ON_LOAD"` - 每次启动时检查（推荐）
- `"ON_ERROR_RECOVERY"` - 仅在错误恢复时检查
- `"NEVER"` - 从不自动检查（需要手动触发）

## 常用命令

### 查看更新历史
```bash
# 查看所有更新
eas update:list

# 查看特定分支的更新
eas update:list --branch production
```

### 查看构建历史
```bash
# 查看所有构建
eas build:list

# 查看特定平台的构建
eas build:list --platform android
```

### 删除更新
```bash
# 删除特定更新
eas update:delete --group <update-group-id>
```

### 回滚更新
```bash
# 发布之前的版本作为新更新
eas update --branch production --message "回滚到上一版本"
```

## 完整工作流程示例

### 场景：修复分类显示 bug

1. **修改代码**
```bash
# 在 PublishScreen.js 中修复 bug
# 保存文件
```

2. **测试修改**
```bash
# 本地测试
npm start
```

3. **发布热更新**
```bash
eas update --branch production --message "修复分类显示问题"
```

4. **等待用户接收**
- 用户下次打开 APP 时会自动下载更新
- 用户关闭并重新打开 APP 后，修复生效

### 场景：添加新功能

1. **开发新功能**
```bash
# 修改代码
# 本地测试
```

2. **先发布到预览环境测试**
```bash
eas update --branch preview --message "新增用户反馈功能"
```

3. **测试通过后发布到生产环境**
```bash
eas update --branch production --message "新增用户反馈功能"
```

## 热更新的限制

### ✅ 可以热更新的内容
- JavaScript 代码修改
- React 组件修改
- 样式调整
- 业务逻辑变更
- API 调用修改
- 文本内容更新
- 图片资源（如果在 assets 中）

### ❌ 不能热更新的内容（需要重新构建）
- 原生代码修改（Java/Kotlin/Objective-C/Swift）
- 添加/删除原生依赖
- `app.json` 中的原生配置修改
- 权限变更
- SDK 版本升级
- Expo SDK 版本升级
- 原生模块配置变更

## 监控和调试

### 查看更新状态
```bash
# 查看特定构建的更新通道
eas build:view <build-id>

# 查看更新详情
eas update:view <update-id>
```

### 在 APP 中查看更新信息

你可以在代码中添加更新信息显示：

```javascript
import * as Updates from 'expo-updates';

// 检查更新
const checkForUpdates = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // 提示用户重启 APP
      Alert.alert(
        '更新可用',
        '新版本已下载，请重启应用以应用更新',
        [
          { text: '稍后', style: 'cancel' },
          { text: '立即重启', onPress: () => Updates.reloadAsync() }
        ]
      );
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};

// 查看当前版本信息
console.log('Update ID:', Updates.updateId);
console.log('Channel:', Updates.channel);
console.log('Runtime Version:', Updates.runtimeVersion);
```

## 最佳实践

### 1. 使用语义化版本号
```json
// app.json
"version": "1.0.0"  // 主版本.次版本.修订号
```

### 2. 写清楚更新说明
```bash
# 好的示例
eas update --branch production --message "修复分类显示问题，优化加载性能"

# 不好的示例
eas update --branch production --message "更新"
```

### 3. 分环境测试
```bash
# 先发布到预览环境
eas update --branch preview --message "测试新功能"

# 测试通过后再发布到生产环境
eas update --branch production --message "新功能上线"
```

### 4. 保持更新频率适中
- 不要过于频繁（避免用户每次打开都在更新）
- 不要太久不更新（bug 修复应该及时推送）
- 建议：重要 bug 立即更新，小优化可以积累后一起更新

### 5. 监控更新成功率
```bash
# 定期查看更新统计
eas update:list --branch production
```

## 故障排查

### 问题 1：用户没有收到更新

**可能原因：**
- 用户没有重新打开 APP
- 网络问题导致下载失败
- 用户安装的是本地构建的 APK（不支持热更新）

**解决方案：**
- 确认用户安装的是 EAS 构建的 APK
- 让用户完全关闭并重新打开 APP
- 检查用户的网络连接

### 问题 2：更新后 APP 崩溃

**可能原因：**
- 代码有 bug
- 更新包与原生代码不兼容

**解决方案：**
```bash
# 立即发布回滚更新
eas update --branch production --message "回滚到稳定版本"
```

### 问题 3：更新发布失败

**可能原因：**
- 网络问题
- EAS 服务器问题
- 项目配置问题

**解决方案：**
```bash
# 检查 EAS 状态
eas whoami

# 重新登录
eas login

# 重试发布
eas update --branch production --message "重新发布"
```

## 成本说明

### EAS Update 免费额度
- 每月免费更新次数：无限制
- 免费带宽：50GB/月
- 免费存储：1GB

### 超出免费额度后
- 需要升级到付费计划
- 查看定价：https://expo.dev/pricing

## 总结

### 使用 EAS 构建后的优势
✅ 支持热更新（OTA）
✅ 无需重新安装 APK
✅ 用户自动接收更新
✅ 可以快速修复 bug
✅ 可以快速发布新功能

### 工作流程
1. **首次构建**：`eas build --platform android --profile production`
2. **用户安装**：分发 APK 给用户
3. **修改代码**：修复 bug 或添加新功能
4. **发布更新**：`eas update --branch production --message "更新说明"`
5. **用户接收**：用户下次打开 APP 时自动更新

### 下一步
1. 运行 `eas build --platform android --profile production` 构建 APK
2. 等待构建完成（10-20 分钟）
3. 下载并分发 APK
4. 以后修改代码后，使用 `eas update` 发布更新
