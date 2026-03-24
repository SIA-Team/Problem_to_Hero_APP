import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

const UpdateDebugScreen = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadUpdateInfo();
  }, []);

  const loadUpdateInfo = () => {
    console.log('📊 加载更新信息...');
    console.log('Updates.updateId:', Updates.updateId);
    console.log('Updates.channel:', Updates.channel);
    console.log('Updates.runtimeVersion:', Updates.runtimeVersion);
    console.log('Updates.isEmbeddedLaunch:', Updates.isEmbeddedLaunch);
    
    const info = {
      // 当前运行的更新信息
      currentUpdateId: Updates.updateId || '未知',
      currentChannel: Updates.channel || '未知',
      currentRuntimeVersion: Updates.runtimeVersion || '未知',
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
      
      // 应用配置信息
      appVersion: Constants.expoConfig?.version || Constants.manifest?.version || '未知',
      runtimeVersion: Constants.expoConfig?.runtimeVersion || Constants.manifest?.runtimeVersion || '未知',
      releaseChannel: Constants.expoConfig?.releaseChannel || Constants.manifest?.releaseChannel || '未设置',
      
      // 更新配置
      updatesEnabled: Constants.expoConfig?.updates?.enabled ?? Constants.manifest?.updates?.enabled ?? false,
      checkAutomatically: Constants.expoConfig?.updates?.checkAutomatically || Constants.manifest?.updates?.checkAutomatically || '未设置',
      updateUrl: Constants.expoConfig?.updates?.url || Constants.manifest?.updates?.url || '未设置',
    };
    
    console.log('📊 更新信息:', JSON.stringify(info, null, 2));
    setUpdateInfo(info);
  };

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      
      // 检查更新
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          '发现新版本',
          '是否立即下载并重启应用？',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '更新', 
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert('更新成功', '应用将重启', [
                    { text: '确定', onPress: () => Updates.reloadAsync() }
                  ]);
                } catch (error) {
                  Alert.alert('更新失败', error.message);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('提示', '当前已是最新版本');
      }
    } catch (error) {
      Alert.alert('检查更新失败', error.message);
    } finally {
      setChecking(false);
    }
  };

  const reloadApp = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      Alert.alert('重启失败', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>热更新调试信息</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前运行版本</Text>
          <InfoRow label="Update ID" value={updateInfo?.currentUpdateId || '未知'} />
          <InfoRow label="Channel" value={updateInfo?.currentChannel || '未知'} />
          <InfoRow label="Runtime Version" value={updateInfo?.currentRuntimeVersion || '未知'} />
          <InfoRow 
            label="启动方式" 
            value={updateInfo?.isEmbeddedLaunch ? '内置版本' : '热更新版本'} 
          />
          <InfoRow 
            label="紧急启动" 
            value={updateInfo?.isEmergencyLaunch ? '是' : '否'} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>应用配置</Text>
          <InfoRow label="App Version" value={updateInfo?.appVersion || '未知'} />
          <InfoRow label="Runtime Version" value={updateInfo?.runtimeVersion || '未知'} />
          <InfoRow label="Release Channel" value={updateInfo?.releaseChannel || '未设置'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>更新配置</Text>
          <InfoRow 
            label="更新已启用" 
            value={updateInfo?.updatesEnabled ? '是' : '否'} 
          />
          <InfoRow 
            label="自动检查" 
            value={updateInfo?.checkAutomatically || '未设置'} 
          />
          <InfoRow 
            label="更新服务器" 
            value={updateInfo?.updateUrl || '未设置'} 
            multiline 
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, checking && styles.buttonDisabled]} 
          onPress={checkForUpdates}
          disabled={checking}
        >
          <Text style={styles.buttonText}>
            {checking ? '检查中...' : '手动检查更新'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={reloadApp}
        >
          <Text style={styles.buttonText}>重启应用</Text>
        </TouchableOpacity>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 提示</Text>
          <Text style={styles.tipsText}>
            • 如果"启动方式"显示"内置版本"，说明还没有收到热更新{'\n'}
            • 如果显示"热更新版本"，说明已经使用了热更新{'\n'}
            • Update ID 会在每次热更新后改变{'\n'}
            • 完全关闭应用后重新打开才会检查更新
          </Text>
        </View>

        <View style={styles.verifySection}>
          <Text style={styles.verifySectionTitle}>🔍 如何验证热更新生效</Text>
          <View style={styles.verifyCard}>
            <Text style={styles.verifyStep}>1. 记录当前的 Update ID</Text>
            <Text style={styles.verifyStep}>2. 在电脑上发布新的热更新</Text>
            <Text style={styles.verifyStep}>3. 完全关闭应用（从后台清除）</Text>
            <Text style={styles.verifyStep}>4. 重新打开应用</Text>
            <Text style={styles.verifyStep}>5. 如果 Update ID 改变了 = 热更新成功 ✅</Text>
          </View>
          <View style={styles.verifyNote}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.verifyNoteText}>
              热更新不会改变 APK 文件本身，只会下载新的 JavaScript 代码。
              在手机的"应用管理"中看到的版本号不会变化。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, multiline }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 140,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoValueMultiline: {
    fontSize: 12,
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tips: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#856404',
  },
  tipsText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  verifySection: {
    marginTop: 16,
    marginBottom: 20,
  },
  verifySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  verifyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  verifyStep: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
    paddingLeft: 8,
  },
  verifyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  verifyNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});

export default UpdateDebugScreen;
