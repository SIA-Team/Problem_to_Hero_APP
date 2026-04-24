import React, { useEffect, useRef, useState } from 'react';
import * as Updates from 'expo-updates';
import { InteractionManager } from 'react-native';
import { showAppAlert } from '../utils/appAlert';

const UpdateChecker = ({ enabled = true }) => {
  const [checking, setChecking] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasCheckedRef.current) {
      return;
    }

    let timer = null;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        hasCheckedRef.current = true;
        checkForUpdates();
      }, 1500);
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      interactionTask.cancel();
    };
  }, [enabled]);

  const fetchAndApplyUpdate = async () => {
    const result = await Updates.fetchUpdateAsync();

    if (result.isRollBackToEmbedded) {
      console.log('Detected rollback directive, reloading embedded bundle');
      await Updates.reloadAsync();
      return;
    }

    if (result.isNew) {
      console.log('Downloaded new OTA update, reloading app');
      await Updates.reloadAsync();
      return;
    }

    showAppAlert('更新未生效', '本次没有拿到可应用的新更新，请稍后再试。');
  };

  const checkForUpdates = async () => {
    if (__DEV__ || !enabled) {
      console.log('Skip OTA check in development or before app is ready');
      return;
    }

    if (!Updates.isEnabled) {
      console.log('expo-updates is disabled, skipping OTA check');
      return;
    }

    if (Updates.isEmergencyLaunch) {
      console.log('Emergency launch detected, skip proactive OTA check this time');
      return;
    }

    if (checking) {
      return;
    }

    setChecking(true);

    try {
      console.log('Checking for OTA update...');
      const update = await Updates.checkForUpdateAsync();

      if (update.isRollBackToEmbedded) {
        showAppAlert(
          '检测到回退修复',
          '服务端要求回退到安装包内置版本。是否现在重启应用完成恢复？',
          [
            { text: '稍后', style: 'cancel' },
            {
              text: '立即恢复',
              onPress: async () => {
                try {
                  await fetchAndApplyUpdate();
                } catch (error) {
                  console.error('Failed to roll back to embedded update:', error);
                  showAppAlert('恢复失败', '切换回稳定版本失败，请稍后重试。');
                }
              },
            },
          ]
        );
        return;
      }

      if (!update.isAvailable) {
        console.log('No OTA update available');
        return;
      }

      showAppAlert(
        '发现新版本',
        '检测到新的热更新包。建议现在完成更新，避免继续运行到有问题的旧包。',
        [
          {
            text: '稍后',
            style: 'cancel',
            onPress: () => {
              Updates.fetchUpdateAsync().catch((error) => {
                console.error('Failed to prefetch OTA update in background:', error);
              });
            },
          },
          {
            text: '立即更新',
            onPress: async () => {
              try {
                showAppAlert('正在更新', '正在下载热更新，请稍候...');
                await fetchAndApplyUpdate();
              } catch (error) {
                console.error('Failed to apply OTA update:', error);
                showAppAlert('更新失败', '下载或应用热更新时出错，请稍后重试。');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to check for OTA update:', error);
    } finally {
      setChecking(false);
    }
  };

  return null;
};

export default UpdateChecker;
