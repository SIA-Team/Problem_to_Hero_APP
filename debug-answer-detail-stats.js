/**
 * 回答详情页统计数据同步问题调试脚本
 * 
 * 问题描述：
 * 回答详情页底部的点赞、收藏和踩的数量显示为0，
 * 但这些数据应该与问题详情页面中该回答的统计数据保持同步
 */

console.log('🔍 回答详情页统计数据同步问题调试');
console.log('='.repeat(60));

// 模拟从问题详情页传递的回答数据
const mockAnswerFromQuestionDetail = {
  id: 123,
  userName: '技术达人张三',
  userNickname: '前端专家',
  userAvatar: 'https://example.com/avatar.jpg',
  content: '这是一个很详细的回答...',
  title: '高级前端工程师 · 5年经验',
  verified: true,
  adopted: false,
  time: '2小时前',
  
  // 统计数据 - 这些是从问题详情页传递过来的真实数据
  likeCount: 156,        // 点赞数
  dislikeCount: 8,       // 踩数  
  bookmarkCount: 89,     // 收藏数
  shareCount: 34,        // 分享数
  commentCount: 67,      // 评论数
  viewCount: 1234,       // 浏览数
  
  // 用户状态
  isLiked: true,         // 用户是否已点赞
  isBookmarked: false,   // 用户是否已收藏
  
  // 其他信息
  superLikes: 12,
  invitedBy: {
    name: '李四',
    avatar: 'https://example.com/inviter.jpg'
  }
};

// 模拟回答详情页的默认数据（当没有传递数据时使用）
const defaultAnswerData = {
  id: 1,
  author: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
  verified: true,
  title: '资深Python开发 · 10年经验',
  content: '作为一个从零开始学Python的过来人...',
  likes: 256,           // 注意：这里使用的是 likes 而不是 likeCount
  dislikes: 3,          // 这里使用的是 dislikes 而不是 dislikeCount  
  shares: 45,
  bookmarks: 89,        // 这里使用的是 bookmarks 而不是 bookmarkCount
  comments: 128,
  views: 1234,
  time: '1小时前',
  adopted: true,
  invitedBy: { name: '张三丰', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=inviter1' }
};

console.log('📊 数据对比分析:');
console.log('');

console.log('1️⃣ 问题详情页传递的数据:');
console.log('  点赞数:', mockAnswerFromQuestionDetail.likeCount);
console.log('  收藏数:', mockAnswerFromQuestionDetail.bookmarkCount);  
console.log('  踩数:', mockAnswerFromQuestionDetail.dislikeCount);
console.log('  用户已点赞:', mockAnswerFromQuestionDetail.isLiked);
console.log('  用户已收藏:', mockAnswerFromQuestionDetail.isBookmarked);
console.log('');

console.log('2️⃣ 回答详情页默认数据:');
console.log('  点赞数:', defaultAnswerData.likes);
console.log('  收藏数:', defaultAnswerData.bookmarks);
console.log('  踩数:', defaultAnswerData.dislikes);
console.log('');

// 模拟回答详情页的数据处理逻辑
function processAnswerData(routeParams) {
  // 这是回答详情页当前的逻辑
  const answer = routeParams?.answer || defaultAnswerData;
  
  console.log('3️⃣ 回答详情页处理后的数据:');
  console.log('  接收到的answer对象:', JSON.stringify(answer, null, 2));
  console.log('');
  
  // 底部栏显示的统计数据（当前的逻辑）
  const displayLikeCount = answer.likeCount || answer.like_count || answer.likes || 0;
  const displayBookmarkCount = answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || 0;
  const displayDislikeCount = answer.dislikeCount || answer.dislike_count || answer.dislikes || 0;
  
  console.log('4️⃣ 底部栏显示的统计数据:');
  console.log('  点赞数:', displayLikeCount);
  console.log('  收藏数:', displayBookmarkCount);
  console.log('  踩数:', displayDislikeCount);
  console.log('');
  
  return {
    answer,
    displayLikeCount,
    displayBookmarkCount,
    displayDislikeCount
  };
}

// 测试场景1：正常传递数据
console.log('🧪 测试场景1：正常传递数据');
console.log('-'.repeat(40));
const result1 = processAnswerData({ answer: mockAnswerFromQuestionDetail });
console.log('✅ 结果：数据正常显示');
console.log('');

// 测试场景2：没有传递数据（使用默认数据）
console.log('🧪 测试场景2：没有传递数据');
console.log('-'.repeat(40));
const result2 = processAnswerData({});
console.log('✅ 结果：使用默认数据');
console.log('');

// 测试场景3：传递了数据但字段名不匹配
console.log('🧪 测试场景3：字段名不匹配的数据');
console.log('-'.repeat(40));
const incompatibleData = {
  id: 456,
  userName: '测试用户',
  content: '测试内容',
  // 注意：这里没有 likeCount、bookmarkCount、dislikeCount 字段
  // 也没有 likes、bookmarks、dislikes 字段
};
const result3 = processAnswerData({ answer: incompatibleData });
console.log('❌ 结果：统计数据全部显示为0');
console.log('');

// 问题分析
console.log('🔍 问题分析:');
console.log('-'.repeat(40));
console.log('1. 数据传递正常：问题详情页通过 navigation.navigate 正确传递了回答数据');
console.log('2. 字段映射兼容：回答详情页支持多种字段名（likeCount/like_count/likes）');
console.log('3. 可能的问题原因：');
console.log('   a) 问题详情页传递的数据中缺少统计字段');
console.log('   b) 数据传递过程中字段丢失');
console.log('   c) 回答详情页接收数据时出现问题');
console.log('   d) API返回的数据结构与预期不符');
console.log('');

// 解决方案
console.log('💡 解决方案:');
console.log('-'.repeat(40));
console.log('1. 检查问题详情页的回答数据结构');
console.log('2. 确认API返回的统计字段名称');
console.log('3. 在回答详情页添加数据验证和日志');
console.log('4. 如果数据缺失，考虑重新获取回答详情');
console.log('');

// 建议的修复代码
console.log('🛠️ 建议的修复代码:');
console.log('-'.repeat(40));
console.log(`
// 在回答详情页添加数据验证
useEffect(() => {
  console.log('📋 回答详情页接收到的数据:');
  console.log('  route.params:', JSON.stringify(route?.params, null, 2));
  console.log('  answer数据:', JSON.stringify(answer, null, 2));
  
  // 检查统计数据是否存在
  const hasStats = answer.likeCount !== undefined || 
                   answer.like_count !== undefined || 
                   answer.likes !== undefined;
  
  if (!hasStats) {
    console.warn('⚠️ 统计数据缺失，考虑重新获取回答详情');
    // 可以在这里调用API重新获取回答详情
  }
}, []);
`);

console.log('');
console.log('🎯 下一步行动:');
console.log('-'.repeat(40));
console.log('1. 在实际应用中添加调试日志');
console.log('2. 检查问题详情页的数据传递');
console.log('3. 验证API返回的数据结构');
console.log('4. 如有必要，实现数据重新获取机制');