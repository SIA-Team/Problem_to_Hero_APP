import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SERVERS, getCurrentServer, switchServerAndReload, getCustomServerUrl } from '../utils/serverSwitcher';
import { showAppAlert } from '../utils/appAlert';
import { useTranslation } from '../i18n/useTranslation';

/**
 * 服务器切换组件
 * 用于开发阶段快速切换服务器地址
 */
export default function ServerSwitcher() {
  const { i18n } = useTranslation();
  const [currentServer, setCurrentServer] = useState('server2');
  const [switching, setSwitching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const isEnglish = i18n?.locale === 'en';
  const labels = {
    title: isEnglish ? 'Server Settings' : '服务器设置',
    prompt: isEnglish ? 'Notice' : '提示',
    switchTitle: isEnglish ? 'Switch Server' : '切换服务器',
    switchConfirm: isEnglish
      ? 'Switching will take effect immediately without restarting the app.'
      : '切换后将立即生效，无需重启应用。',
    switchSuccessTitle: isEnglish ? 'Switched' : '切换成功',
    switchSuccessMessage: isEnglish
      ? 'The server has been updated and is now in effect.'
      : '服务器已切换并立即生效，您可以继续使用。',
    switchFailedTitle: isEnglish ? 'Switch Failed' : '切换失败',
    switchFailedMessage: isEnglish
      ? 'Unable to switch the server. Please try again.'
      : '无法切换服务器，请重试',
    confirm: isEnglish ? 'Confirm' : '确定',
    cancel: isEnglish ? 'Cancel' : '取消',
    current: isEnglish ? 'Current' : '当前',
    unset: isEnglish ? 'Not set' : '未设置',
    customPlaceholder: isEnglish
      ? 'Enter a custom server URL (for example: http://192.168.1.100:8080)'
      : '输入自定义服务器地址 (如: http://192.168.1.100:8080)',
    customRequired: isEnglish
      ? 'Please enter a custom server URL first.'
      : '请先输入自定义服务器地址',
    switching: isEnglish ? 'Switching server...' : '正在切换服务器...',
    hint: isEnglish
      ? 'Switching servers takes effect immediately without restarting the app.'
      : '切换服务器后立即生效，无需重启应用',
    acknowledged: isEnglish ? 'OK' : '知道了',
    server1Name: isEnglish ? 'Development Server' : SERVERS.SERVER1.name,
    server2Name: isEnglish ? 'Production Server' : SERVERS.SERVER2.name,
    customName: isEnglish ? 'Custom Server' : SERVERS.CUSTOM.name,
  };

  useEffect(() => {
    loadCurrentServer();
    loadCustomUrl();
  }, []);
  const loadCurrentServer = async () => {
    const server = await getCurrentServer();
    setCurrentServer(server);
  };
  const loadCustomUrl = async () => {
    const url = await getCustomServerUrl();
    setCustomUrl(url);
  };
  const handleSwitchServer = serverKey => {
    if (switching) return;
    let server;
    if (serverKey === 'server1') {
      server = SERVERS.SERVER1;
    } else if (serverKey === 'server2') {
      server = SERVERS.SERVER2;
    } else if (serverKey === 'custom') {
      if (!customUrl.trim()) {
        showAppAlert(labels.prompt, labels.customRequired);
        return;
      }
      server = {
        ...SERVERS.CUSTOM,
        url: customUrl
      };
    }
    const serverName = serverKey === 'server1'
      ? labels.server1Name
      : serverKey === 'server2'
        ? labels.server2Name
        : labels.customName;
    showAppAlert(labels.switchTitle, `${isEnglish ? 'Are you sure you want to switch to' : '确定要切换到'} ${serverName} (${server.url}) ${isEnglish ? '?' : '吗？'}\n\n${labels.switchConfirm}`, [{
      text: labels.cancel,
      style: 'cancel'
    }, {
      text: labels.confirm,
      onPress: async () => {
        setSwitching(true);
        const success = await switchServerAndReload(serverKey, serverKey === 'custom' ? customUrl : '');
        setSwitching(false);
        if (success) {
          setCurrentServer(serverKey);
          showAppAlert(labels.switchSuccessTitle, labels.switchSuccessMessage, [{
            text: labels.acknowledged
          }]);
        } else {
          showAppAlert(labels.switchFailedTitle, labels.switchFailedMessage);
        }
      }
    }]);
  };
  return <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="server-outline" size={18} color="#6b7280" />
        <Text style={styles.title}>{labels.title}</Text>
      </View>
      
      <View style={styles.serverList}>
        {/* Server 1 */}
        <TouchableOpacity style={[styles.serverItem, currentServer === 'server1' && styles.serverItemActive]} onPress={() => handleSwitchServer('server1')} disabled={switching || currentServer === 'server1'} activeOpacity={0.7}>
          <View style={styles.serverInfo}>
            <View style={styles.serverHeader}>
              <Text style={[styles.serverName, currentServer === 'server1' && styles.serverNameActive]}>
                {labels.server1Name}
              </Text>
              {currentServer === 'server1' && <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{labels.current}</Text>
                </View>}
            </View>
            <Text style={styles.serverUrl}>{SERVERS.SERVER1.url}</Text>
          </View>
          {currentServer === 'server1' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
        </TouchableOpacity>

        {/* Server 2 */}
        <TouchableOpacity style={[styles.serverItem, currentServer === 'server2' && styles.serverItemActive]} onPress={() => handleSwitchServer('server2')} disabled={switching || currentServer === 'server2'} activeOpacity={0.7}>
          <View style={styles.serverInfo}>
            <View style={styles.serverHeader}>
              <Text style={[styles.serverName, currentServer === 'server2' && styles.serverNameActive]}>
                {labels.server2Name}
              </Text>
              {currentServer === 'server2' && <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{labels.current}</Text>
                </View>}
            </View>
            <Text style={styles.serverUrl}>{SERVERS.SERVER2.url}</Text>
          </View>
          {currentServer === 'server2' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
        </TouchableOpacity>

        {/* Custom Server */}
        <View>
          <View style={styles.customServerContainer}>
            <TextInput style={styles.customInput} placeholder={labels.customPlaceholder} placeholderTextColor="#9ca3af" value={customUrl} onChangeText={setCustomUrl} editable={!switching} autoCapitalize="none" autoCorrect={false} />
          </View>
          <TouchableOpacity style={[styles.serverItem, currentServer === 'custom' && styles.serverItemActive]} onPress={() => handleSwitchServer('custom')} disabled={switching || currentServer === 'custom'} activeOpacity={0.7}>
            <View style={styles.serverInfo}>
              <View style={styles.serverHeader}>
                <Text style={[styles.serverName, currentServer === 'custom' && styles.serverNameActive]}>
                  {labels.customName}
                </Text>
                {currentServer === 'custom' && <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>{labels.current}</Text>
                  </View>}
              </View>
              <Text style={styles.serverUrl}>
                {currentServer === 'custom' && customUrl ? customUrl : labels.unset}
              </Text>
            </View>
            {currentServer === 'custom' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
          </TouchableOpacity>
        </View>
      </View>

      {Boolean(switching) && <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>{labels.switching}</Text>
        </View>}
      
      <Text style={styles.hint}>
        {`💡 ${labels.hint}`}
      </Text>
    </View>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8
  },
  serverList: {
    gap: 12
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  serverItemActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e'
  },
  serverInfo: {
    flex: 1
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  serverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  serverNameActive: {
    color: '#22c55e'
  },
  activeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  activeBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  serverUrl: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8
  },
  loadingText: {
    fontSize: 13,
    color: '#3b82f6',
    marginLeft: 8
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center'
  },
  customServerContainer: {
    marginBottom: 8
  },
  customInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace'
  }
});
