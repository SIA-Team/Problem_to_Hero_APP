/**
 * 调试采纳接口问题
 * 
 * 错误信息：{"code": 500, "msg": "问题与回答不匹配"}
 * 可能的问题：
 * 1. 参数类型问题（字符串 vs 数字）
 * 2. 参数传递顺序问题
 * 3. 接口路径问题
 * 4. 请求方法问题
 */

import { API_ENDPOINTS, replaceUrlParams } from './src/config/api';
import contentApiClient from './src/services/api/contentApiClient';

// 测试数据
const testData = {
  questionId: 1,  // 确保使用数字类型
  answerId: 2,    // 确保使用数字类型
};

// 调试函数1：检查URL构建
function debugUrlConstruction() {
  console.log('🔍 调试URL构建...');
  
  const endpoint = API_ENDPOINTS.ANSWER.ADOPT;
  console.log('原始端点:', endpoint);
  
  // 测试不同的参数类型
  const testCases = [
    { questionId: 1, answerId: 2 },           // 数字
    { questionId: '1', answerId: '2' },       // 字符串
    { questionId: "1", answerId: "2" },       // 双引号字符串
  ];
  
  testCases.forEach((params, index) => {
    const url = replaceUrlParams(endpoint, params);
    console.log(`测试用例 ${index + 1}:`, params, '→', url);
  });
}

// 调试函数2：检查实际请求
async function debugActualRequest() {
  console.log('\n🔍 调试实际请求...');
  
  try {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.ADOPT, testData);
    console.log('请求URL:', url);
    console.log('请求方法: PUT');
    console.log('请求参数:', testData);
    
    // 模拟请求（不实际发送）
    console.log('模拟请求构建...');
    console.log('完整请求信息:');
    console.log('- URL:', url);
    console.log('- Method: PUT');
    console.log('- Headers: Content-Type: application/json');
    console.log('- Body: 无（PUT请求，参数在URL中）');
    
  } catch (error) {
    console.error('请求构建失败:', error);
  }
}

// 调试函数3：尝试不同的请求方式
async function debugDifferentMethods() {
  console.log('\n🔍 尝试不同的请求方式...');
  
  const url = replaceUrlParams(API_ENDPOINTS.ANSWER.ADOPT, testData);
  
  // 方式1：PUT请求，无请求体
  console.log('方式1: PUT请求，无请求体');
  console.log('contentApiClient.put(url)');
  
  // 方式2：PUT请求，带空请求体
  console.log('方式2: PUT请求，带空请求体');
  console.log('contentApiClient.put(url, {})');
  
  // 方式3：POST请求
  console.log('方式3: POST请求');
  console.log('contentApiClient.post(url)');
  
  // 方式4：PUT请求，带参数在请求体中
  console.log('方式4: PUT请求，参数在请求体中');
  console.log('contentApiClient.put("/app/content/answer/adopt", { questionId, answerId })');
}

// 调试函数4：检查参数验证
function debugParameterValidation() {
  console.log('\n🔍 检查参数验证...');
  
  // 检查参数是否为有效值
  console.log('questionId:', testData.questionId, typeof testData.questionId);
  console.log('answerId:', testData.answerId, typeof testData.answerId);
  
  // 检查参数是否为正整数
  const isValidQuestionId = Number.isInteger(testData.questionId) && testData.questionId > 0;
  const isValidAnswerId = Number.isInteger(testData.answerId) && testData.answerId > 0;
  
  console.log('questionId 有效:', isValidQuestionId);
  console.log('answerId 有效:', isValidAnswerId);
  
  if (!isValidQuestionId || !isValidAnswerId) {
    console.log('❌ 参数验证失败');
  } else {
    console.log('✅ 参数验证通过');
  }
}

// 建议的修复方案
function suggestFixes() {
  console.log('\n💡 建议的修复方案:');
  
  console.log('1. 确保参数类型正确（数字而非字符串）');
  console.log('2. 检查问题ID和回答ID是否真实存在且匹配');
  console.log('3. 尝试不同的请求方式');
  console.log('4. 检查后端接口文档');
  console.log('5. 添加更详细的错误日志');
}

// 修复版本的采纳接口
function createFixedAdoptAnswer() {
  console.log('\n🔧 创建修复版本的采纳接口...');
  
  const fixedAdoptAnswer = async (questionId, answerId) => {
    // 确保参数为数字类型
    const numQuestionId = parseInt(questionId, 10);
    const numAnswerId = parseInt(answerId, 10);
    
    console.log('📤 采纳回答 (修复版本):');
    console.log('  原始参数:', { questionId, answerId });
    console.log('  转换后参数:', { questionId: numQuestionId, answerId: numAnswerId });
    
    // 参数验证
    if (!Number.isInteger(numQuestionId) || numQuestionId <= 0) {
      throw new Error('无效的问题ID');
    }
    if (!Number.isInteger(numAnswerId) || numAnswerId <= 0) {
      throw new Error('无效的回答ID');
    }
    
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.ADOPT, { 
      questionId: numQuestionId, 
      answerId: numAnswerId 
    });
    
    console.log('  构建的URL:', url);
    console.log('  请求方法: PUT');
    
    // 尝试多种请求方式
    try {
      // 方式1：标准PUT请求
      console.log('  尝试方式1: 标准PUT请求');
      return await contentApiClient.put(url);
    } catch (error1) {
      console.log('  方式1失败:', error1.message);
      
      try {
        // 方式2：PUT请求带空对象
        console.log('  尝试方式2: PUT请求带空对象');
        return await contentApiClient.put(url, {});
      } catch (error2) {
        console.log('  方式2失败:', error2.message);
        
        // 方式3：POST请求
        console.log('  尝试方式3: POST请求');
        return await contentApiClient.post(url);
      }
    }
  };
  
  return fixedAdoptAnswer;
}

// 主调试函数
async function main() {
  console.log('🚀 开始调试采纳接口问题...\n');
  
  debugUrlConstruction();
  await debugActualRequest();
  await debugDifferentMethods();
  debugParameterValidation();
  suggestFixes();
  
  const fixedFunction = createFixedAdoptAnswer();
  console.log('\n✅ 修复版本的函数已创建');
  
  console.log('\n📋 调试总结:');
  console.log('- 检查了URL构建过程');
  console.log('- 验证了参数类型和有效性');
  console.log('- 提供了多种请求方式');
  console.log('- 创建了修复版本的函数');
}

// 如果直接运行此文件，执行调试
if (require.main === module) {
  main().catch(console.error);
}

export { 
  debugUrlConstruction, 
  debugActualRequest, 
  debugParameterValidation, 
  createFixedAdoptAnswer 
};