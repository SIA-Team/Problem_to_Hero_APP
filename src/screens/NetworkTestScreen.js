import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../config/env';
import DeviceInfo from '../utils/deviceInfo';
import authApi from '../services/api/authApi';

/**
 * 网络诊断测试页面
 * 用于排查用户无法自动注册的问题
 */
export default function NetworkTestScreen({
  navigation
}) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const addResult = (title, status, message, details = null) => {
    setResults(prev => [...prev, {
      title,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };
  const runTests = async () => {
    setTesting(true);
    setResults([]);
    try {
      // 测试 1: 网络连接状态
      addResult('网络连接检查', 'testing', '检查中...');
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        addResult('网络连接检查', 'success', `已连接 - ${netInfo.type}`, netInfo);
      } else {
        addResult('网络连接检查', 'error', '网络未连接', netInfo);
        setTesting(false);
        return;
      }

      // 测试 2: 服务器连接测试
      addResult('服务器连接测试', 'testing', '测试中...');
      try {
        const response = await fetch(`${ENV.apiUrl}/app/user/auth/register`, {
          method: 'GET',
          // 故意用 GET 测试连接
          timeout: 10000
        });
        if (response.status === 500) {
          // 返回 500 说明服务器可访问（只是不支持 GET）
          addResult('服务器连接测试', 'success', '服务器可访问', {
            status: response.status,
            url: `${ENV.apiUrl}/app/user/auth/register`
          });
        } else {
          addResult('服务器连接测试', 'warning', `服务器响应: ${response.status}`, {
            status: response.status,
            url: `${ENV.apiUrl}/app/user/auth/register`
          });
        }
      } catch (error) {
        addResult('服务器连接测试', 'error', `无法连接: ${error.message}`, {
          error: error.message,
          url: `${ENV.apiUrl}/app/user/auth/register`
        });
        setTesting(false);
        return;
      }

      // 测试 3: 设备指纹生成
      addResult('设备指纹生成', 'testing', '生成中...');
      try {
        const fingerprint = await DeviceInfo.generateFingerprintString();
        addResult('设备指纹生成', 'success', `指纹: ${fingerprint}`, {
          fingerprint
        });
      } catch (error) {
        addResult('设备指纹生成', 'error', `生成失败: ${error.message}`, {
          error: error.message
        });
        setTesting(false);
        return;
      }

      // 测试 4: 自动注册接口测试
      addResult('自动注册接口', 'testing', '测试中...');
      try {
        const fingerprint = await DeviceInfo.generateFingerprintString();
        const response = await authApi.registerByFingerprint(fingerprint);
        if (response.code === 200) {
          addResult('自动注册接口', 'success', '注册成功！', {
            username: response.data?.userBaseInfo?.username,
            userId: response.data?.userBaseInfo?.userId
          });
        } else {
          addResult('自动注册接口', 'error', `注册失败: ${response.msg}`, {
            code: response.code,
            msg: response.msg,
            data: response.data
          });
        }
      } catch (error) {
        addResult('自动注册接口', 'error', `请求失败: ${error.message}`, {
          error: error.message,
          response: error.response?.data
        });
      }

      // 测试完成
      addResult('测试完成', 'success', '所有测试已完成', null);
    } catch (error) {
      addResult('测试异常', 'error', error.message, {
        error: error.stack
      });
    }
    setTesting(false);
  };
  const getStatusIcon = status => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#22c55e" />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color="#ef4444" />;
      case 'warning':
        return <Ionicons name="warning" size={24} color="#f59e0b" />;
      case 'testing':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      default:
        return <Ionicons name="help-circle" size={24} color="#9ca3af" />;
    }
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>网络诊断</Text>
        <View style={{
        width: 40
      }} />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          此工具用于诊断自动注册失败的问题，点击下方按钮开始测试
        </Text>
      </View>

      {/* Test Button */}
      <TouchableOpacity style={[styles.testButton, testing && styles.testButtonDisabled]} onPress={runTests} disabled={testing}>
        {testing ? <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.testButtonText}>测试中...</Text>
          </> : <>
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.testButtonText}>开始测试</Text>
          </>}
      </TouchableOpacity>

      {/* Results */}
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              {getStatusIcon(result.status)}
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultTime}>{result.timestamp}</Text>
              </View>
            </View>
            <Text style={[styles.resultMessage, result.status === 'error' && styles.resultMessageError, result.status === 'success' && styles.resultMessageSuccess]}>
              {result.message}
            </Text>
            {Boolean(result.details) && <View style={styles.detailsBox}>
                <Text style={styles.detailsText}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              </View>}
          </View>)}
      </ScrollView>

      {/* Server Info */}
      <View style={styles.serverInfo}>
        <Text style={styles.serverInfoLabel}>服务器地址:</Text>
        <Text style={styles.serverInfoValue}>{ENV.apiUrl}</Text>
      </View>
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
    borderBottomColor: '#e5e7eb'
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8
  },
  testButtonDisabled: {
    backgroundColor: '#9ca3af'
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  resultInfo: {
    flex: 1
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937'
  },
  resultTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2
  },
  resultMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  resultMessageError: {
    color: '#ef4444'
  },
  resultMessageSuccess: {
    color: '#22c55e'
  },
  detailsBox: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginTop: 8
  },
  detailsText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4b5563'
  },
  serverInfo: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  serverInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  serverInfoValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#1f2937'
  }
});