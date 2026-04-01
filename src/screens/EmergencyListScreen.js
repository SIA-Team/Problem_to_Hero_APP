import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
import { useEmergency } from '../contexts/EmergencyContext';

// 已接收的紧急求助数据
const receivedEmergencies = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency1',
    name: '王小明',
    title: '车辆抛锚急需拖车救援',
    location: '北京市朝阳区建国路88号',
    distance: '2.3km',
    rescuerCount: 3,
    respondedCount: 1,
    time: '3分钟前',
    status: 'urgent',
    urgencyLevel: 'high'
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency2',
    name: '李华',
    title: '突发疾病需要紧急送医',
    location: '上海市浦东新区世纪大道1号',
    distance: '5.8km',
    rescuerCount: 5,
    respondedCount: 5,
    time: '8分钟前',
    status: 'responding',
    urgencyLevel: 'high'
  },
  {
    id: 3,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency3',
    name: '张伟',
    title: '钥匙锁车内需要开锁服务',
    location: '广州市天河区珠江新城',
    distance: '1.2km',
    rescuerCount: 1,
    respondedCount: 0,
    time: '15分钟前',
    status: 'normal',
    urgencyLevel: 'normal'
  }
];

// 我发布的紧急求助数据
const myEmergencies = [
  {
    id: 101,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
    name: '我',
    title: '手机丢失需要帮助寻找',
    location: '深圳市南山区科技园',
    distance: '0km',
    rescuerCount: 2,
    time: '1小时前',
    status: 'normal',
    urgencyLevel: 'normal',
    responseCount: 5,
    responders: [
      { id: 1, name: '张三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1' },
      { id: 2, name: '李四', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2' },
      { id: 3, name: '王五', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3' },
      { id: 4, name: '赵六', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4' },
      { id: 5, name: '孙七', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5' }
    ]
  },
  {
    id: 102,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
    name: '我',
    title: '宠物走失急需帮助',
    location: '杭州市西湖区文一路',
    distance: '0km',
    rescuerCount: 3,
    time: '3小时前',
    status: 'normal',
    urgencyLevel: 'normal',
    responseCount: 12,
    responders: [
      { id: 6, name: '周八', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user6' },
      { id: 7, name: '吴九', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user7' },
      { id: 8, name: '郑十', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user8' },
      { id: 9, name: '钱十一', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user9' },
      { id: 10, name: '陈十二', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user10' },
      { id: 11, name: '刘十三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user11' },
      { id: 12, name: '杨十四', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user12' },
      { id: 13, name: '黄十五', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user13' },
      { id: 14, name: '朱十六', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user14' },
      { id: 15, name: '林十七', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user15' },
      { id: 16, name: '何十八', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user16' },
      { id: 17, name: '徐十九', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user17' }
    ]
  }
];

export default function EmergencyListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('received');
  const [showRespondersModal, setShowRespondersModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const { isResponded } = useEmergency();

  const handleShowResponders = (emergency) => {
    setSelectedEmergency(emergency);
    setShowRespondersModal(true);
  };

  const renderEmergencyCard = (item, showResponseCount = false) => {
    const isCompleted = item.respondedCount >= item.rescuerCount; // 判断是否已满员
    const userResponded = isResponded(item.id); // 判断当前用户是否已响应
    
    return (
      <View 
        key={item.id} 
        style={[
          styles.emergencyItem,
          item.urgencyLevel === 'high' && styles.emergencyItemHigh
        ]}
      >
        <View style={styles.emergencyHeader}>
          <Avatar uri={item.avatar} name={item.name} size={44} />
          <View style={styles.emergencyHeaderContent}>
            <Text style={styles.emergencyName}>{item.name}</Text>
            <Text style={styles.emergencyTime}>{item.time}</Text>
          </View>
        </View>

        <Text style={styles.emergencyTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.emergencyInfo}>
          <View style={styles.emergencyInfoItem}>
            <Ionicons name="location" size={14} color="#ef4444" />
            <Text style={styles.emergencyLocation} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={styles.emergencyDistance}>
            <Ionicons name="navigate" size={12} color="#f59e0b" />
            <Text style={styles.emergencyDistanceText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.emergencyFooter}>
          <View style={styles.emergencyRescuerInfo}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.emergencyRescuerText}>
              需要 {item.rescuerCount} 人救援
            </Text>
          </View>
          {userResponded ? (
            <View style={styles.respondedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.respondedBadgeText}>已响应</Text>
            </View>
          ) : isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#6b7280" />
              <Text style={styles.completedBadgeText}>已满员</Text>
            </View>
          ) : showResponseCount && item.responseCount > 0 ? (
            <TouchableOpacity 
              style={styles.responseCountBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleShowResponders(item);
              }}
            >
              <Ionicons name="people" size={16} color="#3b82f6" />
              <Text style={styles.responseCountText}>{item.responseCount}人响应</Text>
              <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
            </TouchableOpacity>
          ) : !showResponseCount ? (
            <TouchableOpacity 
              style={styles.respondBtn}
              onPress={(e) => {
                e.stopPropagation();
                showAppAlert('确认响应', `确定要响应 ${item.name} 的紧急求助吗？`, [
                  { text: '取消', style: 'cancel' },
                  { text: '立即响应', onPress: () => showAppAlert('成功', '已响应求助，请尽快前往现场') }
                ]);
              }}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.respondBtnText}>立即响应</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.headerTitle}>紧急求助</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            已接收
          </Text>
          {activeTab === 'received' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
          onPress={() => setActiveTab('mine')}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>
            我的
          </Text>
          {activeTab === 'mine' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'received' ? (
          <View style={styles.listContainer}>
            {receivedEmergencies.map(item => renderEmergencyCard(item, false))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {myEmergencies.map(item => renderEmergencyCard(item, true))}
          </View>
        )}
      </ScrollView>

      {/* 响应人列表弹窗 */}
      <Modal
        visible={showRespondersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRespondersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRespondersModal(false)}
          />
          <View style={styles.respondersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>响应人列表</Text>
              <TouchableOpacity 
                onPress={() => setShowRespondersModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubTitle}>
                共 {selectedEmergency?.responseCount || 0} 人响应
              </Text>
            </View>

            <ScrollView style={styles.respondersList}>
              {selectedEmergency?.responders?.map((responder) => (
                <View key={responder.id} style={styles.responderItem}>
                  <Avatar uri={responder.avatar} name={responder.name} size={40} />
                  <Text style={styles.responderName}>{responder.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  headerSpacer: {
    width: 44
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative'
  },
  tabActive: {
    // Active tab style
  },
  tabText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444'
  },
  content: {
    flex: 1
  },
  listContainer: {
    padding: 12
  },
  emergencyItem: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden'
  },
  emergencyItemHigh: {
    backgroundColor: '#fff5f5'
  },
  emergencyIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ef4444'
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  emergencyHeaderContent: {
    flex: 1,
    marginLeft: 10
  },
  emergencyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2
  },
  emergencyName: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2
  },
  urgentBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  respondingBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  respondingBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  emergencyTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  emergencyTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10
  },
  emergencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8
  },
  emergencyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1
  },
  emergencyLocation: {
    fontSize: scaleFont(13),
    color: '#4b5563',
    flex: 1
  },
  emergencyDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  emergencyDistanceText: {
    fontSize: scaleFont(12),
    color: '#d97706',
    fontWeight: '600'
  },
  emergencyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  emergencyRescuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  emergencyRescuerText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4
  },
  respondBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  responseCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4
  },
  responseCountText: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '600'
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  completedBadgeText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '600'
  },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  respondedBadgeText: {
    fontSize: scaleFont(13),
    color: '#22c55e',
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: modalTokens.overlay
  },
  respondersModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: modalTokens.border
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  modalCloseBtn: {
    padding: 4
  },
  modalSubHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalSubTitle: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  respondersList: {
    maxHeight: 400
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  responderName: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    fontWeight: '500'
  }
});
