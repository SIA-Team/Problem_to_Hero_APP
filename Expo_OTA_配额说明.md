# Expo OTA 更新配额说明

## 📊 配额消耗规则

### EAS Update 计费方式

Expo 的 OTA 更新功能（EAS Update）按照以下方式计费：

#### 1. 免费计划 (Free Plan)
```
✅ 每月免费额度：
   - 更新发布次数：无限制 ✨
   - 更新下载次数：无限制 ✨
   - 带宽：无限制 ✨
   
⚠️ 限制：
   - 只能用于个人项目
   - 不支持团队协作
   - 不支持高级功能（如分组推送）
```

#### 2. 生产计划 (Production Plan) - $29/月
```
✅ 包含：
   - 所有免费计划功能
   - 团队协作
   - 优先支持
   - 高级分析
   - 分组推送
```

#### 3. 企业计划 (Enterprise Plan) - 定制价格
```
✅ 包含：
   - 所有生产计划功能
   - SLA 保证
   - 专属支持
   - 自定义部署
```

## 🎉 好消息：免费计划已经够用！

根据 Expo 2024 年的最新政策：

### EAS Update 免费额度（2024年更新）

| 项目 | 免费计划 | 说明 |
|------|---------|------|
| 更新发布次数 | **无限制** | 可以随时发布更新 |
| 更新下载次数 | **无限制** | 用户下载更新不计费 |
| 带宽 | **无限制** | 不限制流量 |
| 存储 | **无限制** | 更新文件存储不计费 |
| 项目数量 | **无限制** | 可以创建多个项目 |

**结论：对于个人开发者和小团队，免费计划完全够用！**

## 💰 什么会消耗配额？

### EAS Build（构建服务）才会消耗配额

```
免费计划：
- Android 构建：30 次/月
- iOS 构建：30 次/月

超出后：
- Android: $0.05/次
- iOS: $0.10/次
```

### EAS Update（OTA更新）不消耗配额

```
✅ 免费且无限制：
- 发布更新：无限次
- 用户下载：无限次
- 带宽使用：无限制
```

## 📈 你的使用场景分析

### 场景 1：更新服务器地址
```
操作：eas update --branch production
消耗：0 次构建配额 ✅
费用：$0
```

### 场景 2：修复 Bug
```
操作：eas update --branch production
消耗：0 次构建配额 ✅
费用：$0
```

### 场景 3：添加新功能（纯 JS）
```
操作：eas update --branch production
消耗：0 次构建配额 ✅
费用：$0
```

### 场景 4：添加原生依赖（需要重新构建）
```
操作：eas build --platform android
消耗：1 次 Android 构建配额 ⚠️
费用：免费额度内 $0，超出后 $0.05/次
```

## 🔍 查看你的配额使用情况

### 方法 1：通过命令行
```bash
# 查看账户信息
eas account:view

# 查看构建历史
eas build:list

# 查看更新历史
eas update:list
```

### 方法 2：通过 Web 控制台
访问：https://expo.dev/accounts/[your-account]/settings/billing

可以看到：
- 当前计划
- 已使用的构建次数
- 剩余配额
- 账单历史

## 💡 节省配额的技巧

### 1. 优先使用 OTA 更新
```
✅ 能用 OTA 就用 OTA（免费无限）
❌ 避免不必要的重新构建（消耗配额）
```

### 2. 本地测试后再构建
```bash
# 先在本地测试
npm start

# 确认无误后再构建
eas build --platform android
```

### 3. 使用本地构建（不消耗配额）
```bash
# 本地构建 Android（需要 Android Studio）
eas build --platform android --local

# 不消耗云端构建配额
```

### 4. 合并多个更改后再构建
```
❌ 不好：每次小改动都构建
   - 添加功能 → 构建（消耗 1 次）
   - 修复 Bug → 构建（消耗 1 次）
   - 调整样式 → 构建（消耗 1 次）
   总计：3 次

✅ 好：合并后一次构建
   - 添加功能 + 修复 Bug + 调整样式
   - 一次性构建（消耗 1 次）
   总计：1 次
```

### 5. 使用预览构建测试
```bash
# 预览构建也消耗配额，但可以在正式发布前测试
eas build --platform android --profile preview
```

## 📊 配额使用建议

### 每月构建次数规划

假设你的项目：

#### 开发阶段（前3个月）
```
- 每周构建 2 次测试
- 每月约 8 次构建
- 免费额度：30 次/月
- 结论：完全够用 ✅
```

#### 稳定阶段（3个月后）
```
- 每月构建 2-3 次（发布新版本）
- 其他更新使用 OTA（无限次）
- 免费额度：30 次/月
- 结论：绰绰有余 ✅
```

#### 快速迭代阶段
```
- 每天构建 1 次
- 每月约 30 次构建
- 免费额度：30 次/月
- 结论：刚好够用 ⚠️
```

## 🎯 最佳实践

### 构建策略
```
┌─────────────────────────────────────────┐
│  代码变更                                │
└────────────┬────────────────────────────┘
             │
             ↓
      是否涉及原生代码？
             │
      ┌──────┴──────┐
      │             │
     是            否
      │             │
      ↓             ↓
  重新构建      使用 OTA
  (消耗配额)    (免费无限)
      │             │
      └──────┬──────┘
             │
             ↓
      发布给用户
```

### 更新频率建议
```
OTA 更新：
- 频率：随时可以
- 场景：Bug 修复、功能优化、配置更新
- 成本：$0

重新构建：
- 频率：每月 1-2 次
- 场景：大版本更新、添加原生功能
- 成本：免费额度内 $0
```

## 🔐 自托管方案（完全免费）

如果你想完全避免依赖 Expo 服务器，可以自建更新服务器：

### 方案：使用 expo-updates 自托管

#### 1. 配置 app.json
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "url": "https://your-server.com/api/manifest"
    }
  }
}
```

#### 2. 搭建更新服务器
```javascript
// 简单的 Express 服务器
const express = require('express');
const app = express();

app.get('/api/manifest', (req, res) => {
  res.json({
    id: 'update-id',
    createdAt: new Date().toISOString(),
    runtimeVersion: '1.0.0',
    launchAsset: {
      url: 'https://your-server.com/bundles/latest.bundle',
      contentType: 'application/javascript',
    },
    assets: [],
  });
});

app.listen(3000);
```

#### 3. 上传更新文件
```bash
# 导出更新包
npx expo export

# 上传到你的服务器
scp -r dist/* user@your-server:/var/www/updates/
```

**优点**：
- ✅ 完全免费
- ✅ 完全控制
- ✅ 无配额限制

**缺点**：
- ⚠️ 需要自己维护服务器
- ⚠️ 需要处理 CDN、签名等
- ⚠️ 配置复杂

## 📞 查看当前配额

运行以下命令查看你的配额使用情况：

```bash
# 查看账户信息
eas account:view

# 查看本月构建次数
eas build:list --limit 50

# 计算本月已使用次数
eas build:list --limit 50 | grep "$(date +%Y-%m)" | wc -l
```

或访问：https://expo.dev/accounts/standardinvestment/settings/billing

## 💰 费用对比

### 使用 Expo OTA vs 自建服务器

#### Expo OTA（推荐）
```
月费用：$0（免费计划）
维护成本：0 小时/月
可靠性：99.9%
CDN：全球加速
签名：自动处理
```

#### 自建服务器
```
服务器：$5-20/月
CDN：$10-50/月
维护成本：5-10 小时/月
可靠性：取决于你的配置
总成本：$15-70/月 + 时间成本
```

**结论：对于大多数项目，Expo 免费计划是最佳选择！**

## 🎓 总结

### 关键要点

1. **EAS Update（OTA）是免费且无限的** ✅
   - 发布次数：无限
   - 下载次数：无限
   - 带宽：无限

2. **EAS Build（构建）有配额限制** ⚠️
   - 免费：30 次/月（Android + iOS）
   - 超出：$0.05-0.10/次

3. **最佳策略** 🎯
   - 日常更新：使用 OTA（免费）
   - 大版本：重新构建（每月 1-2 次）
   - 本地测试：充分测试后再构建

4. **你的项目完全可以使用免费计划** 🎉
   - 更新服务器地址：OTA（免费）
   - 修复 Bug：OTA（免费）
   - 添加功能：OTA（免费）
   - 重新构建：每月 1-2 次（免费额度内）

### 推荐配置

```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,              // 启用 OTA
      "checkAutomatically": "ON_LOAD",  // 自动检查
      "fallbackToCacheTimeout": 0   // 立即使用新版本
    }
  }
}
```

**放心使用 Expo OTA，它是免费且无限的！** 🚀
