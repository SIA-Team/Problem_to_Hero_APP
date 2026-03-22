# 评论提示统一使用 Toast 完成

## 修改概述
将评论发布成功的提示从自定义弹窗改为使用 `showToast`，与补充问题和回答的提示方式保持一致。

## 修改原因
1. **保持一致性**：补充问题和回答都使用 `showToast` 提示
2. **用户体验更好**：Toast 提示不会阻断用户操作，更加轻量
3. **代码更简洁**：不需要额外的 Modal 组件和样式定义

## 修改内容

### 1. 移除状态管理
删除了不再需要的状态：
```javascript
// 删除
const [showCommentSuccessModal, setShowCommentSuccessModal] = useState(false);
```

### 2. 修改评论发布逻辑
将自定义弹窗改为 `showToast`：

**修改前：**
```javascript
if (commentText.trim()) {
  setShowCommentSuccessModal(true);
  setCommentText('');
  setShowCommentModal(false);
}
```

**修改后：**
```javascript
if (commentText.trim()) {
  showToast('评论发布成功', 'success');
  setCommentText('');
  setShowCommentModal(false);
}
```

### 3. 删除自定义弹窗组件
移除了整个评论成功弹窗的 Modal 组件（约30行代码）

### 4. 删除样式定义
移除了不再需要的样式：
- `paidAlertOverlay`
- `paidAlertModal`
- `paidAlertHeader`
- `paidAlertTitle`
- `paidAlertDesc`
- `paidAlertConfirmText`
- `commentSuccessConfirmBtn`

### 5. 删除不必要的导入
移除了 `modalTokens` 的导入：
```javascript
// 删除
import { modalTokens } from '../components/modalTokens';
```

## 提示方式对比

### 补充问题发布成功
```javascript
showToast('补充问题发布成功', 'success');
```

### 回答发布成功
```javascript
showToast('回答发布成功', 'success');
```

### 评论发布成功（现在）
```javascript
showToast('评论发布成功', 'success');
```

## 用户体验改进

### 改进前：
- ❌ 使用自定义弹窗
- ❌ 需要点击"确定"按钮关闭
- ❌ 阻断用户操作
- ❌ 与其他提示不一致

### 改进后：
- ✅ 使用 Toast 提示
- ✅ 自动消失，无需手动关闭
- ✅ 不阻断用户操作
- ✅ 与补充、回答提示保持一致
- ✅ 代码更简洁，减少约 80 行代码

## Toast 提示特点

1. **轻量级**：不会阻断用户操作
2. **自动消失**：2秒后自动隐藏
3. **视觉统一**：所有成功提示都使用相同的样式
4. **位置固定**：显示在屏幕顶部，不遮挡内容

## 代码简化统计

- 删除状态变量：1 个
- 删除 Modal 组件：约 30 行
- 删除样式定义：约 50 行
- 删除导入语句：1 行
- **总计减少代码：约 82 行**

## 功能保持不变
✅ 评论发布逻辑完全不变
✅ 只修改了成功提示的展示方式
✅ 功能行为与之前完全一致

## 测试建议
1. 在问题详情页面点击评论按钮
2. 输入评论内容
3. 点击发布按钮
4. 验证是否显示绿色的 Toast 提示："评论发布成功"
5. 验证 Toast 是否在 2 秒后自动消失
6. 验证评论是否正常发布

## 文件修改
- `src/screens/QuestionDetailScreen.js`
  - 删除状态：`showCommentSuccessModal`
  - 修改发布逻辑：使用 `showToast` 替代自定义弹窗
  - 删除 Modal 组件：评论成功提示弹窗
  - 删除样式：付费弹窗相关样式
  - 删除导入：`modalTokens`

## 与其他提示的一致性

现在所有的发布成功提示都使用相同的方式：

| 操作 | 提示方式 | 提示文本 |
|------|---------|---------|
| 发布补充问题 | `showToast` | 补充问题发布成功 |
| 发布回答 | `showToast` | 回答发布成功 |
| 发布评论 | `showToast` | 评论发布成功 |

所有提示都是：
- 绿色背景（success 类型）
- 2 秒后自动消失
- 显示在屏幕顶部
- 不阻断用户操作
