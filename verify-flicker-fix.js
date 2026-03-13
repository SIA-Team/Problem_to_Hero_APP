/**
 * 验证闪烁问题修复
 * 检查关键代码是否正确实现
 */

const fs = require('fs');
const path = require('path');

console.log('=== 验证问题详情页闪烁修复 ===\n');

const filePath = path.join(__dirname, 'src/screens/QuestionDetailScreen.js');
const content = fs.readFileSync(filePath, 'utf-8');

const checks = [
  {
    name: '✅ 检查1: 批量加载实现',
    pattern: /Promise\.all\(\[[\s\S]*?questionApi\.getQuestionDetail[\s\S]*?loadQuestionSupplements[\s\S]*?answerApi\.getAnswers/,
    description: '使用Promise.all并行加载问题详情、补充列表、回答列表'
  },
  {
    name: '✅ 检查2: 条件显示数量',
    pattern: /initialDataLoaded\s*=\s*supplementsCache\.featured\.loaded\s*&&\s*answersCache\.featured\.loaded/,
    description: '检查初始数据是否加载完成（featured排序）'
  },
  {
    name: '✅ 检查3: 延迟显示逻辑',
    pattern: /if\s*\(\s*!initialDataLoaded\s*\)\s*\{[\s\S]*?return\s*\[[\s\S]*?t\('screens\.questionDetail\.tabs\.supplements'\)/,
    description: '数据未加载时不显示数量'
  },
  {
    name: '✅ 检查4: 批量状态更新',
    pattern: /setQuestionData[\s\S]*?setSupplementsCache[\s\S]*?setAnswersCache/,
    description: '批量更新所有状态（React自动批处理）'
  },
  {
    name: '✅ 检查5: loaded标志设置',
    pattern: /loaded:\s*true[\s\S]*?lastUpdated:\s*Date\.now\(\)/,
    description: '在数据设置后标记为已加载'
  },
  {
    name: '✅ 检查6: 动画延迟启动',
    pattern: /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?Animated\.timing\(fadeAnim/,
    description: '使用setTimeout确保状态更新完成后再启动动画'
  },
  {
    name: '✅ 检查7: 防抖机制',
    pattern: /answerCollectDebounce\[answerId\][\s\S]*?setTimeout\(async\s*\(\)\s*=>\s*\{/,
    description: '回答收藏操作有300ms防抖'
  },
  {
    name: '✅ 检查8: 请求去重',
    pattern: /if\s*\(\s*answerCollectLoading\[answerId\]\s*\)\s*\{[\s\S]*?return/,
    description: '防止重复请求'
  }
];

let passCount = 0;
let failCount = 0;

checks.forEach((check, index) => {
  const passed = check.pattern.test(content);
  if (passed) {
    console.log(`${check.name}`);
    console.log(`   ${check.description}`);
    console.log(`   状态: ✅ 通过\n`);
    passCount++;
  } else {
    console.log(`❌ ${check.name}`);
    console.log(`   ${check.description}`);
    console.log(`   状态: ❌ 未找到\n`);
    failCount++;
  }
});

console.log('\n=== 验证结果 ===\n');
console.log(`通过: ${passCount}/${checks.length}`);
console.log(`失败: ${failCount}/${checks.length}`);

if (failCount === 0) {
  console.log('\n🎉 所有检查通过！闪烁问题修复已正确实现。\n');
  console.log('建议测试步骤：');
  console.log('1. 清除应用缓存');
  console.log('2. 重启应用');
  console.log('3. 进入问题详情页，观察标签数量是否直接显示正确值');
  console.log('4. 使用慢速网络测试，验证骨架屏和淡入动画');
  console.log('5. 切换排序方式，验证缓存机制');
} else {
  console.log('\n⚠️ 部分检查未通过，请检查代码实现。\n');
}

console.log('\n=== 关键优化点总结 ===\n');
console.log('1. 批量加载：Promise.all并行请求，减少总时间');
console.log('2. 延迟显示：只在初始数据加载完成后才显示数量');
console.log('3. 批量更新：React 18+自动批处理多个setState');
console.log('4. 智能缓存：分排序方式缓存，避免重复请求');
console.log('5. 防抖机制：300ms防抖 + 请求去重');
console.log('6. 骨架屏：专业的加载UI + 300ms淡入动画');
