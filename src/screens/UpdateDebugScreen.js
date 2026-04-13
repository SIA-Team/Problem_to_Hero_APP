import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import {
  getCurrentBundleFingerprint,
  getOtaLaunchInfo,
  loadRecentOtaErrors,
} from '../utils/otaDiagnostics';

const UpdateDebugScreen = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadUpdateInfo();
  }, []);

  const loadUpdateInfo = async () => {
    const launchInfo = getOtaLaunchInfo();
    const logs = await loadRecentOtaErrors();

    const info = {
      ...launchInfo,
      bundleFingerprint: getCurrentBundleFingerprint(),
      appVersion:
        Constants.expoConfig?.version || Constants.manifest?.version || 'unknown',
      configRuntimeVersion:
        Constants.expoConfig?.runtimeVersion ||
        Constants.manifest?.runtimeVersion ||
        'unknown',
      releaseChannel:
        Constants.expoConfig?.releaseChannel ||
        Constants.manifest?.releaseChannel ||
        'not-set',
      updatesEnabled:
        Constants.expoConfig?.updates?.enabled ??
        Constants.manifest?.updates?.enabled ??
        false,
      checkAutomatically:
        Constants.expoConfig?.updates?.checkAutomatically ||
        Constants.manifest?.updates?.checkAutomatically ||
        'not-set',
      updateUrl:
        Constants.expoConfig?.updates?.url ||
        Constants.manifest?.updates?.url ||
        'not-set',
    };

    console.log('Loaded OTA debug info:', info);
    setUpdateInfo(info);
    setUpdateLogs(logs);
  };

  const applyFetchedUpdate = async () => {
    const result = await Updates.fetchUpdateAsync();

    if (result.isRollBackToEmbedded || result.isNew) {
      await Updates.reloadAsync();
      return;
    }

    Alert.alert('提示', '没有拿到可立即应用的更新。');
  };

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isRollBackToEmbedded) {
        Alert.alert('检测到回退修复', '服务端要求回退到内置版本。是否立即恢复？', [
          { text: '取消', style: 'cancel' },
          {
            text: '恢复',
            onPress: async () => {
              try {
                await applyFetchedUpdate();
              } catch (error) {
                Alert.alert('恢复失败', error.message);
              }
            },
          },
        ]);
        return;
      }

      if (!update.isAvailable) {
        Alert.alert('提示', '当前已经是最新版本。');
        return;
      }

      Alert.alert('发现新版本', '是否立即下载并重启应用？', [
        { text: '取消', style: 'cancel' },
        {
          text: '更新',
          onPress: async () => {
            try {
              await applyFetchedUpdate();
            } catch (error) {
              Alert.alert('更新失败', error.message);
            }
          },
        },
      ]);
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>热更新调试信息</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前运行版本</Text>
          <InfoRow label="Bundle 指纹" value={updateInfo?.bundleFingerprint} />
          <InfoRow label="Update ID" value={updateInfo?.updateId} />
          <InfoRow label="Channel" value={updateInfo?.channel} />
          <InfoRow label="Runtime Version" value={updateInfo?.runtimeVersion} />
          <InfoRow
            label="启动来源"
            value={updateInfo?.isEmbeddedLaunch ? '内置版本' : '下载更新'}
          />
          <InfoRow
            label="紧急回退"
            value={updateInfo?.isEmergencyLaunch ? '是' : '否'}
          />
          <InfoRow
            label="回退原因"
            value={updateInfo?.emergencyLaunchReason || '无'}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>配置状态</Text>
          <InfoRow label="App Version" value={updateInfo?.appVersion} />
          <InfoRow
            label="配置 Runtime"
            value={String(updateInfo?.configRuntimeVersion || 'unknown')}
            multiline
          />
          <InfoRow label="Release Channel" value={updateInfo?.releaseChannel} />
          <InfoRow
            label="Updates Enabled"
            value={updateInfo?.updatesEnabled ? 'true' : 'false'}
          />
          <InfoRow
            label="Check Automatically"
            value={updateInfo?.checkAutomatically}
          />
          <InfoRow label="Update URL" value={updateInfo?.updateUrl} multiline />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近 OTA 错误日志</Text>
          {updateLogs.length === 0 ? (
            <Text style={styles.emptyText}>最近没有读取到错误日志。</Text>
          ) : (
            updateLogs.map((log, index) => (
              <View key={`${log.timestamp}-${index}`} style={styles.logCard}>
                <Text style={styles.logMeta}>
                  {log.level} / {log.code}
                </Text>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))
          )}
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

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={reloadApp}>
          <Text style={styles.buttonText}>重启应用</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, multiline = false }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>
      {value ?? 'unknown'}
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
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  infoLabel: {
    width: 130,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  infoValueMultiline: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  logCard: {
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff7f7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  logMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7f1d1d',
  },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default UpdateDebugScreen;
