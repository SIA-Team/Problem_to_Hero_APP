import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Network from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api';
import apiClient from '../services/api/apiClient';

/**
 * 连接状态检查页面
 */
export default function ConnectionStatusScreen({
  navigation
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState({
    network: null,
    backend: null,
    metro: null
  });
  useEffect(() => {
    checkAllStatus();
  }, []);
  const checkAllStatus = async () => {
    setLoading(true);
    try {
      // 并行检查所有状态
      const [networkStatus, backendStatus, metroStatus] = await Promise.all([checkNetworkStatus(), checkBackendStatus(), checkMetroStatus()]);
      setStatus({
        network: networkStatus,
        backend: backendStatus,
        metro: metroStatus
      });
    } catch (error) {
      console.error('检查状态失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    checkAllStatus();
  };

  // 检查网络连接
  const checkNetworkStatus = async () => {
    try {
      const netInfo = await Network.fetch();
      return {
        connected: netInfo.isConnected,
        type: netInfo.type,
        details: netInfo.details,
        isInternetReachable: netInfo.isInternetReachable
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  };

  // 检查后端服务器连接
  const checkBackendStatus = async () => {
    const startTime = Date.now();
    try {
      // 尝试访问后端服务器
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: 'GET',
        timeout: 5000
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      return {
        connected: true,
        url: API_CONFIG.BASE_URL,
        status: response.status,
        responseTime: responseTime
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      return {
        connected: false,
        url: API_CONFIG.BASE_URL,
        error: error.message,
        responseTime: responseTime
      };
    }
  };

  // 检查 Metro 服务器连接
  const checkMetroStatus = async () => {
    try {
      const debuggerHost = Constants.expoConfig?.hostUri;
      return {
        connected: !!debuggerHost,
        host: debuggerHost,
        mode: __DEV__ ? 'development' : 'production'
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  };
  const renderStatusIcon = connected => {
    if (connected === null) {
      return <ActivityIndicator size="small" color="#3b82f6" />;
    }
    return <Ionicons name={connected ? 'checkmark-circle' : 'close-circle'} size={24} color={connected ? '#22c55e' : '#ef4444'} />;
  };
  const renderStatusCard = (title, icon, status, details) => {
    const isConnected = status?.connected;
    return <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusTitleRow}>
            <Ionicons name={icon} size={20} color="#374151" />
            <Text style={styles.statusTitle}>{title}</Text>
          </View>
          {renderStatusIcon(isConnected)}
        </View>

        <View style={styles.statusDetails}>
          {details.map((detail, index) => <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}:</Text>
              <Text style={[styles.detailValue, detail.highlight && styles.detailValueHighlight, detail.error && styles.detailValueError]}>
                {detail.value}
              </Text>
            </View>)}
        </View>
      </View>;
  };
  if (loading && !refreshing) {
    return <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>连接状态</Text>
          <View style={{
          width: 40
        }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>正在检查连接状态...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>连接状态</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
          <Ionicons name="refresh" size={24} color={refreshing ? '#9ca3af' : '#1f2937'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* 总体状态 */}
        <View style={styles.overallStatus}>
          <View style={styles.overallStatusIcon}>
            {status.network?.connected && status.backend?.connected ? <Ionicons name="checkmark-circle" size={48} color="#22c55e" /> : <Ionicons name="alert-circle" size={48} color="#ef4444" />}
          </View>
          <Text style={styles.overallStatusText}>
            {status.network?.connected && status.backend?.connected ? '所有服务正常' : '部分服务异常'}
          </Text>
          <Text style={styles.overallStatusTime}>
            最后检查: {new Date().toLocaleTimeString('zh-CN')}
          </Text>
        </View>

        {/* 网络连接状态 */}
        {renderStatusCard('网络连接', 'wifi', status.network, [{
        label: '状态',
        value: status.network?.connected ? '已连接' : '未连接',
        highlight: status.network?.connected,
        error: !status.network?.connected
      }, {
        label: '类型',
        value: status.network?.type || '未知'
      }, {
        label: '互联网',
        value: status.network?.isInternetReachable ? '可访问' : '不可访问'
      }])}

        {/* 后端服务器状态 */}
        {renderStatusCard('后端服务器', 'server', status.backend, [{
        label: '状态',
        value: status.backend?.connected ? '正常' : '异常',
        highlight: status.backend?.connected,
        error: !status.backend?.connected
      }, {
        label: '地址',
        value: status.backend?.url || API_CONFIG.BASE_URL
      }, {
        label: 'HTTP状态',
        value: status.backend?.status || '无响应'
      }, {
        label: '响应时间',
        value: status.backend?.responseTime ? `${status.backend.responseTime}ms` : '-'
      }, ...(status.backend?.error ? [{
        label: '错误',
        value: status.backend.error,
        error: true
      }] : [])])}

        {/* Metro 服务器状态 */}
        {renderStatusCard('Metro 服务器', 'code-slash', status.metro, [{
        label: '状态',
        value: status.metro?.connected ? '已连接' : '未连接',
        highlight: status.metro?.connected
      }, {
        label: '模式',
        value: status.metro?.mode || '未知'
      }, {
        label: '地址',
        value: status.metro?.host || '未知'
      }])}

        {/* 配置信息 */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>当前配置</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>API 基础地址:</Text>
            <Text style={styles.configValue}>{API_CONFIG.BASE_URL}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>请求超时:</Text>
            <Text style={styles.configValue}>{API_CONFIG.TIMEOUT}ms</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>开发模式:</Text>
            <Text style={styles.configValue}>{__DEV__ ? '是' : '否'}</Text>
          </View>
        </View>

        {/* 故障排查提示 */}
        {(!status.network?.connected || !status.backend?.connected) && <View style={styles.troubleshootCard}>
            <View style={styles.troubleshootHeader}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.troubleshootTitle}>故障排查建议</Text>
            </View>
            
            {!status.network?.connected && <View style={styles.troubleshootItem}>
                <Text style={styles.troubleshootText}>
                  • 检查设备是否连接到 WiFi 或移动网络
                </Text>
                <Text style={styles.troubleshootText}>
                  • 尝试在浏览器中访问其他网站
                </Text>
                <Text style={styles.troubleshootText}>
                  • 检查是否启用了飞行模式
                </Text>
              </View>}

            {Boolean(!status.backend?.connected && status.network?.connected) && <View style={styles.troubleshootItem}>
                <Text style={styles.troubleshootText}>
                  • 在浏览器中测试: {API_CONFIG.BASE_URL}
                </Text>
                <Text style={styles.troubleshootText}>
                  • 检查后端服务器是否正常运行
                </Text>
                <Text style={styles.troubleshootText}>
                  • 确认防火墙未阻止访问
                </Text>
                <Text style={styles.troubleshootText}>
                  • 尝试使用 Tunnel 模式启动开发服务器
                </Text>
              </View>}
          </View>}

        <View style={{
        height: 40
      }} />
      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    padding: 4
  },
  refreshBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280'
  },
  content: {
    flex: 1,
    padding: 16
  },
  overallStatus: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
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
  overallStatusIcon: {
    marginBottom: 12
  },
  overallStatusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  overallStatusTime: {
    fontSize: 12,
    color: '#9ca3af'
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  statusDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280'
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500'
  },
  detailValueHighlight: {
    color: '#22c55e'
  },
  detailValueError: {
    color: '#ef4444'
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  configItem: {
    marginBottom: 8
  },
  configLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2
  },
  configValue: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace'
  },
  troubleshootCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  troubleshootHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  troubleshootTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e'
  },
  troubleshootItem: {
    gap: 8
  },
  troubleshootText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20
  }
});