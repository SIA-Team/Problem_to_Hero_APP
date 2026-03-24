import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SERVERS, getCurrentServer, switchServerAndReload, getCustomServerUrl } from '../utils/serverSwitcher';

/**
 * 服务器切换组件
 * 用于开发阶段快速切换服务器地址
 */
export default function ServerSwitcher() {
  const [currentServer, setCurrentServer] = useState('server2');
  const [switching, setSwitching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
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
        Alert.alert('提示', '请先输入自定义服务器地址');
        return;
      }
      server = {
        ...SERVERS.CUSTOM,
        url: customUrl
      };
    }
    Alert.alert('切换服务器', `确定要切换到 ${server.name} (${server.url}) 吗？\n\n切换后将立即生效，无需重启应用。`, [{
      text: '取消',
      style: 'cancel'
    }, {
      text: '确定',
      onPress: async () => {
        setSwitching(true);
        const success = await switchServerAndReload(serverKey, serverKey === 'custom' ? customUrl : '');
        setSwitching(false);
        if (success) {
          Alert.alert('切换成功', '服务器已切换并立即生效，您可以继续使用。', [{
            text: '知道了'
          }]);
        } else {
          Alert.alert('切换失败', '无法切换服务器，请重试');
        }
      }
    }]);
  };
  return <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="server-outline" size={18} color="#6b7280" />
        <Text style={styles.title}>服务器设置</Text>
      </View>
      
      <View style={styles.serverList}>
        {/* Server 1 */}
        <TouchableOpacity style={[styles.serverItem, currentServer === 'server1' && styles.serverItemActive]} onPress={() => handleSwitchServer('server1')} disabled={switching || currentServer === 'server1'} activeOpacity={0.7}>
          <View style={styles.serverInfo}>
            <View style={styles.serverHeader}>
              <Text style={[styles.serverName, currentServer === 'server1' && styles.serverNameActive]}>
                {SERVERS.SERVER1.name}
              </Text>
              {currentServer === 'server1' && <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>当前</Text>
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
                {SERVERS.SERVER2.name}
              </Text>
              {currentServer === 'server2' && <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>当前</Text>
                </View>}
            </View>
            <Text style={styles.serverUrl}>{SERVERS.SERVER2.url}</Text>
          </View>
          {currentServer === 'server2' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
        </TouchableOpacity>

        {/* Custom Server */}
        <View>
          <View style={styles.customServerContainer}>
            <TextInput style={styles.customInput} placeholder="输入自定义服务器地址 (如: http://192.168.1.100:8080)" placeholderTextColor="#9ca3af" value={customUrl} onChangeText={setCustomUrl} editable={!switching} autoCapitalize="none" autoCorrect={false} />
          </View>
          <TouchableOpacity style={[styles.serverItem, currentServer === 'custom' && styles.serverItemActive]} onPress={() => handleSwitchServer('custom')} disabled={switching || currentServer === 'custom'} activeOpacity={0.7}>
            <View style={styles.serverInfo}>
              <View style={styles.serverHeader}>
                <Text style={[styles.serverName, currentServer === 'custom' && styles.serverNameActive]}>
                  {SERVERS.CUSTOM.name}
                </Text>
                {currentServer === 'custom' && <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>当前</Text>
                  </View>}
              </View>
              <Text style={styles.serverUrl}>
                {currentServer === 'custom' && customUrl ? customUrl : '未设置'}
              </Text>
            </View>
            {currentServer === 'custom' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
          </TouchableOpacity>
        </View>
      </View>

      {Boolean(switching) && <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>正在切换服务器...</Text>
        </View>}
      
      <Text style={styles.hint}>
        💡 切换服务器后立即生效，无需重启应用
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