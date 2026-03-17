/**
 * 调试回答与补充列表数据绑定问题
 * 
 * 使用方法：
 * 1. 将此代码添加到QuestionDetailScreen.js中
 * 2. 重新运行应用
 * 3. 按照测试步骤操作
 * 4. 观察控制台输出
 */

// 在QuestionDetailScreen.js的handleAnswerLike函数中添加调试代码
const handleAnswerLikeDebug = async (answerId) => {
  console.log('🔍 ===== 回答点赞调试开始 =====');
  console.log('📊 调试信息:');
  console.log('  回答ID:', answerId);
  console.log('  回答ID类型:', typeof answerId);
  console.log('  回答ID字符串:', String(answerId));
  console.log('  当前时间:', new Date().toISOString());
  console.log('');
  
  console.log('📋 当前状态:');
  console.log('  回答点赞状态:', JSON.stringify(answerLiked, null, 2));
  console.log('  补充点赞状态:', JSON.stringify(suppLiked, null, 2));
  console.log('  回答点踩状态:', JSON.stringify(answerDisliked, null, 2));
  console.log('  补充点踩状态:', JSON.stringify(suppDisliked, null, 2));
  console.log('');
  
  console.log('🌐 即将发送请求:');
  console.log('  接口路径: /app/content/answer/' + answerId + '/like');
  console.log('  请求方法: POST');
  console.log('');
  
  // 原有的点赞逻辑...
  try {
    const response = await answerApi.likeAnswer(answerId);
    
    console.log('📥 服务器响应:');
    console.log('  完整响应:', JSON.stringify(response, null, 2));
    console.log('  响应码:', response?.code);
    console.log('  响应数据:', response?.data);
    console.log('  响应消息:', response?.msg);
    console.log('');
    
  } catch (error) {
    console.error('❌ 请求失败:', error);
  }
  
  console.log('🔍 ===== 回答点赞调试结束 =====\n');
};

// 在QuestionDetailScreen.js的handleSupplementLike函数中添加调试代码
const handleSupplementLikeDebug = async (supplementId) => {
  console.log('🔍 ===== 补充点赞调试开始 =====');
  console.log('📊 调试信息:');
  console.log('  补充ID:', supplementId);
  console.log('  补充ID类型:', typeof supplementId);
  console.log('  补充ID字符串:', String(supplementId));
  console.log('  当前时间:', new Date().toISOString());
  console.log('');
  
  console.log('📋 当前状态:');
  console.log('  回答点赞状态:', JSON.stringify(answerLiked, null, 2));
  console.log('  补充点赞状态:', JSON.stringify(suppLiked, null, 2));
  console.log('  回答点踩状态:', JSON.stringify(answerDisliked, null, 2));
  console.log('  补充点踩状态:', JSON.stringify(suppDisliked, null, 2));
  console.log('');
  
  console.log('🔍 ID对比分析:');
  const answerIds = Object.keys(answerLiked);
  const supplementIds = Object.keys(suppLiked);
  console.log('  所有回答ID:', answerIds);
  console.log('  所有补充ID:', supplementIds);
  console.log('  当前补充ID是否在回答ID中:', answerIds.includes(String(supplementId)));
  console.log('  ID冲突检查:', answerIds.filter(id => id === String(supplementId)));
  console.log('');
  
  console.log('🌐 即将发送请求:');
  console.log('  接口路径: /app/content/supplement/' + supplementId + '/like');
  console.log('  请求方法: POST');
  console.log('');
  
  // 原有的点赞逻辑...
  try {
    const response = await questionApi.likeSupplement(supplementId);
    
    console.log('📥 服务器响应:');
    console.log('  完整响应:', JSON.stringify(response, null, 2));
    console.log('  响应码:', response?.code);
    console.log('  响应数据:', response?.data);
    console.log('  响应消息:', response?.msg);
    console.log('');
    
    console.log('🤔 响应分析:');
    if (response?.data === false) {
      console.log('  ⚠️  服务器返回false，表示执行了取消点赞操作');
      console.log('  ⚠️  这意味着服务器认为之前已经点赞过了');
      console.log('  ⚠️  但前端状态显示:', suppLiked[supplementId]);
      console.log('  ⚠️  可能的原因:');
      console.log('    1. 前端状态没有正确初始化');
      console.log('    2. 后端数据库中已存在点赞记录');
      console.log('    3. ID冲突导致的数据混乱');
      console.log('    4. 后端接口逻辑错误');
    } else if (response?.data === true) {
      console.log('  ✅ 服务器返回true，表示执行了点赞操作');
      console.log('  ✅ 这是正常的行为');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ 请求失败:', error);
  }
  
  console.log('🔍 ===== 补充点赞调试结束 =====\n');
};

// 测试步骤说明
console.log('📋 测试步骤说明:');
console.log('');
console.log('步骤1: 清空状态测试');
console.log('  1. 重新启动应用');
console.log('  2. 进入问题详情页');
console.log('  3. 直接点击补充列表的点赞按钮（不要先点回答）');
console.log('  4. 观察控制台输出和提示信息');
console.log('');
console.log('步骤2: 顺序操作测试');
console.log('  1. 重新启动应用');
console.log('  2. 进入问题详情页');
console.log('  3. 先点击回答列表的点赞按钮');
console.log('  4. 再点击补充列表的点赞按钮');
console.log('  5. 对比两次的控制台输出');
console.log('');
console.log('步骤3: ID对比分析');
console.log('  1. 在控制台输出中查找"ID对比分析"部分');
console.log('  2. 检查是否存在ID冲突');
console.log('  3. 确认回答ID和补充ID是否重复');
console.log('');
console.log('步骤4: 网络请求验证');
console.log('  1. 打开浏览器开发者工具 → Network');
console.log('  2. 分别点击回答和补充的点赞按钮');
console.log('  3. 确认请求的URL是否不同');
console.log('  4. 检查请求参数和响应数据');
console.log('');

// 关键检查点
console.log('🔍 关键检查点:');
console.log('');
console.log('1. ID冲突检查:');
console.log('   - 如果"ID冲突检查"输出不为空，说明存在ID重复');
console.log('   - 这是导致数据绑定的最可能原因');
console.log('');
console.log('2. 服务器响应分析:');
console.log('   - 如果补充点赞返回false，但前端状态为undefined/false');
console.log('   - 说明后端认为已点赞，但前端不知道');
console.log('   - 可能是初始化问题或数据混乱');
console.log('');
console.log('3. 请求URL验证:');
console.log('   - 确认回答和补充使用不同的接口路径');
console.log('   - 如果路径相同，说明前端代码有问题');
console.log('');
console.log('4. 状态对比:');
console.log('   - 对比点赞前后的状态变化');
console.log('   - 确认是否有意外的状态修改');
console.log('');

console.log('=== 调试脚本准备完成 ===');
console.log('请将上述调试代码添加到对应的函数中，然后进行测试。');