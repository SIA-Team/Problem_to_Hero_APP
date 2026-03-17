/**
 * 调试补充列表接口数据结构
 * 
 * 模拟调用 /app/content/supplement/question/{questionId}/list 接口
 * 并显示返回的数据结构
 */

const axios = require('axios');

// 模拟的补充列表数据结构（基于常见的API设计）
const mockSupplementListResponse = {
  code: 200,
  msg: "success",
  data: [
    {
      id: 456,
      content: "这是一条补充回答的内容，提供了更多的详细信息...",
      questionId: 123,
      userId: 789,
      author: {
        id: 789,
        username: "张三",
        avatar: "https://example.com/avatar1.jpg",
        level: 5
      },
      likes: 15,
      dislikes: 2,
      bookmarks: 8,
      shares: 3,
      views: 120,
      
      // 当前用户的操作状态
      isLiked: false,        // 是否已点赞
      isDisliked: false,     // 是否已点踩
      isBookmarked: true,    // 是否已收藏
      
      // 时间信息
      createdAt: "2024-03-15T10:30:00Z",
      updatedAt: "2024-03-15T10:30:00Z",
      
      // 其他可能的字段
      type: 1,               // 补充类型
      status: 1,             // 状态
      images: [              // 图片列表
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      tags: ["技术", "编程"], // 标签
      
      // 可能的其他命名方式
      liked: false,          // 另一种点赞状态字段名
      disliked: false,       // 另一种点踩状态字段名
      bookmarked: true,      // 另一种收藏状态字段名
      collected: true        // 另一种收藏状态字段名
    },
    {
      id: 457,
      content: "另一条补充回答，包含不同的观点和解决方案...",
      questionId: 123,
      userId: 890,
      author: {
        id: 890,
        username: "李四",
        avatar: "https://example.com/avatar2.jpg",
        level: 3
      },
      likes: 8,
      dislikes: 1,
      bookmarks: 5,
      shares: 2,
      views: 85,
      
      isLiked: true,
      isDisliked: false,
      isBookmarked: false,
      
      createdAt: "2024-03-14T15:20:00Z",
      updatedAt: "2024-03-14T15:20:00Z",
      
      type: 1,
      status: 1,
      images: [],
      tags: ["解决方案"],
      
      liked: true,
      disliked: false,
      bookmarked: false,
      collected: false
    }
  ]
};

console.log('🔍 ==================== 补充列表接口数据结构 ====================\n');

console.log('📊 接口信息:');
console.log('  路径: /app/content/supplement/question/{questionId}/list');
console.log('  方法: GET');
console.log('  参数: questionId (路径参数), sortBy, page, pageSize');
console.log('');

console.log('📥 返回数据结构:');
console.log(JSON.stringify(mockSupplementListResponse, null, 2));
console.log('');

console.log('📋 ==================== 数据字段分析 ====================\n');

if (mockSupplementListResponse.data && mockSupplementListResponse.data.length > 0) {
  const firstItem = mockSupplementListResponse.data[0];
  
  console.log('📄 单条补充数据字段:');
  console.log('');
  
  console.log('🆔 基础信息:');
  console.log('  id:', firstItem.id, '(补充ID)');
  console.log('  content:', firstItem.content ? '存在' : '不存在', '(补充内容)');
  console.log('  questionId:', firstItem.questionId, '(所属问题ID)');
  console.log('  userId:', firstItem.userId, '(作者用户ID)');
  console.log('');
  
  console.log('👤 作者信息:');
  console.log('  author.id:', firstItem.author?.id);
  console.log('  author.username:', firstItem.author?.username);
  console.log('  author.avatar:', firstItem.author?.avatar);
  console.log('  author.level:', firstItem.author?.level);
  console.log('');
  
  console.log('📊 统计数据:');
  console.log('  likes:', firstItem.likes, '(点赞数)');
  console.log('  dislikes:', firstItem.dislikes, '(点踩数)');
  console.log('  bookmarks:', firstItem.bookmarks, '(收藏数)');
  console.log('  shares:', firstItem.shares, '(分享数)');
  console.log('  views:', firstItem.views, '(查看数)');
  console.log('');
  
  console.log('🔍 用户操作状态 (重要):');
  console.log('  isLiked:', firstItem.isLiked, '(当前用户是否已点赞)');
  console.log('  isDisliked:', firstItem.isDisliked, '(当前用户是否已点踩)');
  console.log('  isBookmarked:', firstItem.isBookmarked, '(当前用户是否已收藏)');
  console.log('');
  
  console.log('🔍 可能的其他状态字段名:');
  console.log('  liked:', firstItem.liked, '(另一种点赞字段名)');
  console.log('  disliked:', firstItem.disliked, '(另一种点踩字段名)');
  console.log('  bookmarked:', firstItem.bookmarked, '(另一种收藏字段名)');
  console.log('  collected:', firstItem.collected, '(另一种收藏字段名)');
  console.log('');
  
  console.log('⏰ 时间信息:');
  console.log('  createdAt:', firstItem.createdAt, '(创建时间)');
  console.log('  updatedAt:', firstItem.updatedAt, '(更新时间)');
  console.log('');
  
  console.log('🏷️ 其他字段:');
  console.log('  type:', firstItem.type, '(补充类型)');
  console.log('  status:', firstItem.status, '(状态)');
  console.log('  images:', firstItem.images?.length || 0, '张图片');
  console.log('  tags:', firstItem.tags?.length || 0, '个标签');
  console.log('');
  
  console.log('📊 所有字段列表:');
  Object.keys(firstItem).forEach(key => {
    const value = firstItem[key];
    const type = typeof value;
    console.log(`  ${key}: ${type === 'object' ? JSON.stringify(value) : value} (${type})`);
  });
}

console.log('\n🔧 ==================== 前端使用建议 ====================\n');

console.log('💡 状态初始化建议:');
console.log('');
console.log('在 loadSupplementsList 函数中添加:');
console.log('```javascript');
console.log('newSupplements.forEach(item => {');
console.log('  // 优先使用 isXxx 格式的字段');
console.log('  initialLikedState[item.id] = item.isLiked || item.liked || false;');
console.log('  initialDislikedState[item.id] = item.isDisliked || item.disliked || false;');
console.log('  initialBookmarkedState[item.id] = item.isBookmarked || item.bookmarked || item.collected || false;');
console.log('});');
console.log('```');
console.log('');

console.log('🎯 关键字段检查:');
console.log('  1. 确认后端返回的状态字段名称 (isLiked 还是 liked)');
console.log('  2. 确认收藏字段名称 (isBookmarked, bookmarked, 还是 collected)');
console.log('  3. 确认数据类型 (boolean 还是 number)');
console.log('');

console.log('📝 实际使用时需要检查:');
console.log('  - 打开浏览器开发者工具');
console.log('  - 查看 Network 面板中的实际接口响应');
console.log('  - 对比实际字段名和数据类型');
console.log('  - 根据实际情况调整前端代码');

console.log('\n🔍 ==================== 分析完成 ====================');