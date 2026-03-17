// 调试补充回答接口URL构建
const { API_ENDPOINTS, replaceUrlParams } = require('./src/config/api.js');

console.log('=== 补充回答接口URL构建调试 ===\n');

// 测试URL构建
const testCases = [
  { answerId: 1, name: '数字ID' },
  { answerId: '123', name: '字符串ID' },
  { answerId: 'abc123', name: '字母数字ID' },
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

// 测试完整请求URL示例
console.log('=== 完整请求示例 ===');
const answerId = 123;
const baseUrl = 'https://api.example.com';
const endpoint = replaceUrlParams(API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST, { answerId });
const fullUrl = baseUrl + endpoint;
const queryParams = {
  sortBy: 'featured',
  pageNum: 1,
  pageSize: 10
};

console.log('基础URL:', baseUrl);
console.log('端点:', endpoint);
console.log('完整URL:', fullUrl);
console.log('查询参数:', queryParams);
console.log('最终请求URL:', fullUrl + '?' + new URLSearchParams(queryParams).toString());

console.log('\n=== 参数说明 ===');
console.log('✅ answerId: 在URL路径中 (/answer/{answerId}/list)');
console.log('✅ sortBy: 在查询参数中 (?sortBy=featured)');
console.log('✅ pageNum: 在查询参数中 (?pageNum=1)');
console.log('✅ pageSize: 在查询参数中 (?pageSize=10)');