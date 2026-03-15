import Constants from 'expo-constants';
import { SIMULATE_PRODUCTION } from './debugMode';

/**
 * 环境切换配置
 * USE_MOCK: 设置为 true 使用 Apifox Mock 环境（用于前端独立开发）
 * SIMULATE_PRODUCTION: 设置为 true 模拟生产环境（用于开发环境测试生产逻辑）
 */
const USE_MOCK = false;  // 改为 false 使用真实服务器

/**
 * 接口服务器地址配置
 * 支持不同接口使用不同的服务器地址
 * 
 * 配置方式：
 * - 'server1': 使用 http://123.144.149.59:30560 (开发服务器，备用)
 * - 'server2': 使用 http://8.146.230.62:8080 (生产服务器，当前默认)
 * - 'mock': 使用 Mock 服务器
 * - 不配置：使用默认服务器地址 (当前为生产服务器 server2)
 * 
 * 当前状态：所有接口都使用生产服务器，开发服务器配置已准备好供将来使用
 */
const API_SERVER_CONFIG = {
  // ========== 当前所有接口都使用生产服务器 (http://8.146.230.62:8080) ==========
  
  // 如需将特定接口切换到开发服务器，取消下面的注释并修改对应接口：
  
  // 认证相关接口
  // '/app/user/auth/register': 'server1',      // 注册接口
  // '/app/user/auth/login': 'server1',         // 登录接口
  // '/app/user/auth/token-login': 'server1',   // Token登录
  // '/app/user/auth/logout': 'server1',        // 退出登录
  // '/app/user/auth/password': 'server1',      // 修改密码
  
  // 用户相关接口
  // '/app/user/profile': 'server1',            // 用户资料
  // '/app/user/profile/me': 'server1',         // 当前用户信息
  // '/app/user/profile/username': 'server1',   // 修改用户名
  // '/app/user/profile/avatar': 'server1',     // 上传头像
  
  // 分类相关接口
  // '/app/content/category/list': 'server1',   // 分类列表
  
  // 问题相关接口
  // '/app/content/question/list': 'server1',           // 问题列表
  // '/app/content/question/detail': 'server1',         // 问题详情
  // '/app/content/question/publish': 'server1',        // 发布问题
  // '/app/content/question/draft': 'server1',          // 草稿相关
  
  // 回答相关接口
  // '/app/content/answer/list': 'server1',             // 回答列表
  // '/app/content/answer/detail': 'server1',           // 回答详情
  // '/app/content/answer/like': 'server1',             // 点赞回答
  // '/app/content/answer/dislike': 'server1',          // 点踩回答
  // '/app/content/answer/collect': 'server1',          // 收藏回答
  // '/app/content/answer/question/*/accept/*': 'server1', // 采纳回答（支持动态路径）
  
  // 补充相关接口
  // '/app/content/supplement/list': 'server1',         // 补充列表
  
  // ========== 如需使用 Mock 的接口，在这里配置为 'mock' ==========
  // 例如：
  // '/some/api': 'mock',
  
  // 其他接口不配置，使用默认服务器地址 (当前为生产服务器)
};

/**
 * 获取指定接口的服务器地址
 * @param {string} url - 接口路径
 * @returns {string} 服务器地址
 */
export const getApiServerUrl = (url) => {
  // 如果使用 Mock 模式，直接返回 Mock 地址
  if (USE_MOCK) {
    return ENV.mock.apiUrl;
  }
  
  // 检查是否有特定的服务器配置
  const serverConfig = API_SERVER_CONFIG[url];
  
  if (serverConfig) {
    const currentEnv = getEnvVars();
    
    switch (serverConfig) {
      case 'server1':
        return currentEnv.server1Url;
      case 'server2':
        return currentEnv.server2Url;
      case 'mock':
        return ENV.mock.apiUrl;
      default:
        return currentEnv.apiUrl;
    }
  }
  
  // 支持通配符匹配（用于动态路径如 /app/content/answer/question/123/accept/456）
  for (const [pattern, serverType] of Object.entries(API_SERVER_CONFIG)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
      if (regex.test(url)) {
        const currentEnv = getEnvVars();
        switch (serverType) {
          case 'server1':
            return currentEnv.server1Url;
          case 'server2':
            return currentEnv.server2Url;
          case 'mock':
            return ENV.mock.apiUrl;
          default:
            return currentEnv.apiUrl;
        }
      }
    }
  }
  
  // 默认使用主服务器地址
  return getEnvVars().apiUrl;
};

/**
 * 判断指定接口是否使用 Mock（保持向后兼容）
 * @param {string} url - 接口路径
 * @returns {boolean} 是否使用 Mock
 */
export const shouldUseMock = (url) => {
  // 如果全局开启 Mock，直接返回 true
  if (USE_MOCK) {
    return true;
  }
  
  // 检查特定接口是否配置为 Mock
  const serverConfig = API_SERVER_CONFIG[url];
  if (serverConfig === 'mock') {
    return true;
  }
  
  // 支持通配符匹配
  for (const [pattern, serverType] of Object.entries(API_SERVER_CONFIG)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
      if (regex.test(url) && serverType === 'mock') {
        return true;
      }
    }
  }
  
  return false;
};

// 环境配置
const ENV = {
  dev: {
    apiUrl: 'http://8.146.230.62:8080',           // 默认API地址（生产服务器）
    contentApiUrl: 'http://8.146.230.62:8080',    // 内容服务
    server1Url: 'http://123.144.149.59:30560',    // 开发服务器（备用）
    server2Url: 'http://8.146.230.62:8080',       // 生产服务器
  },
  staging: {
    apiUrl: 'http://8.146.230.62:8080',
    contentApiUrl: 'http://8.146.230.62:8080',  // 内容服务
    server1Url: 'http://123.144.149.59:30560',  // 开发服务器（备用）
    server2Url: 'http://8.146.230.62:8080',     // 生产服务器
  },
  prod: {
    apiUrl: 'http://8.146.230.62:8080',
    contentApiUrl: 'http://8.146.230.62:8080',  // 内容服务
    server1Url: 'http://8.146.230.62:8080',     // 生产环境统一使用生产服务器
    server2Url: 'http://8.146.230.62:8080',     // 生产环境统一使用生产服务器
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
    console.log('使用 Apifox Mock 环境');
    return ENV.mock;
  }
  
  // 优先级 2: 如果开启了模拟生产环境，返回生产配置
  if (SIMULATE_PRODUCTION) {
    console.log('使用生产环境配置（模拟模式）');
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

// 导出环境配置和相关函数
export default getEnvVars();
export { USE_MOCK, API_SERVER_CONFIG };
