/**
 * 调试当前问题的采纳接口
 * 
 * 这个脚本专门用于调试当前问题页面的采纳功能
 * 检查数据结构、参数传递和接口调用
 */

// 模拟当前问题详情页面的数据获取和采纳操作
async function debugCurrentQuestionAdopt() {
  console.log('🔍 调试当前问题的采纳接口...\n');
  
  // 步骤1: 检查当前问题ID
  console.log('步骤1: 检查问题ID');
  const questionId = 1; // 假设当前问题ID为1
  console.log('questionId:', questionId, typeof questionId);
  
  // 步骤2: 模拟获取回答列表
  console.log('\n步骤2: 模拟回答列表数据');
  const mockAnswersList = [
    {
      id: 1,
      content: '这是第一个回答',
      adopted: false,
      questionId: 1, // 确保回答属于当前问题
      userId: 101,
      userName: '用户A'
    },
    {
      id: 2,
      content: '这是第二个回答',
      adopted: false,
      questionId: 1, // 确保回答属于当前问题
      userId: 102,
      userName: '用户B'
    },
    {
      id: 3,
      content: '这是第三个回答',
      adopted: false,
      questionId: 2, // 这个回答属于其他问题，应该会导致错误
      userId: 103,
      userName: '用户C'
    }
  ];
  
  console.log('回答列表:', mockAnswersList);
  
  // 步骤3: 验证每个回答的数据
  console.log('\n步骤3: 验证回答数据');
  mockAnswersList.forEach((answer, index) => {
    console.log(`回答 ${index + 1}:`);
    console.log('  - ID:', answer.id, typeof answer.id);
    console.log('  - 所属问题ID:', answer.questionId, typeof answer.questionId);
    console.log('  - 是否匹配当前问题:', answer.questionId === questionId ? '✅' : '❌');
    console.log('  - 是否已采纳:', answer.adopted);
  });
  
  // 步骤4: 模拟采纳操作
  console.log('\n步骤4: 模拟采纳操作');
  
  for (const answer of mockAnswersList) {
    console.log(`\n尝试采纳回答 ${answer.id}:`);
    
    // 检查数据匹配性
    if (answer.questionId !== questionId) {
      console.log('❌ 数据不匹配: 回答不属于当前问题');
      console.log(`  回答所属问题: ${answer.questionId}`);
      console.log(`  当前问题: ${questionId}`);
      continue;
    }
    
    // 检查是否已采纳
    if (answer.adopted) {
      console.log('⚠️ 回答已被采纳');
      continue;
    }
    
    // 模拟API调用
    console.log('✅ 数据验证通过，模拟API调用');
    console.log('  请求参数:', {
      questionId: questionId,
      answerId: answer.id,
      questionIdType: typeof questionId,
      answerIdType: typeof answer.id
    });
    
    // 模拟URL构建
    const mockUrl = `/app/content/answer/question/${questionId}/accept/${answer.id}`;
    console.log('  构建的URL:', mockUrl);
    
    // 模拟请求
    console.log('  模拟请求: PUT', mockUrl);
    console.log('  预期结果: 成功或失败');
  }
}

// 检查实际的回答数据结构
function checkAnswerDataStructure() {
  console.log('\n🔍 检查回答数据结构...');
  
  // 模拟从API获取的回答数据
  const apiResponse = {
    code: 200,
    msg: '',
    data: {
      rows: [
        {
          id: 1,
          content: '回答内容',
          userId: 101,
          userName: '用户名',
          userAvatar: 'avatar_url',
          adopted: false,
          likeCount: 10,
          dislikeCount: 1,
          bookmarkCount: 5,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ],
      total: 1,
      pageNum: 1,
      pageSize: 10
    }
  };
  
  console.log('API响应结构:', JSON.stringify(apiResponse, null, 2));
  
  // 检查关键字段
  const answer = apiResponse.data.rows[0];
  console.log('\n关键字段检查:');
  console.log('- id:', answer.id, typeof answer.id, '(用于采纳接口)');
  console.log('- adopted:', answer.adopted, typeof answer.adopted, '(采纳状态)');
  console.log('- userId:', answer.userId, typeof answer.userId, '(回答者ID)');
  
  // 检查是否缺少questionId字段
  if (!answer.questionId) {
    console.log('⚠️ 注意: 回答数据中缺少questionId字段');
    console.log('   这可能是导致"问题与回答不匹配"错误的原因');
    console.log('   建议: 在获取回答列表时，后端应该返回questionId字段');
  }
}

// 生成修复建议
function generateSpecificFixSuggestions() {
  console.log('\n💡 针对"问题与回答不匹配"错误的修复建议:');
  
  console.log('\n1. 数据验证建议:');
  console.log('   - 在前端调用采纳接口前，验证回答确实属于当前问题');
  console.log('   - 检查回答数据中是否包含questionId字段');
  console.log('   - 确保questionId和answerId都是有效的正整数');
  
  console.log('\n2. 接口调用建议:');
  console.log('   - 确保参数类型正确（数字而非字符串）');
  console.log('   - 检查URL构建是否正确');
  console.log('   - 尝试不同的请求方法（PUT/POST）');
  
  console.log('\n3. 后端协调建议:');
  console.log('   - 确认后端接口的具体要求');
  console.log('   - 检查后端的数据验证逻辑');
  console.log('   - 请求更详细的错误信息');
  
  console.log('\n4. 调试建议:');
  console.log('   - 在浏览器Network标签页中查看实际请求');
  console.log('   - 检查请求头和请求体');
  console.log('   - 对比成功和失败的请求差异');
}

// 创建测试用例
function createTestCases() {
  console.log('\n🧪 创建测试用例...');
  
  const testCases = [
    {
      name: '正常情况 - 有效的问题和回答',
      questionId: 1,
      answerId: 1,
      expectedResult: 'success',
      description: '回答属于当前问题，应该成功'
    },
    {
      name: '异常情况 - 回答不属于当前问题',
      questionId: 1,
      answerId: 999, // 假设这个回答属于其他问题
      expectedResult: 'error',
      description: '应该返回"问题与回答不匹配"错误'
    },
    {
      name: '异常情况 - 无效的问题ID',
      questionId: 0,
      answerId: 1,
      expectedResult: 'error',
      description: '无效的问题ID'
    },
    {
      name: '异常情况 - 无效的回答ID',
      questionId: 1,
      answerId: 0,
      expectedResult: 'error',
      description: '无效的回答ID'
    }
  ];
  
  console.log('测试用例:');
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   参数: questionId=${testCase.questionId}, answerId=${testCase.answerId}`);
    console.log(`   预期结果: ${testCase.expectedResult}`);
    console.log(`   说明: ${testCase.description}`);
  });
  
  return testCases;
}

// 主函数
async function main() {
  console.log('🚀 开始调试当前问题的采纳接口...\n');
  
  try {
    await debugCurrentQuestionAdopt();
    checkAnswerDataStructure();
    generateSpecificFixSuggestions();
    createTestCases();
    
    console.log('\n✅ 调试完成！');
    console.log('\n📋 总结:');
    console.log('1. 检查了问题和回答的数据匹配性');
    console.log('2. 验证了参数类型和有效性');
    console.log('3. 分析了可能的错误原因');
    console.log('4. 提供了具体的修复建议');
    
  } catch (error) {
    console.error('\n❌ 调试过程中发生错误:', error);
  }
}

// 如果直接运行此文件，执行调试
if (require.main === module) {
  main().catch(console.error);
}

export { 
  debugCurrentQuestionAdopt, 
  checkAnswerDataStructure, 
  generateSpecificFixSuggestions,
  createTestCases 
};