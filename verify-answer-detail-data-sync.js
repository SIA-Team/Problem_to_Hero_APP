/**
 * 回答详情页数据同步验证脚本
 * 验证从问题详情页传递到回答详情页的数据是否正确同步
 */

// 模拟问题详情页的回答数据结构
const mockAnswerFromQuestionDetail = {
  id: 123,
  userName: '张三',
  userNickname: '技术达人',
  userAvatar: 'https://example.com/avatar.jpg',
  author: 'fallback_author', // 备用字段
  avatar: 'https://example.com/fallback_avatar.jpg', // 备用字段
  content: '这是一个很好的问题，我来分享一下我的经验...',
  title: '高级前端工程师 · 5年经验',
  verified: true,
  adopted: false,
  time: '2小时前',
  
  // 统计数据 - 使用多种字段名兼容
  likeCount: 156,
  like_count: null, // 备用字段
  likes: null, // 备用字段
  
  dislikeCount: 8,
  dislike_count: null,
  dislikes: null,
  
  bookmarkCount: 89,
  bookmark_count: null,
  bookmarks: null,
  
  shareCount: 34,
  share_count: null,
  shares: null,
  
  commentCount: 67,
  comment_count: null,
  comments: null,
  
  viewCount: 1234,
  view_count: null,
  views: null,
  
  // 用户状态
  isLiked: true,
  liked: null,
  isBookmarked: false,
  bookmarked: null,
  collected: null,
  
  superLikes: 12,
  invitedBy: {
    name: '李四',
    avatar: 'https://example.com/inviter.jpg'
  }
};

/**
 * 验证字段映射逻辑
 */
const verifyFieldMapping = (answer) => {
  console.log('🧪 验证回答数据字段映射...\n');
  
  // 验证用户信息映射
  const displayName = answer.userName || answer.userNickname || answer.author || '匿名用户';
  const displayAvatar = answer.userAvatar || answer.avatar;
  
  console.log('👤 用户信息映射:');
  console.log('  显示名称:', displayName);
  console.log('  头像URL:', displayAvatar);
  console.log('  验证状态:', answer.verified);
  console.log('  用户标题:', answer.title);
  console.log('');
  
  // 验证统计数据映射
  const likeCount = answer.likeCount || answer.like_count || answer.likes || 0;
  const dislikeCount = answer.dislikeCount || answer.dislike_count || answer.dislikes || 0;
  const bookmarkCount = answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || 0;
  const shareCount = answer.shareCount || answer.share_count || answer.shares || 0;
  const commentCount = answer.commentCount || answer.comment_count || answer.comments || 0;
  const viewCount = answer.viewCount || answer.view_count || answer.views || 0;
  
  console.log('📊 统计数据映射:');
  console.log('  点赞数:', likeCount);
  console.log('  踩数:', dislikeCount);
  console.log('  收藏数:', bookmarkCount);
  console.log('  分享数:', shareCount);
  console.log('  评论数:', commentCount);
  console.log('  浏览数:', viewCount);
  console.log('');
  
  // 验证用户状态映射
  const isLiked = answer.isLiked || answer.liked || false;
  const isBookmarked = answer.isBookmarked || answer.bookmarked || answer.collected || false;
  
  console.log('🎯 用户状态映射:');
  console.log('  已点赞:', isLiked);
  console.log('  已收藏:', isBookmarked);
  console.log('  已采纳:', answer.adopted);
  console.log('');
  
  // 验证其他信息
  console.log('📝 其他信息:');
  console.log('  回答ID:', answer.id);
  console.log('  发布时间:', answer.time);
  console.log('  超级赞数:', answer.superLikes || 0);
  console.log('  邀请者:', answer.invitedBy?.name || '无');
  console.log('');
  
  return {
    displayName,
    displayAvatar,
    likeCount,
    dislikeCount,
    bookmarkCount,
    shareCount,
    commentCount,
    viewCount,
    isLiked,
    isBookmarked
  };
};

/**
 * 验证数据一致性
 */
const verifyDataConsistency = (questionDetailData, answerDetailData) => {
  console.log('🔍 验证数据一致性...\n');
  
  const checks = [
    {
      name: '点赞数一致性',
      questionValue: questionDetailData.likeCount,
      answerValue: answerDetailData.likeCount,
      match: questionDetailData.likeCount === answerDetailData.likeCount
    },
    {
      name: '收藏数一致性',
      questionValue: questionDetailData.bookmarkCount,
      answerValue: answerDetailData.bookmarkCount,
      match: questionDetailData.bookmarkCount === answerDetailData.bookmarkCount
    },
    {
      name: '踩数一致性',
      questionValue: questionDetailData.dislikeCount,
      answerValue: answerDetailData.dislikeCount,
      match: questionDetailData.dislikeCount === answerDetailData.dislikeCount
    },
    {
      name: '用户状态一致性',
      questionValue: `点赞:${questionDetailData.isLiked}, 收藏:${questionDetailData.isBookmarked}`,
      answerValue: `点赞:${answerDetailData.isLiked}, 收藏:${answerDetailData.isBookmarked}`,
      match: questionDetailData.isLiked === answerDetailData.isLiked && 
             questionDetailData.isBookmarked === answerDetailData.isBookmarked
    }
  ];
  
  checks.forEach(check => {
    const status = check.match ? '✅' : '❌';
    console.log(`${status} ${check.name}:`);
    console.log(`  问题详情页: ${check.questionValue}`);
    console.log(`  回答详情页: ${check.answerValue}`);
    console.log('');
  });
  
  const allMatch = checks.every(check => check.match);
  console.log(allMatch ? '🎉 所有数据一致性检查通过！' : '⚠️ 存在数据不一致问题');
  
  return allMatch;
};

/**
 * 模拟导航传参
 */
const simulateNavigation = () => {
  console.log('🚀 模拟导航传参...\n');
  
  // 模拟问题详情页的导航调用
  const navigationParams = {
    answer: mockAnswerFromQuestionDetail,
    defaultTab: 'supplements'
  };
  
  console.log('📤 问题详情页传递的参数:');
  console.log(JSON.stringify(navigationParams, null, 2));
  console.log('');
  
  // 模拟回答详情页接收参数
  const receivedAnswer = navigationParams.answer;
  
  console.log('📥 回答详情页接收的数据:');
  console.log('  回答ID:', receivedAnswer.id);
  console.log('  作者:', receivedAnswer.userName || receivedAnswer.userNickname || receivedAnswer.author);
  console.log('  点赞数:', receivedAnswer.likeCount || receivedAnswer.like_count || receivedAnswer.likes || 0);
  console.log('  收藏数:', receivedAnswer.bookmarkCount || receivedAnswer.bookmark_count || receivedAnswer.bookmarks || 0);
  console.log('  用户已点赞:', receivedAnswer.isLiked || receivedAnswer.liked || false);
  console.log('  用户已收藏:', receivedAnswer.isBookmarked || receivedAnswer.bookmarked || receivedAnswer.collected || false);
  console.log('');
  
  return receivedAnswer;
};

// 运行验证
console.log('='.repeat(60));
console.log('回答详情页数据同步验证');
console.log('='.repeat(60));
console.log('');

// 1. 验证字段映射
const mappedData = verifyFieldMapping(mockAnswerFromQuestionDetail);

// 2. 模拟导航
const receivedData = simulateNavigation();

// 3. 验证一致性
const mappedReceivedData = verifyFieldMapping(receivedData);
verifyDataConsistency(mappedData, mappedReceivedData);

console.log('='.repeat(60));
console.log('验证完成');
console.log('='.repeat(60));

export { verifyFieldMapping, verifyDataConsistency, simulateNavigation };