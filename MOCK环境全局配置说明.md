# Mock 环境全局配置说明

## 配置完成 ✅

已在 `src/services/api/apiClient.js` 中添加全局 Mock 环境处理，所有 API 接口都会自动支持 Mock 环境。

## 工作原理

### 响应拦截器自动处理

在 `apiClient.js` 的响应拦截器中：

```javascript
// Mock 环境特殊处理：标准化响应格式
if (USE_MOCK && responseData) {
  // 如果在 Mock 环境下，且响应有 data 字段，则认为请求成功
  // 将 code 标准化为 200，方便业务代码判断
  if (responseData.data !== undefined) {
    return {
      ...responseData,
      code: 200,  // 标准化为 200
      _originalCode: responseData.code,  // 保留原始 code 供调试
      _isMockResponse: true,  // 标记为 Mock 响应
    };
  }
}
```

### 处理流程

1. **Mock 环境** (`USE_MOCK = true`)
   - 检测到响应中有 `data` 字段
   - 自动将 `code` 标准化为 `200`
   - 保留原始 `code` 到 `_originalCode` 字段
   - 添加 `_isMockResponse: true` 标记

2. **真实环境** (`USE_MOCK = false`)
   - 不做任何修改
   - 直接返回服务器的原始响应

## 优势

### 1. 全局生效
- ✅ 所有通过 `apiClient` 发送的请求都会自动处理
- ✅ 不需要在每个 API 文件中单独判断
- ✅ 不需要在业务代码中修改判断逻辑

### 2. 业务代码无感知
业务代码中仍然使用标准判断：
```javascript
if (response.code === 200) {
  // 处理成功逻辑
}
```

在 Mock 环境下，`code` 会被自动标准化为 `200`，业务代码无需修改。

### 3. 调试友好
- 保留原始 `code` 到 `_originalCode`
- 添加 `_isMockResponse` 标记
- 开发环境会打印日志

### 4. 易于切换
只需修改 `src/config/env.js` 中的 `USE_MOCK`：
```javascript
const USE_MOCK = true;   // Mock 环境
const USE_MOCK = false;  // 真实环境
```

## 影响范围

### 已覆盖的 API 文件

所有使用 `apiClient` 的 API 文件都会自动支持：

- ✅ `src/services/api/authApi.js` - 认证相关
- ✅ `src/services/api/userApi.js` - 用户相关
- ✅ `src/services/api/questionApi.js` - 问题相关
- ✅ `src/services/api/answerApi.js` - 回答相关
- ✅ `src/services/api/activityApi.js` - 活动相关
- ✅ `src/services/api/teamApi.js` - 团队相关
- ✅ `src/services/api/twitterApi.js` - Twitter 相关
- ✅ 所有其他 API 文件

### 未覆盖的情况

如果某些代码直接使用 `axios` 而不是 `apiClient`，则不会自动处理。建议统一使用 `apiClient`。

## 示例

### Mock 环境响应

**Apifox Mock 返回**：
```json
{
  "code": 86,  // 随机生成
  "msg": "do",
  "data": {
    "username": "TestUser",
    "token": "abc123"
  }
}
```

**经过拦截器处理后**：
```json
{
  "code": 200,  // 自动标准化
  "msg": "do",
  "data": {
    "username": "TestUser",
    "token": "abc123"
  },
  "_originalCode": 86,  // 保留原始值
  "_isMockResponse": true  // Mock 标记
}
```

**业务代码判断**：
```javascript
if (response.code === 200) {  // ✅ 判断通过
  console.log('成功！');
}
```

### 真实环境响应

**服务器返回**：
```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "username": "TestUser",
    "token": "abc123"
  }
}
```

**经过拦截器处理后**：
```json
{
  "code": 200,  // 保持不变
  "msg": "注册成功",
  "data": {
    "username": "TestUser",
    "token": "abc123"
  }
}
```

## 调试信息

在开发环境下，控制台会显示：

```
🔧 Mock 环境：检测到 data 字段，标准化 code 为 200
   原始 code: 86
```

这样可以清楚地看到 Mock 环境的处理过程。

## 注意事项

### 1. Mock 环境的局限性

Mock 环境只能测试成功流程，无法测试：
- ❌ 参数验证失败
- ❌ 权限不足
- ❌ 服务器错误
- ❌ 网络超时

这些场景需要在真实环境中测试。

### 2. 切换环境

从 Mock 环境切换到真实环境时：
1. 修改 `USE_MOCK = false`
2. 重启开发服务器
3. 清除应用数据（可选）

### 3. 生产构建

生产构建时，建议：
1. 确保 `USE_MOCK = false`
2. 或者在代码中添加判断，生产环境强制使用真实服务器

## 总结

✅ 全局配置完成，所有 API 接口自动支持 Mock 环境  
✅ 业务代码无需修改，保持 `response.code === 200` 判断  
✅ 通过 `USE_MOCK` 开关即可切换环境  
✅ 调试友好，保留原始数据供查看  
✅ 易于维护，集中管理 Mock 逻辑
