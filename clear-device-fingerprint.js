/**
 * 清除设备指纹脚本
 * 运行此脚本后，应用会认为是首次使用，自动注册新账号
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const clearDeviceFingerprint = async () => {
  try {
    console.log('🗑️ 开始清除设备指纹和登录信息...');
    
    await AsyncStorage.multiRemove([
      'deviceFingerprint',
      'authToken',
      'refreshToken',
      'userInfo',
      'lastLoginUsername'
    ]);
    
    console.log('✅ 清除成功！');
    console.log('📱 请重启应用，将自动注册新账号');
  } catch (error) {
    console.error('❌ 清除失败:', error);
  }
};

clearDeviceFingerprint();
