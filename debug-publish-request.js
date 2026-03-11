/**
 * 调试发布问题请求数据的脚本
 * 用于查看实际发送给服务器的数据结构
 */

// 模拟 PublishScreen 中构建的请求数据
function createPublishRequestData() {
  // 模拟用户输入的数据
  const mockUserInput = {
    title: "如何提高团队协作效率？",
    content: "我们团队在协作过程中经常出现沟通不畅的问题，想了解一些有效的解决方案。",
    selectedType: "free", // 公开问题
    selectedLevel2: { id: 201 }, // 互联网分类
    location: "北京市朝阳区",
    visibility: "所有人",
    isAnonymous: false,
    answerPublic: true,
    answerPaid: false,
    answerPrice: "",
    publishIdentity: "personal",
    selectedTeams: [],
    targetedUsers: [],
    customTopicNames: ["团队协作", "效率提升"],
    images: []
  };

  // 按照 PublishScreen.js 中的逻辑构建请求数据
  const requestData = {
    // 基础必填字段
    id: 0, // 新建问题
    type: mockUserInput.selectedType === 'free' ? 0 : mockUserInput.selectedType === 'reward' ? 1 : 2,
    categoryId: mockUserInput.selectedLevel2.id, // 必填，使用选中的二级分类ID
    title: mockUserInput.title.trim(), // 确保去除首尾空格
    description: mockUserInput.content.trim() || '',
    
    // 子问题（空字符串，不是JSON）
    subQuestions: '',
    
    // 悬赏金额（单位：分，需要转换）
    bountyAmount: 5000, // 默认值
    
    // 付费查看金额（单位：分）
    payViewAmount: mockUserInput.answerPaid ? Math.round(parseFloat(mockUserInput.answerPrice || 0) * 100) : 0,
    
    // 位置信息
    location: mockUserInput.location && mockUserInput.location !== '不显示' ? mockUserInput.location : '北京市朝阳区',
    
    // 可见范围：0=所有人，1=仅关注我的人，2=仅自己
    visibilityScope: mockUserInput.visibility === '所有人' ? 0 : mockUserInput.visibility === '仅关注我的人' ? 1 : 2,
    
    // 是否匿名：0=不匿名，1=匿名
    isAnonymous: mockUserInput.isAnonymous ? 1 : 0,
    
    // 是否公开答案：0=不公开，1=公开
    isPublicAnswer: mockUserInput.answerPublic ? 1 : 0,
    
    // 团队ID（以团队身份发布时才添加）
    teamId: mockUserInput.publishIdentity === 'team' && mockUserInput.selectedTeams.length > 0 ? mockUserInput.selectedTeams[0] : 100,
    
    // 专家ID列表（仅定向问题且有选择专家时才添加）
    expertIds: mockUserInput.selectedType === 'targeted' && mockUserInput.targetedUsers.length > 0 ? mockUserInput.targetedUsers.map(u => u.id) : [1, 2, 3],
    
    // 话题ID列表（已有话题）
    topicIds: [1, 5], // 示例数据
    
    // 话题名称列表（用户自定义的话题）
    topicNames: mockUserInput.customTopicNames.length > 0 ? mockUserInput.customTopicNames : ['区块链', 'Web3'],
    
    // 图片URL列表
    imageUrls: mockUserInput.images.length > 0 ? mockUserInput.images : ['https://cdn.example.com/img/1.jpg'],
  };

  return requestData;
}

// 创建最终发送给服务器的数据结构
function createFinalRequestData() {
  const publishData = createPublishRequestData();
  
  // 按照 questionApi.js 中的逻辑包装数据
  const finalRequestData = {
    questionPublishRequest: publishData
  };
  
  return finalRequestData;
}

// 执行调试
console.log('🔍 发布问题请求数据调试');
console.log('='.repeat(50));
console.log('');

console.log('📋 1. 原始问题数据:');
const publishData = createPublishRequestData();
console.log(JSON.stringify(publishData, null, 2));
console.log('');

console.log('📦 2. 包装后的请求数据 (发送给服务器):');
const finalData = createFinalRequestData();
console.log(JSON.stringify(finalData, null, 2));
console.log('');

console.log('🔍 3. 关键字段验证:');
console.log('  - title:', `"${publishData.title}" (长度: ${publishData.title.length})`);
console.log('  - categoryId:', publishData.categoryId, '(类型:', typeof publishData.categoryId, ')');
console.log('  - type:', publishData.type, '(类型:', typeof publishData.type, ')');
console.log('  - description:', `"${publishData.description}" (长度: ${publishData.description.length})`);
console.log('  - bountyAmount:', publishData.bountyAmount, '(类型:', typeof publishData.bountyAmount, ')');
console.log('  - visibilityScope:', publishData.visibilityScope, '(类型:', typeof publishData.visibilityScope, ')');
console.log('  - isAnonymous:', publishData.isAnonymous, '(类型:', typeof publishData.isAnonymous, ')');
console.log('  - isPublicAnswer:', publishData.isPublicAnswer, '(类型:', typeof publishData.isPublicAnswer, ')');
console.log('');

console.log('📡 4. HTTP 请求信息:');
console.log('  - Method: POST');
console.log('  - URL: /app/content/question/publish');
console.log('  - Content-Type: application/json');
console.log('  - Body Size:', JSON.stringify(finalData).length, 'bytes');
console.log('');

console.log('⚠️  5. 可能的问题检查:');
console.log('  - 标题是否为空:', publishData.title === '');
console.log('  - 分类ID是否有效:', publishData.categoryId > 0);
console.log('  - 类型是否有效:', [0, 1, 2].includes(publishData.type));
console.log('  - 描述是否为空:', publishData.description === '');
console.log('  - 悬赏金额是否为数字:', typeof publishData.bountyAmount === 'number');
console.log('');

console.log('✅ 调试完成');
console.log('');
console.log('📝 下一步:');
console.log('1. 对比这个数据结构与你实际发送的数据');
console.log('2. 检查服务器返回的具体错误信息');
console.log('3. 确认所有必填字段都有正确的值');
console.log('4. 检查数据类型是否符合服务器要求');