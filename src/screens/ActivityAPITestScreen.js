import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import activityApi from '../services/api/activityApi';

/**
 * 活动 API 测试页面
 * 用于测试和查看 /app/activity/list 接口的响应
 */
export default function ActivityAPITestScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);

  /**
   * 测试接口
   */
  const testAPI = async (params = {}, testName = '默认测试') => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    const startTime = Date.now();
    
    setRequestInfo({
      name: testName,
      params: params,
      timestamp: new Date().toLocaleString(),
    });

    try {
      const result = await activityApi.getActivityCenterList(params);
      const endTime = Date.now();
      
      setResponse({
        data: result?.rows || result?.data || [],
        raw: result,
        status: result?.code,
        duration: endTime - startTime,
      });
    } catch (err) {
      setError({
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染测试按钮
   */
  const renderTestButton = (label, params, testName) => (
    <TouchableOpacity
      style={styles.testButton}
      onPress={() => testAPI(params, testName)}
      disabled={loading}
    >
      <Ionicons name="flask-outline" size={20} color="#3b82f6" />
      <Text style={styles.testButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  /**
   * 渲染响应数据
   */
  const renderResponse = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>请求中...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>请求失败</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          {error.status && (
            <Text style={styles.errorStatus}>状态码: {error.status}</Text>
          )}
          {error.response && (
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {JSON.stringify(error.response, null, 2)}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (response) {
      return (
        <View style={styles.responseContainer}>
          {/* 请求信息 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📡 请求信息</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>测试名称:</Text>
              <Text style={styles.infoValue}>{requestInfo?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>请求时间:</Text>
              <Text style={styles.infoValue}>{requestInfo?.timestamp}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>请求参数:</Text>
              <Text style={styles.infoValue}>
                {JSON.stringify(requestInfo?.params || {})}
              </Text>
            </View>
          </View>

          {/* 响应信息 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ 响应信息</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>状态码:</Text>
              <Text style={[styles.infoValue, styles.successText]}>
                {response.status}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>响应时间:</Text>
              <Text style={styles.infoValue}>{response.duration}ms</Text>
            </View>
          </View>

          {/* 响应数据 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 响应数据</Text>
            
            {/* 数据统计 */}
            {Array.isArray(response.data) && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{response.data.length}</Text>
                  <Text style={styles.statLabel}>活动总数</Text>
                </View>
              </View>
            )}

            {/* 完整 JSON */}
            <ScrollView 
              style={styles.codeBlock}
              nestedScrollEnabled
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.codeText}>
                {JSON.stringify(response.data, null, 2)}
              </Text>
            </ScrollView>
          </View>

          {/* 数据结构说明 */}
          {Array.isArray(response.data) && response.data.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 数据结构示例</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {JSON.stringify(response.data[0], null, 2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flask" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>选择一个测试开始</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>活动 API 测试</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* API 信息 */}
        <View style={styles.apiInfo}>
          <Text style={styles.apiEndpoint}>GET /app/activity/center/list</Text>
          <Text style={styles.apiDescription}>
            获取活动列表，支持按类型和状态筛选
          </Text>
        </View>

        {/* 测试按钮组 */}
        <View style={styles.testSection}>
          <Text style={styles.testSectionTitle}>快速测试</Text>
          
          {renderTestButton('获取所有活动', {}, '获取所有活动')}
          
          {renderTestButton(
            '获取线上活动 (type=1)',
            { type: 1 },
            '按类型筛选 - 线上活动'
          )}
          
          {renderTestButton(
            '获取线下活动 (type=2)',
            { type: 2 },
            '按类型筛选 - 线下活动'
          )}
          
          {renderTestButton(
            '获取进行中的活动 (status=1)',
            { status: 1 },
            '按状态筛选 - 进行中'
          )}
          
          {renderTestButton(
            '获取已结束的活动 (status=2)',
            { status: 2 },
            '按状态筛选 - 已结束'
          )}
          
          {renderTestButton(
            '组合查询 (type=1, status=1)',
            { type: 1, status: 1 },
            '组合查询 - 进行中的线上活动'
          )}
        </View>

        {/* 参数说明 */}
        <View style={styles.paramsSection}>
          <Text style={styles.paramsSectionTitle}>参数说明</Text>
          
          <View style={styles.paramItem}>
            <Text style={styles.paramName}>type</Text>
            <Text style={styles.paramType}>Number (可选)</Text>
            <Text style={styles.paramDesc}>
              活动类型: 1=线上活动, 2=线下活动
            </Text>
          </View>
          
          <View style={styles.paramItem}>
            <Text style={styles.paramName}>status</Text>
            <Text style={styles.paramType}>Number (可选)</Text>
            <Text style={styles.paramDesc}>
              活动状态: 1=进行中, 2=已结束
            </Text>
          </View>
        </View>

        {/* 响应展示 */}
        {renderResponse()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  apiInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  apiEndpoint: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  apiDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  testSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  testSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  testButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '500',
  },
  paramsSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  paramsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  paramItem: {
    marginBottom: 16,
  },
  paramName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  paramType: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  paramDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    padding: 40,
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorStatus: {
    fontSize: 12,
    color: '#9ca3af',
  },
  responseContainer: {
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
    fontFamily: 'monospace',
  },
  successText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  codeText: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    padding: 60,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
  },
});
