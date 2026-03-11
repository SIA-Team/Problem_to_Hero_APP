/**
 * 调试 selectedType 的实际值
 */

// 模拟当前的问题类型定义
const questionTypes = [
  { id: 0, name: '公开问题', desc: '公开提问', icon: 'gift', color: '#22c55e' },
  { id: 1, name: '悬赏问题', desc: '付费求答', icon: 'cash', color: '#f97316' },
  { id: 2, name: '定向问题', desc: '指定回答', icon: 'locate', color: '#3b82f6' },
];

// 模拟初始状态
let selectedType = 0; // 初始值

console.log('🔍 问题类型调试');
console.log('='.repeat(40));
console.log('');

console.log('📋 问题类型定义:');
questionTypes.forEach(type => {
  console.log(`  ${type.id}: ${type.name}`);
});
console.log('');

console.log('🔍 selectedType 值检查:');
console.log('  - 当前值:', selectedType);
console.log('  - 数据类型:', typeof selectedType);
console.log('  - 是否为数字:', typeof selectedType === 'number');
console.log('  - 是否为整数:', Number.isInteger(selectedType));
console.log('  - JSON序列化:', JSON.stringify(selectedType));
console.log('  - 是否在有效范围:', [0, 1, 2].includes(selectedType));
console.log('');

// 测试不同的选择
console.log('🧪 测试不同选择:');
[0, 1, 2].forEach(typeId => {
  selectedType = typeId;
  const typeName = questionTypes.find(t => t.id === typeId)?.name || '未知';
  
  console.log(`\n  选择 ${typeId} (${typeName}):`);
  console.log(`    - selectedType: ${selectedType}`);
  console.log(`    - typeof: ${typeof selectedType}`);
  console.log(`    - 直接用于API: type: ${selectedType}`);
  console.log(`    - 验证: ${[0, 1, 2].includes(selectedType) ? '✅ 有效' : '❌ 无效'}`);
});

console.log('');
console.log('✅ 调试完成');
console.log('');
console.log('💡 关键点:');
console.log('1. selectedType 应该是数字类型 (number)');
console.log('2. 值应该是 0, 1, 或 2');
console.log('3. 直接传给 API，不需要任何转换');
console.log('4. 如果还是报错，可能是其他地方的问题');