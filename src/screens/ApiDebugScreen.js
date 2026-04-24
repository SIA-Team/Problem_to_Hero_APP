import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { getApiServerUrl, updateDynamicServer } from '../config/env';
import { getCurrentServer, getCustomServerUrl } from '../utils/serverSwitcher';
import {
  clearStartupTraceLogs,
  getStartupTraceLogs,
  subscribeStartupTraceLogs,
} from '../services/startupTrace';

// API 日志存储
let apiLogs = [];
const MAX_LOGS = 50;
const MAX_STARTUP_LOGS_PREVIEW = 20;

// 拦截器函数 - 需要在 apiClient 中调用
export const logApiRequest = (config) => {
  const log = {
    id: Date.now(),
    timestamp: new Date().toLocaleString('zh-CN'),
    method: config.method?.toUpperCase() || 'GET',
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL || ''}${config.url}`,
    headers: config.headers,
    params: config.params,
    data: config.data,
    type: 'request',
  };

  apiLogs.unshift(log);
  if (apiLogs.length > MAX_LOGS) {
    apiLogs = apiLogs.slice(0, MAX_LOGS);
  }

  return log.id;
};

export const logApiResponse = (logId, response, error = null) => {
  const logIndex = apiLogs.findIndex((log) => log.id === logId);
  if (logIndex !== -1) {
    apiLogs[logIndex] = {
      ...apiLogs[logIndex],
      status: error ? 'error' : response?.status,
      statusText: error ? 'Error' : response?.statusText,
      responseData: error ? error.message : response?.data,
      error: error
        ? {
            message: error.message,
            code: error.code,
            response: error.response?.data,
          }
        : null,
      duration: Date.now() - apiLogs[logIndex].id,
    };
  }
};

export const clearApiLogs = () => {
  apiLogs = [];
};

function ApiDebugScreen({ navigation }) {
  useTranslation();
  const [logs, setLogs] = useState([]);
  const [startupLogs, setStartupLogs] = useState(() => getStartupTraceLogs());
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [serverInfo, setServerInfo] = useState({
    currentServerUrl: API_CONFIG.BASE_URL,
    contentServerUrl: API_CONFIG.BASE_URL,
  });

  useEffect(() => {
    let mounted = true;
    const unsubscribeStartupTrace = subscribeStartupTraceLogs((nextLogs) => {
      if (mounted) {
        setStartupLogs(nextLogs);
      }
    });

    const loadServerInfo = async () => {
      try {
        const [serverKey, customUrl] = await Promise.all([
          getCurrentServer(),
          getCustomServerUrl(),
        ]);

        updateDynamicServer(serverKey, customUrl);

        if (!mounted) {
          return;
        }

        setServerInfo({
          currentServerUrl: getApiServerUrl(API_ENDPOINTS.AUTH.LOGIN),
          contentServerUrl: getApiServerUrl(API_ENDPOINTS.COMMENT.LIST),
        });
      } catch (error) {
        if (__DEV__) {
          console.error('加载服务器信息失败:', error);
        }
      }
    };

    loadServerInfo();

    const interval = setInterval(() => {
      if (autoRefresh) {
        setLogs([...apiLogs]);
        loadServerInfo();
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      unsubscribeStartupTrace();
    };
  }, [autoRefresh]);

  const handleClearLogs = () => {
    clearApiLogs();
    clearStartupTraceLogs();
    setLogs([]);
    setStartupLogs([]);
    setSelectedLog(null);
  };

  const handleShareLog = async (log) => {
    const logText = `
API 请求日志
时间: ${log.timestamp}
方法: ${log.method}
URL: ${log.fullURL}
状态: ${log.status || '请求中'}
${log.error ? `错误: ${JSON.stringify(log.error, null, 2)}` : ''}
请求参数: ${JSON.stringify(log.params || log.data, null, 2)}
响应数据: ${JSON.stringify(log.responseData, null, 2)}
    `.trim();

    try {
      await Share.share({ message: logText });
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  const renderLogItem = (log) => {
    const isError = log.error || (log.status && log.status >= 400);
    const isSuccess = log.status && log.status >= 200 && log.status < 300;
    const isPending = !log.status && !log.error;

    return (
      <TouchableOpacity
        key={log.id}
        style={[
          styles.logItem,
          isError && styles.logItemError,
          isSuccess && styles.logItemSuccess,
          isPending && styles.logItemPending,
        ]}
        onPress={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
      >
        <View style={styles.logHeader}>
          <View style={styles.logMethod}>
            <Text style={[styles.methodText, isError && styles.errorText]}>
              {log.method}
            </Text>
          </View>
          <Text style={styles.logTime}>{log.timestamp}</Text>
        </View>

        <Text style={styles.logUrl} numberOfLines={2}>
          {log.fullURL}
        </Text>

        <View style={styles.logFooter}>
          {log.status && (
            <Text style={[styles.statusText, isError && styles.errorText]}>
              {log.status} {log.statusText}
            </Text>
          )}
          {log.duration && (
            <Text style={styles.durationText}>{log.duration}ms</Text>
          )}
          {isPending && (
            <Text style={styles.pendingText}>请求中...</Text>
          )}
        </View>

        {selectedLog?.id === log.id && (
          <View style={styles.logDetails}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>完整 URL:</Text>
              <Text style={styles.detailText} selectable>
                {log.fullURL}
              </Text>
            </View>

            {log.params && Object.keys(log.params).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>请求参数:</Text>
                <Text style={styles.detailText} selectable>
                  {JSON.stringify(log.params, null, 2)}
                </Text>
              </View>
            )}

            {log.data && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>请求体:</Text>
                <Text style={styles.detailText} selectable>
                  {JSON.stringify(log.data, null, 2)}
                </Text>
              </View>
            )}

            {log.error && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailTitle, styles.errorText]}>错误信息:</Text>
                <Text style={[styles.detailText, styles.errorText]} selectable>
                  {JSON.stringify(log.error, null, 2)}
                </Text>
              </View>
            )}

            {log.responseData && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>响应数据:</Text>
                <ScrollView style={styles.responseScroll} nestedScrollEnabled>
                  <Text style={styles.detailText} selectable>
                    {JSON.stringify(log.responseData, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShareLog(log)}
            >
              <Ionicons name="share-outline" size={20} color="#3b82f6" />
              <Text style={styles.shareButtonText}>分享日志</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStartupLogItem = (log) => {
    const isFail = log.type === 'fail';
    const isSuccess = log.type === 'success';
    const isStart = log.type === 'start';
    const durationText = typeof log.durationMs === 'number' ? `${log.durationMs}ms` : null;

    return (
      <View
        key={log.id}
        style={[
          styles.startupLogItem,
          isFail && styles.startupLogItemFail,
          isSuccess && styles.startupLogItemSuccess,
          isStart && styles.startupLogItemStart,
        ]}
      >
        <View style={styles.startupLogHeader}>
          <Text style={styles.startupLogEvent}>{log.event}</Text>
          <Text style={styles.startupLogTime}>{log.timestamp}</Text>
        </View>

        <View style={styles.startupLogMetaRow}>
          <Text
            style={[
              styles.startupLogType,
              isFail && styles.startupLogTypeFail,
              isSuccess && styles.startupLogTypeSuccess,
              isStart && styles.startupLogTypeStart,
            ]}
          >
            {log.type}
          </Text>
          {durationText ? (
            <Text style={styles.startupLogDuration}>{durationText}</Text>
          ) : null}
        </View>

        {log.payload && Object.keys(log.payload).length > 0 ? (
          <Text style={styles.startupLogPayload} selectable>
            {JSON.stringify(log.payload, null, 2)}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API 调试</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setAutoRefresh(!autoRefresh)}
            style={styles.headerButton}
          >
            <Ionicons
              name={autoRefresh ? 'pause' : 'play'}
              size={20}
              color={autoRefresh ? '#ef4444' : '#22c55e'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>当前服务器:</Text>
          <Text style={styles.infoValue} selectable>
            {serverInfo.currentServerUrl}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>内容服务器:</Text>
          <Text style={styles.infoValue} selectable>
            {serverInfo.contentServerUrl}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API 日志:</Text>
          <Text style={styles.infoValue}>{logs.length} / {MAX_LOGS}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>启动追踪:</Text>
          <Text style={styles.infoValue}>{startupLogs.length} / 200</Text>
        </View>
      </View>

      <ScrollView style={styles.logsList}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>冷启动追踪</Text>
            <Text style={styles.sectionHint}>仅开发环境可见</Text>
          </View>
          {startupLogs.length === 0 ? (
            <Text style={styles.sectionEmptyText}>
              暂无启动追踪，重启 App 后再进入这里可以直接看到每一步耗时和失败点。
            </Text>
          ) : (
            startupLogs
              .slice(0, MAX_STARTUP_LOGS_PREVIEW)
              .map(renderStartupLogItem)
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>API 请求日志</Text>
            <Text style={styles.sectionHint}>实时刷新</Text>
          </View>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>暂无 API 请求日志</Text>
              <Text style={styles.emptyHint}>
                使用应用功能后，这里会显示所有 API 请求。
              </Text>
            </View>
          ) : (
            logs.map(renderLogItem)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    fontWeight: '500',
  },
  logsList: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6b7280',
    paddingHorizontal: 12,
  },
  startupLogItem: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  startupLogItemStart: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  startupLogItemSuccess: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  startupLogItemFail: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  startupLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  startupLogEvent: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  startupLogTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  startupLogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  startupLogType: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  startupLogTypeStart: {
    color: '#b45309',
  },
  startupLogTypeSuccess: {
    color: '#15803d',
  },
  startupLogTypeFail: {
    color: '#dc2626',
  },
  startupLogDuration: {
    fontSize: 11,
    color: '#6b7280',
  },
  startupLogPayload: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
    fontFamily: 'monospace',
  },
  logItem: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d1d5db',
  },
  logItemSuccess: {
    borderLeftColor: '#22c55e',
  },
  logItemError: {
    borderLeftColor: '#ef4444',
  },
  logItemPending: {
    borderLeftColor: '#f59e0b',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logMethod: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  logTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  logUrl: {
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  pendingText: {
    fontSize: 12,
    color: '#f59e0b',
  },
  errorText: {
    color: '#ef4444',
  },
  logDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  responseScroll: {
    maxHeight: 200,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ApiDebugScreen;
