import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 本地 Mock 数据服务
 * 用于在 Mock 环境下模拟真实的用户数据持久化
 * 解决 Apifox Mock 每次返回随机数据的问题
 */
class LocalMockService {
  // 本地 Mock 用户数据存储键
  static MOCK_USERS_KEY = 'localMockUsers';
  
  // 当前登录用户的用户名存储键
  static CURRENT_USER_KEY = 'localMockCurrentUser';

  /**
   * 初始化本地 Mock 数据
   */
  static async initialize() {
    try {
      const users = await this.getAllUsers();
      if (!users || Object.keys(users).length === 0) {
        console.log('🔧 初始化本地 Mock 用户数据库');
        await AsyncStorage.setItem(this.MOCK_USERS_KEY, JSON.stringify({}));
      }
    } catch (error) {
      console.error('❌ 初始化本地 Mock 数据失败:', error);
    }
  }

  /**
   * 获取所有本地 Mock 用户
   * @returns {Promise<Object>} 用户数据对象 {username: userData}
   */
  static async getAllUsers() {
    try {
      const data = await AsyncStorage.getItem(this.MOCK_USERS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ 获取本地 Mock 用户失败:', error);
      return {};
    }
  }

  /**
   * 保存用户到本地 Mock 数据库
   * @param {string} username - 用户名
   * @param {Object} userData - 用户数据
   */
  static async saveUser(username, userData) {
    try {
      const users = await this.getAllUsers();
      users[username] = {
        ...userData,
        _savedAt: Date.now(),
      };
      await AsyncStorage.setItem(this.MOCK_USERS_KEY, JSON.stringify(users));
      console.log('✅ 用户已保存到本地 Mock 数据库:', username);
    } catch (error) {
      console.error('❌ 保存用户到本地 Mock 数据库失败:', error);
    }
  }

  /**
   * 从本地 Mock 数据库获取用户
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 用户数据
   */
  static async getUser(username) {
    try {
      const users = await this.getAllUsers();
      return users[username] || null;
    } catch (error) {
      console.error('❌ 从本地 Mock 数据库获取用户失败:', error);
      return null;
    }
  }

  /**
   * 设置当前登录用户
   * @param {string} username - 用户名
   */
  static async setCurrentUser(username) {
    try {
      await AsyncStorage.setItem(this.CURRENT_USER_KEY, username);
      console.log('✅ 当前登录用户已设置:', username);
    } catch (error) {
      console.error('❌ 设置当前登录用户失败:', error);
    }
  }

  /**
   * 获取当前登录用户名
   * @returns {Promise<string|null>} 用户名
   */
  static async getCurrentUser() {
    try {
      return await AsyncStorage.getItem(this.CURRENT_USER_KEY);
    } catch (error) {
      console.error('❌ 获取当前登录用户失败:', error);
      return null;
    }
  }

  /**
   * 清除当前登录用户
   */
  static async clearCurrentUser() {
    try {
      await AsyncStorage.removeItem(this.CURRENT_USER_KEY);
      console.log('✅ 当前登录用户已清除');
    } catch (error) {
      console.error('❌ 清除当前登录用户失败:', error);
    }
  }

  /**
   * 处理注册响应（Mock 环境）
   * 将 Apifox 返回的随机数据保存到本地，下次登录时返回相同数据
   * @param {Object} response - API 响应
   * @returns {Promise<Object>} 处理后的响应
   */
  static async handleRegisterResponse(response) {
    if (!response || !response.data || !response.data.userBaseInfo) {
      return response;
    }

    const username = response.data.userBaseInfo.username;
    const existingUser = await this.getUser(username);

    if (existingUser) {
      // 用户已存在，返回已保存的数据
      console.log('🔧 Mock 环境：用户已存在，返回已保存的数据');
      return {
        ...response,
        data: {
          ...response.data,
          userBaseInfo: existingUser,
        },
      };
    } else {
      // 新用户，保存数据
      console.log('🔧 Mock 环境：新用户，保存数据到本地');
      await this.saveUser(username, response.data.userBaseInfo);
      await this.setCurrentUser(username);
      return response;
    }
  }

  /**
   * 处理登录响应（Mock 环境）
   * 如果用户已存在，返回已保存的数据；否则保存新数据
   * @param {string} username - 用户名
   * @param {Object} response - API 响应
   * @returns {Promise<Object>} 处理后的响应
   */
  static async handleLoginResponse(username, response) {
    if (!response || !response.data || !response.data.userBaseInfo) {
      return response;
    }

    const existingUser = await this.getUser(username);

    if (existingUser) {
      // 用户已存在，返回已保存的数据
      console.log('🔧 Mock 环境：返回已保存的用户数据');
      await this.setCurrentUser(username);
      return {
        ...response,
        data: {
          ...response.data,
          userBaseInfo: existingUser,
        },
      };
    } else {
      // 新用户，保存数据
      console.log('🔧 Mock 环境：首次登录，保存用户数据');
      await this.saveUser(username, response.data.userBaseInfo);
      await this.setCurrentUser(username);
      return response;
    }
  }

  /**
   * 处理 Token 登录响应（Mock 环境）
   * 返回当前登录用户的数据
   * @param {Object} response - API 响应
   * @returns {Promise<Object>} 处理后的响应
   */
  static async handleTokenLoginResponse(response) {
    if (!response || !response.data || !response.data.userBaseInfo) {
      return response;
    }

    const currentUsername = await this.getCurrentUser();
    
    if (currentUsername) {
      const existingUser = await this.getUser(currentUsername);
      
      if (existingUser) {
        // 返回已保存的用户数据
        console.log('🔧 Mock 环境：Token 登录，返回已保存的用户数据');
        return {
          ...response,
          data: {
            ...response.data,
            username: currentUsername,
            userBaseInfo: existingUser,
          },
        };
      }
    }

    // 没有找到已保存的用户，保存当前返回的数据
    console.log('🔧 Mock 环境：Token 登录，保存新用户数据');
    const username = response.data.userBaseInfo.username;
    await this.saveUser(username, response.data.userBaseInfo);
    await this.setCurrentUser(username);
    return response;
  }

  /**
   * 处理获取用户信息响应（Mock 环境）
   * 返回当前登录用户的数据
   * @param {Object} response - API 响应
   * @returns {Promise<Object>} 处理后的响应
   */
  static async handleGetProfileResponse(response) {
    if (!response || !response.data) {
      return response;
    }

    const currentUsername = await this.getCurrentUser();
    
    if (currentUsername) {
      const existingUser = await this.getUser(currentUsername);
      
      if (existingUser) {
        // 返回已保存的用户数据
        console.log('🔧 Mock 环境：获取用户信息，返回已保存的数据');
        return {
          ...response,
          data: existingUser,
        };
      }
    }

    // 没有找到已保存的用户，保存当前返回的数据
    console.log('🔧 Mock 环境：获取用户信息，保存新数据');
    const username = response.data.username;
    if (username) {
      await this.saveUser(username, response.data);
      await this.setCurrentUser(username);
    }
    return response;
  }

  /**
   * 更新用户信息（Mock 环境）
   * @param {string} username - 用户名
   * @param {Object} updates - 更新的字段
   */
  static async updateUser(username, updates) {
    try {
      const user = await this.getUser(username);
      if (user) {
        const updatedUser = { ...user, ...updates };
        await this.saveUser(username, updatedUser);
        console.log('✅ 用户信息已更新:', username);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('❌ 更新用户信息失败:', error);
      return null;
    }
  }

  /**
   * 清除所有本地 Mock 数据（用于测试）
   */
  static async clearAll() {
    try {
      await AsyncStorage.multiRemove([this.MOCK_USERS_KEY, this.CURRENT_USER_KEY]);
      console.log('✅ 所有本地 Mock 数据已清除');
    } catch (error) {
      console.error('❌ 清除本地 Mock 数据失败:', error);
    }
  }

  /**
   * 打印所有本地 Mock 用户（用于调试）
   */
  static async debugPrintUsers() {
    const users = await this.getAllUsers();
    const currentUser = await this.getCurrentUser();
    console.log('🔍 本地 Mock 用户数据库:');
    console.log('   当前登录用户:', currentUser);
    console.log('   所有用户:', Object.keys(users));
    console.log('   详细数据:', JSON.stringify(users, null, 2));
  }
}

export default LocalMockService;
