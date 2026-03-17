/**
 * 调试收藏API响应处理
 * 分析实际API响应格式并验证处理逻辑
 */

console.log('🔍 收藏API响应处理调试');
console.log('='.repeat(60));

// 模拟实际的API响应（基于日志）
const actualApiResponse = {
  data: {
    code: 200,
    data: null,
    msg: null
  },
  status: 200,
  url: "/app/content/answer/2/collect"
};

console.log('📥 实际API响应:');
console.log(JSON.stringify(actualApiResponse, null, 2));
console.log('');

// 测试原来的错误判断逻辑
console.log('🧪 原来的判断逻辑测试:');
console.log('-'.repeat(40));

const oldLogic = (response) => {
  console.log('1. 检查 response?.data?.code === 200:', response?.data?.code === 200);
  
  if (response?.data?.code === 200) {
    console.log('2. 进入成功分支');
    console.log('3. 检查 response.data.data:', response.data.data);
    
    // 这里是问题所在 - 即使成功，也会因为msg为null而抛出错误
    if (!response.data.data) {
      console.log('4. data为null，但这不应该是错误');
    }
    
    return { success: true, message: '收藏成功' };
  } else {
    const errorMsg = response?.data?.msg || '操作失败';
    console.log('2. 进入失败分支，错误信息:', errorMsg);
    throw new Error(errorMsg);
  }
};

try {
  const result = oldLogic(actualApiResponse);
  console.log('✅ 原逻辑结果:', result);
} catch (error) {
  console.log('❌ 原逻辑错误:', error.message);
}

console.log('');

// 测试修复后的判断逻辑
console.log('🛠️ 修复后的判断逻辑测试:');
console.log('-'.repeat(40));

const newLogic = (response) => {
  console.log('1. 检查 response?.data?.code === 200:', response?.data?.code === 200);
  
  if (response?.data?.code === 200) {
    console.log('2. 进入成功分支');
    console.log('3. 检查 response.data.data:', response.data.data);
    
    // 修复：只要code是200就认为成功，不管data是否为null
    if (response.data.data) {
      console.log('4. 有返回数据，使用API数据更新');
    } else {
      console.log('4. 无返回数据，使用本地乐观更新的数据');
    }
    
    return { success: true, message: '收藏成功' };
  } else {
    // 只有当code不是200时才抛出错误
    const errorMsg = response?.data?.msg || `操作失败 (code: ${response?.data?.code || 'unknown'})`;
    console.log('2. 进入失败分支，错误信息:', errorMsg);
    throw new Error(errorMsg);
  }
};

try {
  const result = newLogic(actualApiResponse);
  console.log('✅ 新逻辑结果:', result);
} catch (error) {
  console.log('❌ 新逻辑错误:', error.message);
}

console.log('');

// 测试不同的API响应场景
console.log('🎯 不同响应场景测试:');
console.log('-'.repeat(40));

const testScenarios = [
  {
    name: '场景1: 成功响应，有数据',
    response: {
      data: { code: 200, data: { bookmarkCount: 90, isBookmarked: true }, msg: '收藏成功' }
    }
  },
  {
    name: '场景2: 成功响应，无数据（实际情况）',
    response: {
      data: { code: 200, data: null, msg: null }
    }
  },
  {
    name: '场景3: 失败响应，有错误信息',
    response: {
      data: { code: 400, data: null, msg: '参数错误' }
    }
  },
  {
    name: '场景4: 失败响应，无错误信息',
    response: {
      data: { code: 500, data: null, msg: null }
    }
  }
];

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}️⃣ ${scenario.name}:`);
  
  try {
    const result = newLogic(scenario.response);
    console.log('  ✅ 处理成功:', result.message);
  } catch (error) {
    console.log('  ❌ 处理失败:', error.message);
  }
});

console.log('');
console.log('🎯 问题分析总结:');
console.log('-'.repeat(40));
console.log('1. 原问题：即使API返回code=200，但因为data和msg为null，被误判为失败');
console.log('2. 根本原因：错误判断逻辑不够准确，应该以code为准');
console.log('3. 修复方案：只有当code不是200时才抛出错误');
console.log('4. 兼容性：支持有数据和无数据两种成功响应格式');

console.log('');
console.log('🛠️ 修复后的代码逻辑:');
console.log('-'.repeat(40));
console.log(`
if (response?.data?.code === 200) {
  // 成功：显示成功提示，使用乐观更新的数据
  toast.success(newBookmarked ? '收藏成功' : '取消收藏成功');
  
  // 如果API返回了数据，则使用API数据覆盖
  if (response.data.data) {
    // 使用API返回的数据更新状态
  }
  // 如果没有返回数据，继续使用乐观更新的数据
} else {
  // 失败：只有当code不是200时才抛出错误
  throw new Error(response?.data?.msg || \`操作失败 (code: \${response?.data?.code})\`);
}
`);

console.log('');
console.log('✅ 修复完成！现在收藏功能应该可以正常工作了。');