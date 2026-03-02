# Apifox Mock 环境配置说明

## 配置完成 ✅

已成功配置 Apifox Mock 环境地址：`https://m1.apifoxmock.com/m1/7857964-7606903-default`

## 如何切换到 Apifox Mock 环境

### 方法：修改 `src/config/env.js`

打开 `src/config/env.js` 文件，将 `USE_MOCK` 设置为 `true`：

```javascript
const USE_MOCK = true;  // 改为 true 即可切换到 Apifox Mock 环境
```

保存后重启开发服务器，应用将自动使用 Apifox Mock 环境。

## 环境优先级

配置文件中的环境判断优先级如下：

1. **Mock 环境** (`USE_MOCK = true`) - 最高优先级
2. **模拟生产环境** (`SIMULATE_PRODUCTION = true`)
3. **开发环境** (`__DEV__ = true`)
4. **Staging/Production** (通过 releaseChannel 判断)

## 关于 Proxy 代理配置

### ❌ React Native 不需要配置 proxy

**重要说明**：

- **Proxy 是浏览器/Web 开发的概念**，用于解决浏览器的同源策略（CORS）限制
- **React Native 应用直接发送 HTTP 请求**，不经过浏览器，因此：
  - ✅ 没有跨域问题
  - ✅ 不需要配置 proxy
  - ✅ 可以直接请求任何域名的 API

### 为什么 Web 需要 proxy 而 React Native 不需要？

| 特性 | Web 应用 | React Native 应用 |
|------|---------|------------------|
| 运行环境 | 浏览器 | 原生应用 |
| 网络请求 | 受浏览器同源策略限制 | 直接发送 HTTP 请求 |
| 跨域问题 | 有（需要 CORS 或 proxy） | 无 |
| Proxy 配置 | 需要（开发环境） | 不需要 |

### 示例对比

**Web 应用（需要 proxy）：**
```javascript
// package.json
{
  "proxy": "https://api.example.com"  // 开发环境代理
}
```

**React Native 应用（不需要 proxy）：**
```javascript
// src/config/env.js
const ENV = {
  dev: {
    apiUrl: 'https://api.example.com'  // 直接配置即可
  }
}
```

## 当前项目配置

### 已配置的环境

```javascript
const ENV = {
  dev: {
    apiUrl: 'http://123.144.100.10:30560/qa-hero-app-user',
  },
  staging: {
    apiUrl: 'http://123.144.100.10:30560/qa-hero-app-user',
  },
  prod: {
    apiUrl: 'http://123.144.100.10:30560/qa-hero-app-user',
  },
  mock: {
    apiUrl: 'https://m1.apifoxmock.com/m1/7857964-7606903-default',  // ✅ 新增
  }
};
```

### 切换环境的方式

| 环境 | 配置方式 | 用途 |
|------|---------|------|
| Mock | `USE_MOCK = true` | 前端独立开发，使用 Apifox Mock 数据 |
| 模拟生产 | `SIMULATE_PRODUCTION = true` | 开发环境测试生产逻辑 |
| 开发 | 默认（`__DEV__ = true`） | 正常开发 |
| 生产 | EAS Build | 发布生产版本 |

## 使用建议

1. **前端独立开发**：设置 `USE_MOCK = true`，使用 Apifox Mock 数据
2. **联调测试**：设置 `USE_MOCK = false` 和 `SIMULATE_PRODUCTION = false`，连接真实服务器
3. **生产环境测试**：设置 `SIMULATE_PRODUCTION = true`，模拟生产环境行为
4. **发布生产版本**：运行 `eas build`，自动使用生产配置

## 验证配置

启动应用后，查看控制台输出：

- `🔧 使用 Apifox Mock 环境` - 表示正在使用 Mock 环境
- `🎭 使用生产环境配置（模拟模式）` - 表示正在模拟生产环境
- 其他 - 表示使用开发环境

## 注意事项

1. **Mock 环境仅用于开发**：生产构建时会自动忽略 Mock 配置
2. **不要提交 `USE_MOCK = true`**：切换到 Mock 环境后记得改回 `false` 再提交代码
3. **Apifox Mock 地址可能变化**：如果 Apifox 项目更新，需要同步更新 `ENV.mock.apiUrl`

## 总结

✅ 已配置 Apifox Mock 环境  
✅ 不需要配置 proxy（React Native 无跨域问题）  
✅ 通过 `USE_MOCK` 开关即可切换环境  
✅ 支持多环境灵活切换
