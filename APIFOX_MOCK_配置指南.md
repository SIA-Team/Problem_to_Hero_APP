# Apifox Mock 配置指南

## 问题说明

当前 Apifox Mock 返回的数据中，`code` 字段是随机生成的（例如 `86`），但应用代码要求 `code` 必须为 `200` 才认为请求成功。

## 需要配置的接口

### 1. 设备指纹注册接口

**接口路径**: `/app/user/auth/register`  
**请求方式**: `POST`

#### 当前 Mock 返回（错误）：
```json
{
  "code": 86,  // ❌ 随机生成，导致应用判断失败
  "msg": "do",
  "data": {
    "username": "佼秀兰",
    "token": "ea ex pariatur ut",
    "expiresIn": 39,
    "userBaseInfo": {
      "userId": 62,
      "username": "商芳",
      "nickName": "茂政君",
      "avatar": "https://avatars.githubusercontent.com/u/90138990",
      "userLevel": 57,
      "verified": 93,
      "signature": "aute proident",
      "profession": "nulla occaecat",
      "location": "officia est in dolor",
      "questionCount": 100,
      "answerCount": 74,
      "acceptedCount": 31,
      "followCount": 12,
      "fanCount": 84,
      "likeCount": 8
    }
  }
}
```

#### 需要配置的 Mock 返回（正确）：
```json
{
  "code": 200,  // ✅ 固定为 200
  "msg": "注册成功",
  "data": {
    "username": "@string",
    "token": "@string(50)",
    "expiresIn": 720,
    "userBaseInfo": {
      "userId": "@integer(1000000000000000000, 9999999999999999999)",
      "username": "@string",
      "nickName": "@cname",
      "avatar": "https://avatars.githubusercontent.com/u/@integer(10000000, 99999999)",
      "userLevel": "@integer(0, 10)",
      "verified": "@integer(0, 1)",
      "signature": "@csentence",
      "profession": "@ctitle",
      "location": "@city",
      "questionCount": "@integer(0, 100)",
      "answerCount": "@integer(0, 100)",
      "acceptedCount": "@integer(0, 50)",
      "followCount": "@integer(0, 1000)",
      "fanCount": "@integer(0, 1000)",
      "likeCount": "@integer(0, 1000)"
    }
  }
}
```

### 2. Token 自动登录接口

**接口路径**: `/app/user/auth/token-login`  
**请求方式**: `POST`

#### 需要配置的 Mock 返回：
```json
{
  "code": 200,  // ✅ 固定为 200
  "msg": "登录成功",
  "data": {
    "username": "@string",
    "token": "@string(50)",
    "expiresIn": 720,
    "userBaseInfo": {
      "userId": "@integer(1000000000000000000, 9999999999999999999)",
      "username": "@string",
      "nickName": "@cname",
      "avatar": "https://avatars.githubusercontent.com/u/@integer(10000000, 99999999)",
      "userLevel": "@integer(0, 10)",
      "verified": "@integer(0, 1)",
      "signature": "@csentence",
      "profession": "@ctitle",
      "location": "@city",
      "questionCount": "@integer(0, 100)",
      "answerCount": "@integer(0, 100)",
      "acceptedCount": "@integer(0, 50)",
      "followCount": "@integer(0, 1000)",
      "fanCount": "@integer(0, 1000)",
      "likeCount": "@integer(0, 1000)"
    }
  }
}
```

## Apifox 配置步骤

### 方法一：使用高级 Mock（推荐）

1. 打开 Apifox，找到对应的接口
2. 点击「Mock」标签
3. 选择「高级 Mock」
4. 点击「添加期望」
5. 配置期望规则：
   - **期望名称**: 成功响应
   - **匹配规则**: 默认（匹配所有请求）
   - **返回数据**: 粘贴上面的 JSON 配置
6. 保存期望

### 方法二：修改接口定义

1. 打开 Apifox，找到对应的接口
2. 点击「修改文档」
3. 找到「返回响应」部分
4. 编辑响应示例，将 `code` 字段的 Mock 规则改为：
   ```
   @integer(200, 200)  // 固定返回 200
   ```
   或者直接写死：
   ```
   200
   ```
5. 保存修改

### 方法三：使用自定义脚本

1. 打开 Apifox，找到对应的接口
2. 点击「Mock」标签
3. 选择「自定义脚本」
4. 添加以下脚本：

```javascript
// 后置操作：修改响应数据
pm.response.json.code = 200;
pm.response.json.msg = "注册成功";
```

5. 保存脚本

## 验证配置

配置完成后，可以在 Apifox 中测试接口：

1. 点击「发送」按钮
2. 查看响应数据中的 `code` 字段
3. 确认 `code` 为 `200`

## 其他需要配置的接口

所有需要返回成功状态的接口都应该配置 `code: 200`：

- `/app/user/auth/login` - 用户登录
- `/app/user/auth/register` - 用户注册
- `/app/user/auth/token-login` - Token 自动登录
- `/app/user/profile` - 获取用户信息
- `/app/user/profile/avatar` - 上传头像
- 其他所有接口...

## 统一配置建议

为了避免每个接口都单独配置，建议：

1. **在项目设置中配置全局 Mock 规则**
   - 打开「项目设置」→「Mock 设置」
   - 配置全局响应格式
   - 设置 `code` 字段默认为 `200`

2. **使用环境变量**
   - 在 Apifox 中创建环境变量 `SUCCESS_CODE = 200`
   - 在 Mock 配置中使用 `{{SUCCESS_CODE}}`

3. **使用 Mock 模板**
   - 创建一个成功响应的模板
   - 所有接口都引用这个模板

## 注意事项

1. **code 字段必须是数字类型**，不能是字符串
   - ✅ 正确: `"code": 200`
   - ❌ 错误: `"code": "200"`

2. **data 字段必须存在**，即使是空对象
   - ✅ 正确: `"data": {}`
   - ❌ 错误: `"data": null`

3. **token 字段必须是字符串**
   - ✅ 正确: `"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
   - ❌ 错误: `"token": null`

## 配置完成后

配置完成后，重新加载应用（在开发服务器中按 `r` 键），应用应该能够：

1. 自动注册成功
2. 保存 token 和用户信息
3. 直接进入应用主界面
4. 不再显示登录页面

## 遇到问题？

如果配置后仍然失败，请检查：

1. Apifox Mock 服务是否已启动
2. Mock 地址是否正确：`https://m1.apifoxmock.com/m1/7857964-7606903-default`
3. 应用中的 `USE_MOCK` 是否设置为 `true`
4. 查看应用控制台日志，确认请求是否发送到 Mock 地址
5. 在 Apifox 中查看「Mock 日志」，确认请求是否到达

## 联系支持

如果需要帮助，可以：
- 查看 Apifox 官方文档：https://apifox.com/help/
- 联系 Apifox 客服
- 在团队中询问后端开发人员
