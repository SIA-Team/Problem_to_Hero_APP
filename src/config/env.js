import Constants from 'expo-constants';
import { SIMULATE_PRODUCTION } from './debugMode';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_SELECTION_KEY = '@app_server_selection';
const CUSTOM_SERVER_URL_KEY = '@app_custom_server_url';

// 微服务名称配置
const SERVICES = {
  CONTENT: 'qa-hero-content',
  USER: 'qa-hero-app-user',
};

// 构建带服务前缀的路径
const buildServicePath = (serviceName, path) => `/${serviceName}${path}`;

// 动态服务器选择（用于开发阶段切换服务器）
let DYNAMIC_SERVER = 'server2'; // 默认使用生产服务器
let CUSTOM_SERVER_URL = '';
let serverLoaded = false;

const normalizeServerUrl = (url) => {
  if (!url) {
    return '';
  }

  return url.trim().replace(/\/+$/, '');
};

export const FIXED_GROUP_SERVER_URL = 'http://8.146.230.62:8080';

const getServerLabel = (server) => {
  switch (server) {
    case 'server1':
      return '开发服务器 (116.168.31.142:30560)';
    case 'server2':
      return '生产服务器 (8.146.230.62:8080)';
    case 'custom':
      return CUSTOM_SERVER_URL
        ? `自定义服务器 (${CUSTOM_SERVER_URL})`
        : '自定义服务器 (未配置地址)';
    default:
      return `未知服务器 (${server})`;
  }
};

// 从AsyncStorage加载服务器选择
const loadServerSelection = async () => {
  try {
    const [server, customUrl] = await Promise.all([
      AsyncStorage.getItem(SERVER_SELECTION_KEY),
      AsyncStorage.getItem(CUSTOM_SERVER_URL_KEY),
    ]);

    CUSTOM_SERVER_URL = normalizeServerUrl(customUrl);

    if (server) {
      DYNAMIC_SERVER = server;
      console.log('📡 使用服务器:', getServerLabel(server));
    } else {
      console.log('📡 使用默认服务器: 生产服务器 (8.146.230.62:8080)');
    }
    serverLoaded = true;
  } catch (error) {
    console.error('加载服务器配置失败:', error);
    serverLoaded = true; // 即使失败也标记为已加载，使用默认值
  }
};

// 获取当前服务器配置（同步版本，用于配置中的函数调用）
const getCurrentServerSync = () => {
  return DYNAMIC_SERVER;
};

const getCustomServerUrlSync = () => {
  return CUSTOM_SERVER_URL;
};

// 立即加载服务器选择
loadServerSelection();

// 导出函数供外部更新
export const updateDynamicServer = (server, customUrl = '') => {
  DYNAMIC_SERVER = server;
  if (server === 'custom') {
    CUSTOM_SERVER_URL = normalizeServerUrl(customUrl);
  }
  console.log('📡 切换服务器:', getServerLabel(server));
};

/**
 * 接口服务器地址配置
 * 支持不同接口使用不同的服务器地址
 * 
 * 配置方式：
 * - 'server1': 使用 http://116.168.31.142:30560 (开发服务器，备用)
 * - 'server2': 使用 http://8.146.230.62:8080 (生产服务器，当前默认)
 * - 不配置：使用默认服务器地址 (当前为生产服务器 server2)
 * 
 * 当前状态：所有接口都使用生产服务器，开发服务器配置已准备好供将来使用
 */
const API_SERVER_CONFIG = {
  // ========== 使用动态服务器选择（通过ServerSwitcher组件切换） ==========
  
  // 认证相关接口
  [buildServicePath(SERVICES.USER, '/app/user/auth/register')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/auth/login')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/auth/token-login')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/auth/logout')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/auth/refresh')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/auth/password')]: getCurrentServerSync,
  
  // 用户相关接口
  [buildServicePath(SERVICES.USER, '/app/user/profile')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/profile/me')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/profile/public/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/profile/username')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/user/profile/avatar')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/wallet/balance')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/group/public/question/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/team/public/question/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/group/public/ids/question/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/group-message/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/group-message/create')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/content/emergency-help/quota')]: getCurrentServerSync,
  [buildServicePath(SERVICES.USER, '/app/content/emergency-help/publish')]: getCurrentServerSync,
  
  // 分类相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/category/list')]: getCurrentServerSync,
  
  // 问题相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/detail')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*')]: getCurrentServerSync,  // 添加动态路径支持问题详情
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/publish')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/draft')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/drafts')]: getCurrentServerSync,
  
  // 问题互动接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/like')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/unlike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/dislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/undislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/collect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/question/*/uncollect')]: getCurrentServerSync,
  
  // 回答相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/question/*/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/question/*')]: getCurrentServerSync,
  
  // 回答互动接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/like')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/unlike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/dislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/undislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/collect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/*/uncollect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer/question/*/accept/*')]: getCurrentServerSync,
  
  // 补充相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/question/*/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/question/*')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/dislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/undislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/like')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/unlike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/collect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/supplement/*/uncollect')]: getCurrentServerSync,
  
  // 补充回答相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer-supplement/answer/*/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/answer-supplement/answer/*')]: getCurrentServerSync,
  
  // 上传相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/image/upload')]: getCurrentServerSync,

  // 活动相关接口（不使用微服务前缀）
  '/app/activity/list': getCurrentServerSync,
  '/app/activity/*': getCurrentServerSync,
  
  // 评论相关接口
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/list')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/like')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/unlike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/collect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/uncollect')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/dislike')]: getCurrentServerSync,
  [buildServicePath(SERVICES.CONTENT, '/app/content/comment/*/undislike')]: getCurrentServerSync,
};

const resolveServerUrl = (serverType, currentEnv) => {
  if (typeof serverType === 'string' && /^https?:\/\//i.test(serverType)) {
    return normalizeServerUrl(serverType);
  }

  switch (serverType) {
    case 'server1':
      return currentEnv.server1Url;
    case 'server2':
      return currentEnv.server2Url;
    case 'custom':
      return getCustomServerUrlSync() || currentEnv.apiUrl;
    default:
      return currentEnv.apiUrl;
  }
};

/**
 * 获取指定接口的服务器地址
 * @param {string} url - 接口路径
 * @returns {string} 服务器地址
 */
export const getApiServerUrl = (url) => {
  // 检查是否有特定的服务器配置
  let serverConfig = API_SERVER_CONFIG[url];
  
  // 如果配置是函数，调用它获取实际的服务器类型
  if (typeof serverConfig === 'function') {
    serverConfig = serverConfig();
  }
  
  if (serverConfig) {
    const currentEnv = getEnvVars();
    return resolveServerUrl(serverConfig, currentEnv);
  }
  
  // 支持通配符匹配（用于动态路径如 /app/content/answer/question/123/accept/456）
  for (const [pattern, serverType] of Object.entries(API_SERVER_CONFIG)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
      if (regex.test(url)) {
        const currentEnv = getEnvVars();
        // 如果配置是函数，调用它获取实际的服务器类型
        const actualServerType = typeof serverType === 'function' ? serverType() : serverType;
        return resolveServerUrl(actualServerType, currentEnv);
      }
    }
  }
  
  // 默认使用主服务器地址
  const currentEnv = getEnvVars();
  return resolveServerUrl(getCurrentServerSync(), currentEnv);
};

// 环境配置
const ENV = {
  dev: {
    apiUrl: 'http://8.146.230.62:8080',           // 默认API地址（生产服务器）
    contentApiUrl: 'http://8.146.230.62:8080',    // 内容服务
    server1Url: 'http://116.168.31.142:30560',    // 开发服务器（备用）
    server2Url: 'http://8.146.230.62:8080',       // 生产服务器
  },
  staging: {
    apiUrl: 'http://8.146.230.62:8080',
    contentApiUrl: 'http://8.146.230.62:8080',  // 内容服务
    server1Url: 'http://116.168.31.142:30560',  // 开发服务器（备用）
    server2Url: 'http://8.146.230.62:8080',     // 生产服务器
  },
  prod: {
    apiUrl: 'http://8.146.230.62:8080',
    contentApiUrl: 'http://8.146.230.62:8080',  // 内容服务
    server1Url: 'http://116.168.31.142:30560',  // 开发服务器（备用）
    server2Url: 'http://8.146.230.62:8080',     // 生产服务器
  }
};

// 自动判断环境
const getEnvVars = () => {
  // 优先级 1: 如果开启了模拟生产环境，返回生产配置
  if (SIMULATE_PRODUCTION) {
    console.log('使用生产环境配置（模拟模式）');
    return ENV.prod;
  }
  
  // 优先级 2: 通过 __DEV__ 判断是否为开发环境
  if (__DEV__) {
    return ENV.dev;
  }
  
  // 优先级 3: 通过 releaseChannel 判断环境
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
export { API_SERVER_CONFIG };
