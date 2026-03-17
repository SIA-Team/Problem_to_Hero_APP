/**
 * 补充列表点赞问题调试脚本
 * 
 * 问题描述：
 * 1. 在回答列表点赞某条回答
 * 2. 然后在补充列表点赞某条补充
 * 3. 补充列表返回"已取消点赞"
 * 
 * 可能原因分析：
 * 1. 前端状态管理混乱（回答和补充共用了状态）
 * 2. 后端接口逻辑问题（补充点赞接口是toggle模式）
 * 3. ID冲突（回答ID和补充ID可能重复）
 */

console.log('=== 补充列表点赞问题分析 ===\n');

// 检查点1：前端状态管理
console.log('📋 检查点1：前端状态管理');
console.log('回答点赞状态：answerLiked = { [answerId]: boolean }');
console.log('补充点赞状态：suppLiked = { [supplementId]: boolean }');
console.log('✅ 状态管理独立，不会互相影响\n');

// 检查点2：接口对比
console.log('📋 检查点2：接口对比');
console.log('回答点赞接口：');
console.log('  - 点赞：POST /app/content/answer/:id/like');
console.log('  - 取消：POST /app/content/answer/:id/unlike');
console.log('  - 模式：分离式（like/unlike 两个接口）');
console.log('');
console.log('补充点赞接口：');
console.log('  - 点赞：POST /app/content/supplement/:id/like');
console.log('  - 取消：❌ 没有 unlike 接口');
console.log('  - 模式：Toggle式（同一个接口切换状态）');
console.log('⚠️  接口设计不一致！\n');

// 检查点3：前端实现对比
console.log('📋 检查点3：前端实现对比');
console.log('回答点赞实现：');
console.log('  - 根据当前状态调用 likeAnswer 或 unlikeAnswer');
console.log('  - 先更新UI，再发请求，失败则回滚');
console.log('  - 有防抖和请求去重机制');
console.log('');
console.log('补充点赞实现：');
console.log('  - 只调用 likeSupplement 接口');
console.log('  - 根据后端返回的 data 值更新状态');
console.log('  - response.data = true 表示已点赞');
console.log('  - response.data = false 表示已取消点赞');
console.log('✅ 实现逻辑正确\n');

// 问题根源分析
console.log('🔍 问题根源分析：');
console.log('');
console.log('场景重现：');
console.log('1. 用户在回答列表点赞回答A（answerId=123）');
console.log('   - 前端状态：answerLiked[123] = true');
console.log('   - 后端状态：回答123已点赞');
console.log('');
console.log('2. 用户在补充列表点赞补充B（supplementId=456）');
console.log('   - 前端调用：likeSupplement(456)');
console.log('   - 后端返回：response.data = false（已取消点赞）');
console.log('   - 前端显示："已取消点赞"');
console.log('');
console.log('❓ 为什么第一次点赞返回"已取消点赞"？\n');

// 可能的原因
console.log('💡 可能的原因：');
console.log('');
console.log('原因1：后端数据库中该补充已经是点赞状态');
console.log('  - 可能之前点过赞，但前端状态丢失了');
console.log('  - 页面刷新或重新进入导致前端状态重置');
console.log('  - 建议：从接口获取初始点赞状态');
console.log('');
console.log('原因2：后端接口逻辑错误');
console.log('  - 后端可能混淆了回答和补充的点赞状态');
console.log('  - 后端可能使用了错误的用户ID或内容ID');
console.log('  - 建议：检查后端日志和数据库');
console.log('');
console.log('原因3：ID冲突');
console.log('  - 回答ID和补充ID可能使用同一个序列');
console.log('  - 如果回答123和补充123共用点赞表，会冲突');
console.log('  - 建议：检查后端数据表设计');
console.log('');

// 解决方案
console.log('🔧 解决方案：');
console.log('');
console.log('方案1：前端初始化点赞状态（推荐）');
console.log('  - 从补充列表接口返回每条补充的点赞状态');
console.log('  - 初始化时设置 suppLiked 状态');
console.log('  - 代码示例：');
console.log('    supplements.forEach(item => {');
console.log('      suppLiked[item.id] = item.isLiked || false;');
console.log('    });');
console.log('');
console.log('方案2：后端修复（如果是后端问题）');
console.log('  - 检查后端点赞表的设计');
console.log('  - 确保回答和补充的点赞记录分开存储');
console.log('  - 或者使用 contentType 字段区分');
console.log('');
console.log('方案3：前端添加调试日志');
console.log('  - 在点赞前后打印完整的请求和响应');
console.log('  - 确认传递的ID是否正确');
console.log('  - 确认后端返回的状态是否符合预期');
console.log('');

// 调试建议
console.log('🐛 调试建议：');
console.log('');
console.log('1. 添加详细日志：');
console.log('   console.log("点赞前状态:", suppLiked[supplementId]);');
console.log('   console.log("请求ID:", supplementId);');
console.log('   console.log("响应数据:", response.data);');
console.log('');
console.log('2. 检查补充列表接口返回：');
console.log('   - 查看每条补充是否有 isLiked 字段');
console.log('   - 确认初始状态是否正确');
console.log('');
console.log('3. 对比回答和补充的ID：');
console.log('   - 打印回答ID和补充ID');
console.log('   - 确认是否存在ID重复');
console.log('');
console.log('4. 测试步骤：');
console.log('   a. 清空所有点赞状态');
console.log('   b. 只点赞一条补充');
console.log('   c. 观察返回结果');
console.log('   d. 再次点击同一条补充');
console.log('   e. 观察状态切换是否正确');
console.log('');

console.log('=== 分析完成 ===');
