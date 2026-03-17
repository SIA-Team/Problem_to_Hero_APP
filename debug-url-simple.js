// 简化的URL构建调试
console.log('=== 补充回答接口URL构建调试 ===\n');

// 模拟API配置
const API_ENDPOINTS = {
  ANSWER: {
    SUPPLEMENT_LIST: '/app/content/answer-supplement/answer/:answerId/list'
  }
};

// 模拟URL替换函数
const replaceUrlParams = (url, params) => {
  let replacedUrl = url;
  Object.keys(params).forEach(key => {
    replacedUrl = replacedUrl.replace(`:${key}`, params[key]);
  });
  return replacedUrl;
};

// 测试URL构建
const testCases = [
  { answerId: 1, name: '数字ID' },
  { answerId: '123', name: '字符串ID' },
  { answerId: 2, name: '从日志看到的ID' },
  { answerId: null, name: '空值' },
  { answerId: undefined, name: '未定义' }
];

testCases.forEach(testCase => {
  console.log(`测试场景: ${testCase.name}`);
  console.log('  answerId:', testCase.answerId, '(类型:', typeof testCase.answerId, ')');
  console.log('  原始端点:', API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST);
  
  try {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST, { answerId: testCase.answerId });
    console.log('  构建后URL:', url);
    console.log('  ✅ URL构建成功');
  } catch (error) {
    console.log('  ❌ URL构建失败:', error.message);
  }
  console.log('---\n');
});

// 测试完整请求示例
console.log('=== 完整请求示例 ===');
const answerId = 2; // 从日志中看到的ID
const endpoint = replaceUrlParams(API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST, { answerId });
const queryParams = {
  sortBy: 'featured',
  pageNum: 1,
  pageSize: 10
};

console.log('answerId:', answerId);
console.log('端点模板:', API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST);
console.log('构建后端点:', endpoint);
console.log('查询参数:', queryParams);
console.log('查询字符串:', new URLSearchParams(queryParams).toString());
console.log('完整请求:', endpoint + '?' + new URLSearchParams(queryParams).toString());

console.log('\n=== 关键检查点 ===');
console.log('1. answerId是否正确传递到URL路径中？');
console.log('2. 查询参数是否正确构建？');
console.log('3. API端点配置是否正确？');

console.log('\n=== 从日志分析 ===');
console.log('日志显示: /app/content/answer-supplement/answer/2/list');
console.log('这表明answerId=2已经正确替换到URL中');
console.log('问题可能在于:');
console.log('- 服务器端接口实现');
console.log('- 权限验证');
console.log('- 数据库中无对应数据');
console.log('- 接口返回格式不匹配');