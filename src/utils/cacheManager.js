/**
 * 缓存管理器 - 今日头条式多级缓存策略
 * 
 * 缓存层级：
 * 1. 内存缓存（最快，5分钟有效期）
 * 2. AsyncStorage（快，1小时有效期）
 * 3. 网络请求（慢，实时数据）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// 内存缓存对象
const memoryCache = new Map();
const CACHE_IDENTITY_KEY = '@app_cache_identity_v1';

// 缓存配置
const CACHE_CONFIG = {
  MEMORY_TTL: 5 * 60 * 1000,      // 内存缓存：5分钟
  STORAGE_TTL: 60 * 60 * 1000,    // 本地存储：1小时
  MAX_MEMORY_SIZE: 50,             // 最大内存缓存条目数
};

/**
 * 生成缓存键
 */
const getCacheKey = (prefix, params = {}) => {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `cache_${prefix}_${paramStr}`;
};

/**
 * 检查缓存是否过期
 */
const isExpired = (timestamp, ttl) => {
  return Date.now() - timestamp > ttl;
};

/**
 * 清理过期的内存缓存
 */
const cleanExpiredMemoryCache = () => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (isExpired(value.timestamp, CACHE_CONFIG.MEMORY_TTL)) {
      memoryCache.delete(key);
    }
  }
  
  // 如果缓存条目过多，删除最旧的
  if (memoryCache.size > CACHE_CONFIG.MAX_MEMORY_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, memoryCache.size - CACHE_CONFIG.MAX_MEMORY_SIZE);
    toDelete.forEach(([key]) => memoryCache.delete(key));
  }
};

/**
 * 从内存缓存获取数据
 */
const getFromMemory = (key) => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (isExpired(cached.timestamp, CACHE_CONFIG.MEMORY_TTL)) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * 保存到内存缓存
 */
const saveToMemory = (key, data) => {
  cleanExpiredMemoryCache();
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * 从 AsyncStorage 获取数据
 */
const getFromStorage = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    if (isExpired(timestamp, CACHE_CONFIG.STORAGE_TTL)) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    // 同时保存到内存缓存
    saveToMemory(key, data);
    
    return data;
  } catch (error) {
    console.error('从 AsyncStorage 读取缓存失败:', error);
    return null;
  }
};

/**
 * 保存到 AsyncStorage
 */
const saveToStorage = async (key, data) => {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('保存到 AsyncStorage 失败:', error);
  }
};

/**
 * 获取缓存数据（多级缓存）
 * 
 * @param {string} prefix - 缓存前缀
 * @param {object} params - 缓存参数
 * @returns {Promise<any|null>} 缓存的数据或 null
 */
export const getCache = async (prefix, params = {}) => {
  const key = getCacheKey(prefix, params);
  
  // 1. 先查内存缓存
  const memoryData = getFromMemory(key);
  if (memoryData) {
    console.log(`✅ 命中内存缓存: ${key}`);
    return memoryData;
  }
  
  // 2. 再查 AsyncStorage
  const storageData = await getFromStorage(key);
  if (storageData) {
    console.log(`✅ 命中本地缓存: ${key}`);
    return storageData;
  }
  
  console.log(`❌ 缓存未命中: ${key}`);
  return null;
};

/**
 * 保存缓存数据（多级缓存）
 * 
 * @param {string} prefix - 缓存前缀
 * @param {object} params - 缓存参数
 * @param {any} data - 要缓存的数据
 */
export const setCache = async (prefix, params = {}, data) => {
  const key = getCacheKey(prefix, params);
  
  // 同时保存到内存和 AsyncStorage
  saveToMemory(key, data);
  await saveToStorage(key, data);
  
  console.log(`💾 已缓存: ${key}`);
};

/**
 * 清除指定缓存
 * 
 * @param {string} prefix - 缓存前缀
 * @param {object} params - 缓存参数
 */
export const clearCache = async (prefix, params = {}) => {
  const key = getCacheKey(prefix, params);
  
  // 清除内存缓存
  memoryCache.delete(key);
  
  // 清除 AsyncStorage
  try {
    await AsyncStorage.removeItem(key);
    console.log(`🗑️ 已清除缓存: ${key}`);
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
};

/**
 * 清除所有缓存
 */
export const clearAllCache = async () => {
  // 清除内存缓存
  memoryCache.clear();
  
  // 清除 AsyncStorage 中的所有缓存
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log(`🗑️ 已清除所有缓存 (${cacheKeys.length} 条)`);
  } catch (error) {
    console.error('清除所有缓存失败:', error);
  }
};

export const syncCacheIdentity = async (identity) => {
  if (!identity) {
    return {
      changed: false,
      previousIdentity: null,
      currentIdentity: null,
    };
  }

  try {
    const previousIdentity = await AsyncStorage.getItem(CACHE_IDENTITY_KEY);

    if (previousIdentity === identity) {
      return {
        changed: false,
        previousIdentity,
        currentIdentity: identity,
      };
    }

    await clearAllCache();
    await AsyncStorage.setItem(CACHE_IDENTITY_KEY, identity);

    return {
      changed: true,
      previousIdentity,
      currentIdentity: identity,
    };
  } catch (error) {
    console.error('同步缓存身份失败:', error);
    return {
      changed: false,
      previousIdentity: null,
      currentIdentity: identity,
      error,
    };
  }
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    
    return {
      memorySize: memoryCache.size,
      storageSize: cacheKeys.length,
      totalSize: memoryCache.size + cacheKeys.length,
    };
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return {
      memorySize: memoryCache.size,
      storageSize: 0,
      totalSize: memoryCache.size,
    };
  }
};
