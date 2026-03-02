# 本地 Mock 数据管理说明

## 问题解决 ✅

已创建 `LocalMockService` 服务，解决 Mock 环境下用户数据不一致的问题。

## 工作原理

### 核心思想

在 Mock 环境下，将 Apifox 返回的随机数据保存到本地，下次请求时返回相同的数据，模拟真实服务器的行为。

### 数据流程

```
首次注册/登录
    ↓
Apifox Mock 返回随机数据
    ↓
LocalMockService 保存到本地
    ↓
返回给应用

再次登录
    ↓
Apifox Mock 返回新的随机数据
    ↓
LocalMockService 检测到用户已存在
    ↓
返回本地保存的数据（不是 Mock 的新数据）
    ↓
用户信息保持一致 ✅
```

## 功能特性

### 1. 用户数据持久化

- ✅ 首次注册：保存 Mock 返回的数据
- ✅ 再次登录：返回已保存的数据
- ✅ Token 登录：返回当前用户的数据
- ✅ 获取用户信息：返回已保存的数据

### 2. 多用户支持

- ✅ 支持多个用户（按用户名区分）
- ✅ 记录当前登录用户
- ✅ 退出登录后可以切换用户

### 3. 数据管理

- ✅ 查看所有本地用户
- ✅ 更新用户信息
- ✅ 清除所有数据（用于测试）

## 使用场景

### 场景 1：首次注册

```
1. 生成设备指纹
2. 调用 /app/user/auth/register
3. Apifox Mock 返回：用户名 "蔡芳"
4. LocalMockService 保存到本地
5. 进入应用，显示用户名 "蔡芳"
```

### 场景 2：退出登录后再次登录

```
1. 退出登录（清除 token）
2. 输入用户名 "蔡芳" 和密码
3. 调用 /app/user/auth/login
4. Apifox Mock 返回：用户名 "范振轩"（新的随机数据）
5. LocalMockService 检测到 "蔡芳" 已存在
6. 返回本地保存的 "蔡芳" 的数据
7. 进入应用，显示用户名 "蔡芳" ✅（不是 "范振轩"）
```

### 场景 3：Token 自动登录

```
1. 应用启动，检测到 token
2. 调用 /app/user/auth/token-login
3. Apifox Mock 返回：用户名 "茹振东"（新的随机数据）
4. LocalMockService 检测到当前用户是 "蔡芳"
5. 返回本地保存的 "蔡芳" 的数据
6. 进入应用，显示用户名 "蔡芳" ✅（不是 "茹振东"）
```

### 场景 4：获取用户信息

```
1. 进入设置页面
2. 调用 /app/user/profile/me
3. Apifox Mock 返回：昵称 "戎呈轩"（新的随机数据）
4. LocalMockService 返回本地保存的数据
5. 显示正确的昵称 ✅（不是 "戎呈轩"）
```

## 数据存储

### AsyncStorage 存储的数据

| 键名 | 说明 | 示例 |
|------|------|------|
| `localMockUsers` | 所有用户数据 | `{"蔡芳": {...}, "范振轩": {...}}` |
| `localMockCurrentUser` | 当前登录用户名 | `"蔡芳"` |

### 用户数据结构

```json
{
  "蔡芳": {
    "userId": 63,
    "username": "蔡芳",
    "nickName": "勇敬阳",
    "avatar": "https://avatars.githubusercontent.com/u/31439412",
    "userLevel": 1,
    "verified": 0,
    "signature": "热爱编程",
    "profession": "软件工程师",
    "location": "北京",
    "questionCount": 10,
    "answerCount": 20,
    "acceptedCount": 5,
    "followCount": 30,
    "fanCount": 40,
    "likeCount": 50,
    "_savedAt": 1709012345678
  }
}
```

## API 集成

### 已集成的接口

1. **注册接口** (`/app/user/auth/register`)
   ```javascript
   const processedResponse = USE_MOCK 
     ? await LocalMockService.handleRegisterResponse(response)
     : response;
   ```

2. **登录接口** (`/app/user/auth/login`)
   ```javascript
   const processedResponse = USE_MOCK 
     ? await LocalMockService.handleLoginResponse(username, response)
     : response;
   ```

3. **Token 登录接口** (`/app/user/auth/token-login`)
   ```javascript
   const processedResponse = USE_MOCK 
     ? await LocalMockService.handleTokenLoginResponse(response)
     : response;
   ```

4. **获取用户信息接口** (`/app/user/profile/me`)
   ```javascript
   const processedResponse = USE_MOCK 
     ? await LocalMockService.handleGetProfileResponse(response)
     : response;
   ```

## 调试工具

### 查看所有本地用户

在代码中调用：
```javascript
await LocalMockService.debugPrintUsers();
```

输出：
```
🔍 本地 Mock 用户数据库:
   当前登录用户: 蔡芳
   所有用户: ["蔡芳", "范振轩"]
   详细数据: {...}
```

### 清除所有数据

```javascript
await LocalMockService.clearAll();
```

或者清除应用数据：
```bash
adb shell pm clear com.qa.app
```

## 测试流程

### 测试登录逻辑

1. **首次注册**
   ```bash
   adb shell pm clear com.qa.app
   # 启动应用，自动注册
   # 记录用户名，例如 "蔡芳"
   ```

2. **退出登录**
   ```
   # 在应用中点击"退出登录"
   ```

3. **再次登录**
   ```
   # 输入用户名 "蔡芳" 和密码 "12345678"
   # 验证：用户信息应该与首次注册时一致 ✅
   ```

4. **Token 自动登录**
   ```
   # 关闭应用
   # 重新打开应用
   # 验证：自动登录，用户信息保持一致 ✅
   ```

5. **查看用户信息**
   ```
   # 进入设置页面
   # 验证：用户信息保持一致 ✅
   ```

## 优势

### 1. 完全模拟真实环境

- ✅ 同一个用户名登录，永远返回同一个用户的数据
- ✅ Token 登录返回当前用户的数据
- ✅ 可以正常测试退出登录、重新登录等流程

### 2. 不依赖 Apifox 配置

- ✅ 不需要在 Apifox 中配置固定数据
- ✅ 不需要手动管理 Mock 期望
- ✅ 完全由前端代码控制

### 3. 易于测试

- ✅ 可以测试多用户场景
- ✅ 可以清除数据重新测试
- ✅ 可以查看所有用户数据

### 4. 真实环境无影响

- ✅ 只在 Mock 环境下生效
- ✅ 真实环境直接返回服务器数据
- ✅ 不需要修改生产代码

## 注意事项

### 1. 仅在 Mock 环境下生效

```javascript
const processedResponse = USE_MOCK 
  ? await LocalMockService.handleLoginResponse(username, response)
  : response;  // 真实环境直接返回
```

### 2. 数据存储在本地

- 清除应用数据会丢失所有本地 Mock 用户
- 卸载应用会丢失所有数据
- 不同设备的数据不同步

### 3. 首次数据来自 Apifox

- 首次注册/登录时，数据仍然是 Apifox Mock 返回的随机数据
- 但之后的请求会返回相同的数据

## 切换到真实环境

当服务器准备好后，只需修改一行代码：

```javascript
// src/config/env.js
const USE_MOCK = false;  // 改为 false
```

所有 `LocalMockService` 的逻辑会自动跳过，直接使用服务器返回的数据。

## 总结

✅ 解决了 Mock 环境下用户数据不一致的问题  
✅ 可以正常测试登录、退出、重新登录等流程  
✅ 完全模拟真实服务器的行为  
✅ 不依赖 Apifox 配置  
✅ 易于测试和调试  
✅ 真实环境无影响
