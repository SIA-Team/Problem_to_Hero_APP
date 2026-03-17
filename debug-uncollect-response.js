/**
 * 调试取消收藏接口响应问题
 * 分析为什么API返回200但仍然进入错误处理
 */

console.log('🔍 取消收藏接口响应调试');
console.log('='.repeat(60));

// 从日志中提取的实际响应数据
const actualLogData = {
  // 第一条日志：API Response
  apiResponse: {
    data: {
      code: 200,
      data: null,
      msg: null
    },
    status: 200,
    url: "/app/content/answer/2/uncollect"
  },
  
  // 第二条日志：收藏API响应
  consoleResponse: {
    data: {
      code: 200,
      data: null,
      msg: null
    }
  },
  
  // 第三条日志：API返回错误
  errorLog: {
    code: undefined,
    msg: undefined
  }
};

console.log('📊 日志数据分析:');
console.log('1. API Response:', JSON.stringify(actualLogData.apiResponse, null, 2));
console.log('2. Console Response:', JSON.stringify(actualLogData.consoleResponse, null, 2));
console.log('3. Error Log:', JSON.stringify(actualLogData.errorLog, null, 2));
console.log('');

// 分析问题
console.log('🔍 问题分析:');
console.log('-'.repeat(40));

// 检查第一个条件
const condition1 = actualLogData.consoleResponse?.data?.code === 200;
console.log('1. response?.data?.code === 200:', condition1);
console.log('   实际值:', actualLogData.consoleResponse?.data?.code);

if (condition1) {
  console.log('2. 应该进入成功分支');
  console.log('3. 但是从错误日志看，进入了错误处理分支');
  console.log('4. 这说明代码执行流程有问题');
} else {
  console.log('2. 条件不满足，进入错误分支');
}

console.log('');

// 模拟代码执行流程
console.log('🧪 模拟代码执行流程:');
console.log('-'.repeat(40));

function simulateCollectLogic(response, newBookmarked) {
  console.log('📥 收藏API响应:', response);
  
  if (response?.data?.code === 200) {
    console.log('✅ 收藏操作成功:', newBookmarked ? '已收藏' : '已取消收藏');
    
    // 根据操作类型显示不同的成功提示
    const successMessage = newBookmarked ? '收藏成功' : '取消收藏成功';
    console.log('🎉 应该显示:', successMessage);
    
    return { success: true, message: successMessage };
  } else {
    // 只有当code不是200时才抛出错误
    const errorCode = response?.data?.code;
    const errorMsg = response?.data?.msg;
    
    let finalErrorMsg;
    if (errorMsg) {
      finalErrorMsg = errorMsg;
    } else if (errorCode !== undefined) {
      finalErrorMsg = `操作失败 (错误码: ${errorCode})`;
    } else {
      finalErrorMsg = '操作失败，请重试';
    }
    
    console.error('❌ API返回错误:', { code: errorCode, msg: errorMsg });
    throw new Error(finalErrorMsg);
  }
}

// 测试取消收藏场景
console.log('测试取消收藏场景:');
try {
  const result = simulateCollectLogic(actualLogData.consoleResponse, false);
  console.log('✅ 模拟结果:', result);
} catch (error) {
  console.log('❌ 模拟错误:', error.message);
}

console.log('');

// 可能的问题原因分析
console.log('🤔 可能的问题原因:');
console.log('-'.repeat(40));
console.log('1. 代码修改没有正确保存或生效');
console.log('2. 存在多个handleAnswerBookmark函数定义');
console.log('3. 代码中有其他地方在处理响应');
console.log('4. 异步执行顺序问题');
console.log('5. 热重载没有正确更新代码');

console.log('');

// 解决方案建议
console.log('💡 解决方案建议:');
console.log('-'.repeat(40));
console.log('1. 检查代码是否正确保存');
console.log('2. 重启开发服务器确保代码更新');
console.log('3. 添加更多调试日志确认执行流程');
console.log('4. 检查是否有其他地方在处理API响应');

console.log('');

// 建议的调试代码
console.log('🛠️ 建议添加的调试代码:');
console.log('-'.repeat(40));
console.log(`
// 在handleAnswerBookmark函数开始处添加
console.log('🚀 handleAnswerBookmark 开始执行');

// 在API调用前添加
console.log('📤 准备调用API:', newBookmarked ? 'collect' : 'uncollect');

// 在响应处理前添加
console.log('📥 原始响应对象:', response);
console.log('📥 响应数据结构:', {
  hasData: !!response?.data,
  code: response?.data?.code,
  dataField: response?.data?.data,
  msg: response?.data?.msg
});

// 在条件判断处添加
console.log('🔍 条件判断:', {
  condition: 'response?.data?.code === 200',
  leftSide: response?.data?.code,
  rightSide: 200,
  result: response?.data?.code === 200,
  type: typeof response?.data?.code
});
`);

console.log('');
console.log('🎯 下一步行动:');
console.log('-'.repeat(40));
console.log('1. 添加详细的调试日志');
console.log('2. 重启开发服务器');
console.log('3. 重新测试取消收藏功能');
console.log('4. 观察控制台输出确认执行流程');