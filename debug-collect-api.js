/**
 * 调试收藏API的不同调用方式
 */

// 方案1: URL参数传递
const collectAnswerV1 = (answerId, questionId) => {
  const url = `/app/content/answer/${answerId}/collect?questionId=${questionId}`;
  console.log('方案1 - URL参数:', url);
  // return contentApiClient.post(url);
};

// 方案2: 请求体传递 (驼峰格式)
const collectAnswerV2 = (answerId, questionId) => {
  const url = `/app/content/answer/${answerId}/collect`;
  const body = { questionId };
  console.log('方案2 - 请求体(驼峰):', url, body);
  // return contentApiClient.post(url, body);
};

// 方案3: 请求体传递 (下划线格式)
const collectAnswerV3 = (answerId, questionId) => {
  const url = `/app/content/answer/${answerId}/collect`;
  const body = { question_id: questionId };
  console.log('方案3 - 请求体(下划线):', url, body);
  // return contentApiClient.post(url, body);
};

// 方案4: 完整信息传递
const collectAnswerV4 = (answerId, questionId) => {
  const url = `/app/content/answer/${answerId}/collect`;
  const body = { 
    answerId: answerId,
    questionId: questionId,
    action: 'collect'
  };
  console.log('方案4 - 完整信息:', url, body);
  // return contentApiClient.post(url, body);
};

// 方案5: 使用axios params
const collectAnswerV5 = (answerId, questionId) => {
  const url = `/app/content/answer/${answerId}/collect`;
  const config = {
    params: { questionId }
  };
  console.log('方案5 - axios params:', url, config);
  // return contentApiClient.post(url, {}, config);
};

console.log('🧪 测试不同的收藏API调用方式:');
collectAnswerV1('123', '456');
collectAnswerV2('123', '456');
collectAnswerV3('123', '456');
collectAnswerV4('123', '456');
collectAnswerV5('123', '456');

console.log('\n📋 当前错误分析:');
console.log('SQL: insert into content_collect(user_id,target_type,target_id,question_id,create_time)');
console.log('错误: Column "question_id" cannot be null');
console.log('说明: 服务器收到的question_id字段为null');
console.log('可能原因:');
console.log('1. 请求体格式不正确');
console.log('2. 服务器端参数解析问题');
console.log('3. 字段名不匹配');
console.log('4. 参数传递方式不正确');