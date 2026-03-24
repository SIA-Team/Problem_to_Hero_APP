import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDynamicServer } from '../config/env';
import { clearAllCache } from './cacheManager';

const SERVER_KEY = '@app_server_selection';
const CUSTOM_SERVER_URL_KEY = '@app_custom_server_url';

const normalizeServerUrl = (url) => {
  if (!url) {
    return '';
  }

  return url.trim().replace(/\/+$/, '');
};

export const SERVERS = {
  SERVER1: {
    name: '开发服务器',
    url: 'http://123.144.149.59:30560',
    key: 'server1'
  },
  SERVER2: {
    name: '生产服务器',
    url: 'http://8.146.230.62:8080',
    key: 'server2'
  },
  CUSTOM: {
    name: '自定义服务器',
    url: '',
    key: 'custom'
  }
};

/**
 * 获取当前选择的服务器
 */
export const getCurrentServer = async () => {
  try {
    const server = await AsyncStorage.getItem(SERVER_KEY);
    return server || 'server2'; // 默认使用生产服务器
  } catch (error) {
    console.error('获取服务器配置失败:', error);
    return 'server2';
  }
};

/**
 * 设置当前服务器
 */
export const setCurrentServer = async (serverKey) => {
  try {
    await AsyncStorage.setItem(SERVER_KEY, serverKey);
    await clearAllCache();
    console.log('🧹 服务器切换后已清理业务缓存');
    return true;
  } catch (error) {
    console.error('保存服务器配置失败:', error);
    return false;
  }
};

/**
 * 获取自定义服务器地址
 */
export const getCustomServerUrl = async () => {
  try {
    const url = await AsyncStorage.getItem(CUSTOM_SERVER_URL_KEY);
    return normalizeServerUrl(url);
  } catch (error) {
    console.error('获取自定义服务器地址失败:', error);
    return '';
  }
};

/**
 * 设置自定义服务器地址
 */
export const setCustomServerUrl = async (url) => {
  try {
    await AsyncStorage.setItem(CUSTOM_SERVER_URL_KEY, normalizeServerUrl(url));
    return true;
  } catch (error) {
    console.error('保存自定义服务器地址失败:', error);
    return false;
  }
};

/**
 * 切换服务器并立即生效
 */
export const switchServerAndReload = async (serverKey, customUrl = '') => {
  try {
    console.log('🔄 开始切换服务器...');
    console.log('   目标服务器:', serverKey);
    
    // 保存到 AsyncStorage
    await setCurrentServer(serverKey);
    
    // 如果是自定义服务器，保存自定义地址
    if (serverKey === 'custom') {
      const normalizedCustomUrl = normalizeServerUrl(customUrl);
      if (!normalizedCustomUrl) {
        console.error('❌ 自定义服务器地址为空');
        return false;
      }
      await setCustomServerUrl(normalizedCustomUrl);
      console.log('   自定义地址:', normalizedCustomUrl);
      
      // 立即更新内存中的配置
      updateDynamicServer(serverKey, normalizedCustomUrl);
    } else {
      // 立即更新内存中的配置
      updateDynamicServer(serverKey);
    }
    
    console.log('✅ 服务器切换成功，配置已立即生效');
    return true;
  } catch (error) {
    console.error('❌ 切换服务器失败:', error);
    return false;
  }
};
