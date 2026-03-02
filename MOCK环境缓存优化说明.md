# Mock 环境缓存优化说明

## 问题描述

在 Mock 环境下，每次进入设置页面时，用户信息都会被重新生成（昵称、头像等都变了）。

### 原因分析

1. **Mock 数据是随机生成的**
   - Apifox Mock 每次请求都返回新的随机数据
   - 用户名、昵称、头像等字段都是随机生成的

2. **缓存策略过于激进**
   - 设置页面使用了"启动时读缓存 + 后台刷新"策略
   - 每次进入页面都会后台请求最新数据
   - Mock 环境下，"最新数据"实际上是新的随机数据

## 解决方案

### 优化缓存策略

在 `src/services/UserCacheService.js` 中针对 Mock 环境进行优化：

#### 1. 延长缓存过期时间

```javascript
// 缓存过期时间
// Mock 环境：24小时（避免频繁刷新导致数据变化）
// 真实环境：30分钟
static CACHE_EXPIRY = USE_MOCK ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
```

#### 2. 减少刷新频率

```javascript
// Mock 环境：检查缓存是否过期，未过期则不刷新
if (USE_MOCK) {
  const isExpired = await this.isCacheExpired();
  if (!isExpired && cachedProfile) {
    console.log('🔧 Mock 环境：使用缓存数据，跳过刷新');
    return;
  }
  console.log('🔧 Mock 环境：缓存已过期或不存在，刷新数据');
}
```

## 效果

### Mock 环境

- ✅ 首次进入设置页面：从服务器获取数据并缓存
- ✅ 再次进入设置页面：使用缓存数据，不刷新
- ✅ 24小时内：用户信息保持一致
- ✅ 24小时后：缓存过期，重新获取（会变成新的随机数据）

### 真实环境

- ✅ 首次进入设置页面：从服务器获取数据并缓存
- ✅ 再次进入设置页面：显示缓存 + 后台刷新最新数据
- ✅ 30分钟内：优先使用缓存，后台静默更新
- ✅ 30分钟后：缓存过期，重新获取

## 使用场景

### 场景 1：开发调试（Mock 环境）

```javascript
// src/config/env.js
const USE_MOCK = true;
```

- 用户信息在 24 小时内保持一致
- 可以正常测试修改昵称、头像等功能
- 不会因为页面切换导致数据变化

### 场景 2：真实环境测试

```javascript
// src/config/env.js
const USE_MOCK = false;
```

- 用户信息实时同步
- 30 分钟缓存，保证数据新鲜度
- 后台静默刷新，用户体验流畅

## 清除缓存

如果在 Mock 环境下想要重新生成用户数据，可以：

### 方法 1：清除应用数据

```bash
adb shell pm clear com.qa.app
```

### 方法 2：等待缓存过期

24 小时后自动过期，下次进入会获取新数据

### 方法 3：修改代码强制刷新

临时修改 `UserCacheService.js`：

```javascript
// 临时禁用缓存检查
if (USE_MOCK) {
  // const isExpired = await this.isCacheExpired();
  const isExpired = true;  // 强制刷新
  if (!isExpired && cachedProfile) {
    // ...
  }
}
```

## 其他优化建议

### 1. 配置 Apifox Mock 返回固定数据

如果希望 Mock 数据完全固定，可以在 Apifox 中配置：

- 使用「高级 Mock」添加期望
- 设置固定的用户数据
- 不使用 `@string`、`@cname` 等随机规则

### 2. 使用本地 Mock 数据

创建本地 Mock 数据文件：

```javascript
// src/mocks/userData.js
export const mockUserData = {
  userId: 123456,
  username: "testuser",
  nickName: "测试用户",
  avatar: "https://example.com/avatar.jpg",
  // ...
};
```

在 Mock 环境下直接返回本地数据，不请求服务器。

## 注意事项

1. **Mock 环境仅用于开发**
   - 生产构建时确保 `USE_MOCK = false`
   - 或者在构建时自动设置为 false

2. **缓存时间的权衡**
   - Mock 环境：24小时（稳定性优先）
   - 真实环境：30分钟（新鲜度优先）

3. **数据一致性**
   - Mock 环境下，修改用户信息后，缓存会更新
   - 但下次清除缓存后，会恢复成新的随机数据

## 总结

✅ Mock 环境下用户信息保持 24 小时稳定  
✅ 真实环境下保持 30 分钟缓存策略  
✅ 自动根据环境调整缓存行为  
✅ 不影响正常的数据更新功能  
✅ 提升 Mock 环境下的开发体验
