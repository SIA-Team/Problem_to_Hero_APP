/**
 * 调试回答列表字段映射问题
 * 用于分析接口返回的数据结构
 */

console.log('=== 回答列表字段映射调试 ===');

// 模拟接口可能返回的数据结构
const mockAnswerFromAPI = {
  id: 1,
  content: "这是回答内容",
  author: "回答者",
  avatar: "头像URL",
  // 可能的点赞字段名
  likes: undefined,        // 当前使用的字段
  likeCount: 25,          // 可能的字段名1
  like_count: 25,         // 可能的字段名2
  thumbsUp: 25,           // 可能的字段名3
  upvotes: 25,            // 可能的字段名4
  
  // 可能的评论字段名
  comments: undefined,     // 当前使用的字段
  commentCount: 12,       // 可能的字段名1
  comment_count: 12,      // 可能的字段名2
  
  // 可能的分享字段名
  shares: undefined,       // 当前使用的字段
  shareCount: 34,         // 可能的字段名1
  share_count: 34,        // 可能的字段名2
  
  // 可能的收藏字段名
  bookmarks: undefined,    // 当前使用的字段
  bookmarkCount: 89,      // 可能的字段名1
  bookmark_count: 89,     // 可能的字段名2
  favorites: 89,          // 可能的字段名3
  
  // 可能的踩字段名
  dislikes: undefined,     // 当前使用的字段
  dislikeCount: 3,        // 可能的字段名1
  dislike_count: 3,       // 可能的字段名2
  thumbsDown: 3,          // 可能的字段名3
  downvotes: 3,           // 可能的字段名4
};

console.log('模拟的API数据:');
console.log(JSON.stringify(mockAnswerFromAPI, null, 2));

console.log('\n=== 字段检查结果 ===');

// 检查各个字段
const checkField = (obj, fieldName, possibleFields) => {
  console.log(`\n${fieldName}字段检查:`);
  console.log(`  当前使用: ${fieldName} = ${obj[fieldName]} (${typeof obj[fieldName]})`);
  console.log(`  是否为NaN: ${isNaN(obj[fieldName])}`);
  
  console.log('  可能的字段:');
  possibleFields.forEach(field => {
    if (obj[field] !== undefined) {
      console.log(`    ✅ ${field} = ${obj[field]}`);
    } else {
      console.log(`    ❌ ${field} = undefined`);
    }
  });
  
  // 推荐使用的字段
  const validField = possibleFields.find(field => obj[field] !== undefined && !isNaN(obj[field]));
  if (validField) {
    console.log(`  🎯 推荐使用: ${validField}`);
  } else {
    console.log(`  ⚠️  没有找到有效字段，建议使用默认值 0`);
  }
};

checkField(mockAnswerFromAPI, 'likes', ['likes', 'likeCount', 'like_count', 'thumbsUp', 'upvotes']);
checkField(mockAnswerFromAPI, 'comments', ['comments', 'commentCount', 'comment_count']);
checkField(mockAnswerFromAPI, 'shares', ['shares', 'shareCount', 'share_count']);
checkField(mockAnswerFromAPI, 'bookmarks', ['bookmarks', 'bookmarkCount', 'bookmark_count', 'favorites']);
checkField(mockAnswerFromAPI, 'dislikes', ['dislikes', 'dislikeCount', 'dislike_count', 'thumbsDown', 'downvotes']);

console.log('\n=== 修复建议 ===');
console.log('在代码中使用安全的字段访问:');
console.log('  点赞数: answer.likeCount || answer.like_count || answer.likes || 0');
console.log('  评论数: answer.commentCount || answer.comment_count || answer.comments || 0');
console.log('  分享数: answer.shareCount || answer.share_count || answer.shares || 0');
console.log('  收藏数: answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || 0');
console.log('  踩数: answer.dislikeCount || answer.dislike_count || answer.dislikes || 0');