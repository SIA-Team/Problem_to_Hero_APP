# HomeScreen 优化实施指南

## 📋 概述

本指南说明如何在原版 HomeScreen.js 中实施今日头条的核心优化策略，**不改变任何样式和功能**。

## 🎯 优化策略

### 已实现的核心功能

1. **多级缓存系统** (`src/utils/cacheManager.js`)
   - 内存缓存（5分钟有效期）
   - AsyncStorage 缓存（1小时有效期）
   - 自动清理过期缓存

2. **智能数据加载** (`src/utils/dataLoader.js`)
   - 缓存优先加载
   - Tab 预加载
   - 智能分页
   - 防抖和去重

3. **优化 Hook** (`src/hooks/useOptimizedQuestions.js`)
   - 封装所有优化逻辑
   - 简单易用的 API
   - 自动刷新检测

## 🔧 实施步骤

### 步骤 1: 在 HomeScreen.js 中引入优化 Hook

在 HomeScreen.js 的顶部添加导入：

```javascript
import { useOptimizedQuestions } from '../hooks/useOptimizedQuestions';
```

### 步骤 2: 替换现有的状态管理

找到这些代码（大约在第 90-100 行）：

```javascript
// 原有代码
const [questionList, setQuestionList] = useState(questions);
const [refreshing, setRefreshing] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [page, setPage] = useState(1);
```

替换为：

```javascript
// 使用优化 Hook
const {
  questionList,
  loading,
  refreshing,
  loadingMore,
  hasMore,
  hasNewContent,
  onRefresh,
  onLoadMore,
  onTabChange,
  setQuestionList, // 保留，以便其他功能可以手动更新列表
} = useOptimizedQuestions(activeTab, tabs);

// 保留 page 状态（如果其他地方需要）
const [page, setPage] = useState(1);
```

### 步骤 3: 删除或注释掉原有的加载函数

找到并注释掉这些函数（大约在第 200-250 行）：

```javascript
// 注释掉原有的下拉刷新函数
/*
const onRefresh = async () => {
  setRefreshing(true);
  setTimeout(() => {
    setQuestionList(questions);
    setPage(1);
    setHasMore(true);
    setRefreshing(false);
  }, 1500);
};
*/

// 注释掉原有的上拉加载函数
/*
const onLoadMore = async () => {
  if (loadingMore || !hasMore) return;
  
  setLoadingMore(true);
  setTimeout(() => {
    const nextPage = page + 1;
    const moreData = questions.map((item, index) => ({
      ...item,
      id: item.id + nextPage * 100 + index,
    }));
    
    setQuestionList([...questionList, ...moreData]);
    setPage(nextPage);
    
    if (nextPage >= 3) {
      setHasMore(false);
    }
    
    setLoadingMore(false);
  }, 1500);
};
*/
```

### 步骤 4: 添加 Tab 切换监听

找到 Tab 切换的代码（大约在第 600-700 行），添加 `onTabChange` 调用：

```javascript
// 在 Tab 点击处理函数中
const handleTabPress = (tab) => {
  setActiveTab(tab);
  onTabChange(tab); // 添加这一行
};
```

或者使用 useEffect 监听：

```javascript
// 在组件中添加
useEffect(() => {
  if (activeTab) {
    onTabChange(activeTab);
  }
}, [activeTab, onTabChange]);
```

### 步骤 5: 添加"有新内容"提示（可选）

在列表顶部添加新内容提示（大约在第 800 行，列表渲染之前）：

```javascript
{/* 新内容提示 */}
{hasNewContent && (
  <TouchableOpacity
    style={styles.newContentBanner}
    onPress={onRefresh}
  >
    <Ionicons name="arrow-up-circle" size={16} color="#ef4444" />
    <Text style={styles.newContentText}>有新内容，点击刷新</Text>
  </TouchableOpacity>
)}
```

添加对应的样式（在 styles 对象中）：

```javascript
newContentBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fef2f2',
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginHorizontal: 16,
  marginBottom: 8,
  gap: 6,
},
newContentText: {
  fontSize: 13,
  color: '#ef4444',
  fontWeight: '500',
},
```

## 📝 完整示例

### 修改前（原有代码）

```javascript
export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  
  // 原有状态
  const [questionList, setQuestionList] = useState(questions);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // 原有的下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setQuestionList(questions);
      setPage(1);
      setHasMore(true);
      setRefreshing(false);
    }, 1500);
  };
  
  // 原有的上拉加载
  const onLoadMore = async () => {
    if (loadingMore || !hasMo