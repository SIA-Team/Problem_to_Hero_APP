/**
 * 调试标题字段问题
 * 检查后端返回的 title 和 description 字段内容
 */

// 模拟后端返回的数据结构
const mockApiResponse = {
  code: 200,
  data: {
    rows: [
      {
        id: 1,
        title: "如何学习Python编程？",
        description: "我是一个编程新手，想要学习Python，请问有什么好的学习路径和资源推荐吗？",
        type: 0,
        status: 1,
        // ... 其他字段
      },
      {
        id: 2,
        title: "付费查看完整内容",
        description: "",
        type: 0,
        status: 1,
        payViewAmount: 500,
        // ... 其他字段
      }
    ]
  }
};

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 标题字段调试');
console.log('═══════════════════════════════════════════════════════════');

mockApiResponse.data.rows.forEach((item, index) => {
  console.log(`\n问题 ${index + 1}:`);
  console.log(`  ID: ${item.id}`);
  console.log(`  title: "${item.title}"`);
  console.log(`  description: "${item.description}"`);
  console.log(`  title长度: ${item.title?.length || 0}`);
  console.log(`  description长度: ${item.description?.length || 0}`);
  
  // 检查是否标题和描述搞反了
  if (item.title && item.description) {
    if (item.title.length < item.description.length) {
      console.log(`  ⚠️  警告: title比description短，可能字段搞反了`);
    }
  }
  
  // 检查是否title包含了描述性内容
  if (item.title && item.title.length > 50) {
    console.log(`  ⚠️  警告: title过长(${item.title.length}字符)，可能包含了描述内容`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('💡 建议检查项目:');
console.log('1. 检查后端API返回的title字段内容是否正确');
console.log('2. 确认title字段是问题标题，不是描述内容');
console.log('3. 如果title字段确实包含描述内容，需要联系后端修正');
console.log('4. 或者前端需要做字段映射调整');
console.log('═══════════════════════════════════════════════════════════');