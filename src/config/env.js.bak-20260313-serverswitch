import Constants from 'expo-constants';
import { SIMULATE_PRODUCTION } from './debugMode';

/**
 * 环境切换配置
 * USE_MOCK: 设置为 true 使用 Apifox Mock 环境（用于前端独立开发）
 * SIMULATE_PRODUCTION: 设置为 true 模拟生产环境（用于开发环境测试生产逻辑）
 */
const USE_MOCK = false;  // 改为 false 使用真实服务器

/**
 * 混合模式配置
 * 允许部分接口使用真实服务器，部分接口使用 Mock
 * 
 * 使用场景：
 * - 部分接口已经开发完成，可以使用真实服务器
 * - 部分接口还在开发中，使用 Mock 数据
 * 
 * 配置方式：
 * - 'real': 使用真实服务器
 * - 'mock': 使用 Mock 服务器
 * - 不配置：跟随全局 USE_MOCK 设置
 */
const API_MODE_CONFIG = {
  // ========== 所有接口使用真实服务器 ==========
  
  // 认证相关接口 ✅
  '/app/user/auth/register': 'real',      // 注册接口
  '/app/user/auth/login': 'real',         // 登录接口
  '/app/user/auth/token-login': 'real',   // Token登录
  '/app/user/auth/logout': 'real',        // 退出登录
  '/app/user/auth/password': 'real',      // 修改密码
  
  // 用户相关接口 ✅
  '/app/user/profile': 'real',            // 用户资料
  '/app/user/profile/me': 'real',         // 当前用户信息
  '/app/user/profile/username': 'real',   // 修改用户名
  '/app/user/profile/avatar': 'real',     // 上传头像
  
  // 分类相关接口 ✅
  '/app/content/category/list': 'real',   // 分类列表
  
  // ========== 如需使用 Mock 的接口，在这里配置为 'mock' ==========
  // 例如：
  // '/questions': 'mock',
  // '/answers': 'mock',
  
  // 其他接口不配置，跟随全局 USE_MOCK 设置
};

/**
 * 判断指定接口是否使用 Mock
 * @param {string} url - 接口路径
 * @returns {boolean} 是否使用 Mock
 */
export const shouldUseMock = (url) => {
  // 如果有具体配置，使用具体配置
  if (API_MODE_CONFIG[url] !== undefined) {
    const useMock = API_MODE_CONFIG[url] === 'mock';
    if (__DEV__) {
      console.log(`🔧 接口 ${url} 配置为: ${API_MODE_CONFIG[url]} (${useMock ? 'Mock' : '真实服务器'})`);
    }
    return useMock;
  }
  
  // 否则跟随全局配置
  return USE_MOCK;
};

// 环境配置
const ENV = {
  dev: {
    apiUrl: 'http://123.144.149.59:30560/qa-hero-app-user',
    contentApiUrl: 'http://123.144.149.59:30560/qa-hero-content',  // 内容服务
  },
  staging: {
    apiUrl: 'http://123.144.149.59:30560/qa-hero-app-user',
    contentApiUrl: 'http://123.144.149.59:30560/qa-hero-content',  // 内容服务
  },
  prod: {
    apiUrl: 'http://123.144.149.59:30560/qa-hero-app-user',
    contentApiUrl: 'http://123.144.149.59:30560/qa-hero-content',  // 内容服务
  },
  // Apifox Mock 环境（用于前端独立开发和测试）
  mock: {
    apiUrl: 'https://m1.apifoxmock.com/m1/7857964-7606903-default',
    contentApiUrl: 'https://m1.apifoxmock.com/m1/7857964-7606903-default',  // Mock环境使用同一个地址
  }
};

// 自动判断环境
const getEnvVars = () => {
  // 优先级 1: 如果开启了 Mock 模式，使用 Apifox Mock 环境
  if (USE_MOCK) {
    console.log('🔧 使用 Apifox Mock 环境');
    return ENV.mock;
  }
  
  // 优先级 2: 如果开启了模拟生产环境，返回生产配置
  if (SIMULATE_PRODUCTION) {
    console.log('🎭 使用生产环境配置（模拟模式）');
    return ENV.prod;
  }
  
  // 优先级 3: 通过 __DEV__ 判断是否为开发环境
  if (__DEV__) {
    return ENV.dev;
  }
  
  // 优先级 4: 通过 releaseChannel 判断环境
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  
  if (releaseChannel === 'staging') {
    return ENV.staging;
  }
  
  if (releaseChannel === 'production') {
    return ENV.prod;
  }
  
  // 默认返回生产环境（生产构建时）
  return ENV.prod;
};

// 导出环境配置和 Mock 标识
export default getEnvVars();
export { USE_MOCK, API_MODE_CONFIG };
