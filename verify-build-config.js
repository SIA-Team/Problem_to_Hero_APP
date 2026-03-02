/**
 * 验证构建配置
 * 用于确认生产构建时使用的配置
 */

// 模拟不同环境
const scenarios = [
  {
    name: '开发环境 - 模拟关闭',
    __DEV__: true,
    SIMULATE_PRODUCTION: false,
    expected: 'dev'
  },
  {
    name: '开发环境 - 模拟开启',
    __DEV__: true,
    SIMULATE_PRODUCTION: true,
    expected: 'prod'
  },
  {
    name: '生产构建 - 模拟关闭',
    __DEV__: false,
    SIMULATE_PRODUCTION: false,
    expected: 'prod'
  },
  {
    name: '生产构建 - 模拟开启',
    __DEV__: false,
    SIMULATE_PRODUCTION: true,
    expected: 'prod'
  }
];

// 模拟 getEnvVars 逻辑
function getEnvVars(__DEV__, SIMULATE_PRODUCTION) {
  const ENV = {
    dev: { apiUrl: 'http://dev-server' },
    prod: { apiUrl: 'http://prod-server' }
  };

  // 如果开启了模拟生产环境，返回生产配置
  if (SIMULATE_PRODUCTION) {
    return ENV.prod;
  }
  
  // 通过 __DEV__ 判断是否为开发环境
  if (__DEV__) {
    return ENV.dev;
  }
  
  // 默认返回生产环境（生产构建时）
  return ENV.prod;
}

// 运行测试
console.log('🧪 验证构建配置\n');
console.log('═'.repeat(70));

scenarios.forEach(scenario => {
  const result = getEnvVars(scenario.__DEV__, scenario.SIMULATE_PRODUCTION);
  const actual = result.apiUrl.includes('prod') ? 'prod' : 'dev';
  const passed = actual === scenario.expected;
  
  console.log(`\n${passed ? '✅' : '❌'} ${scenario.name}`);
  console.log(`   __DEV__: ${scenario.__DEV__}`);
  console.log(`   SIMULATE_PRODUCTION: ${scenario.SIMULATE_PRODUCTION}`);
  console.log(`   预期配置: ${scenario.expected}`);
  console.log(`   实际配置: ${actual}`);
  console.log(`   结果: ${passed ? '通过' : '失败'}`);
});

console.log('\n' + '═'.repeat(70));
console.log('\n📋 结论：');
console.log('   生产构建时，无论 SIMULATE_PRODUCTION 是 true 还是 false，');
console.log('   都会使用生产环境配置（ENV.prod）');
console.log('\n✅ 可以直接构建生产版本，不需要关闭模拟生产环境配置！\n');
