import React, { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { showAppAlert } from '../utils/appAlert';

/**
 * 更新检查组件
 * 在 App 启动时检查更新，并提示用户
 */
const UpdateChecker = () => {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    // 开发环境不检查更新
    if (__DEV__) {
      console.log('开发环境，跳过更新检查');
      return;
    }

    // 避免重复检查
    if (checking) return;
    setChecking(true);

    try {
      console.log('🔍 检查更新...');
      
      // 检查是否有可用更新
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('✅ 发现新版本');
        
        // 提示用户
        showAppAlert(
          '发现新版本',
          '我们发布了新版本，包含功能改进和问题修复。是否立即更新？',
          [
            {
              text: '稍后',
              style: 'cancel',
              onPress: () => {
                console.log('用户选择稍后更新');
                // 后台静默下载，下次启动时生效
                Updates.fetchUpdateAsync().catch(err => {
                  console.error('后台下载更新失败:', err);
                });
              }
            },
            {
              text: '立即更新',
              onPress: async () => {
                try {
                  console.log('开始下载更新...');
                  
                  // 显示下载提示
                  showAppAlert('正在更新', '正在下载新版本，请稍候...');
                  
                  // 下载更新
                  await Updates.fetchUpdateAsync();
                  
                  console.log('✅ 下载完成，准备重启');
                  
                  // 重启应用以应用更新
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error('更新失败:', error);
                  showAppAlert('更新失败', '下载更新时出错，请稍后重试');
                }
              }
            }
          ]
        );
      } else {
        console.log('✅ 已是最新版本');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      // 静默失败，不影响用户使用
    } finally {
      setChecking(false);
    }
  };

  // 这个组件不渲染任何 UI
  return null;
};

export default UpdateChecker;
