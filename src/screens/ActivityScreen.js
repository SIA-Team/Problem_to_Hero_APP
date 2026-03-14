import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';

const initialActivities = [
  { 
    id: 1, 
    title: '新人答题挑战赛', 
    desc: '连续7天回答问题，赢取100元现金奖励', 
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop', 
    images: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
    ],
    participants: 12580, 
    startTime: '2026-01-10', 
    endTime: '2026-01-20', 
    type: 'online', 
    tag: 'hot', 
    status: 'active', 
    joined: false, 
    organizer: 'platform', 
    organizerType: 'platform' 
  },
  { id: 2, title: 'Python学习打卡活动', desc: '每日打卡学习Python，坚持21天获得认证徽章', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop', participants: 8956, startTime: '2026-01-05', endTime: '2026-01-26', type: 'online', tag: 'new', status: 'active', joined: true, progress: '12/21天', organizer: 'Python学习互助团队', organizerType: 'team' },
  { id: 3, title: '程序员线下交流会', desc: '北京站程序员面对面交流，分享技术心得', image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=200&fit=crop', participants: 156, startTime: '2026-01-25', endTime: '2026-01-25', type: 'offline', address: '北京市朝阳区望京SOHO', tag: 'hot', status: 'active', joined: false, organizer: '张三', organizerType: 'personal' },
  { id: 4, title: '优质回答评选', desc: '本周最佳回答评选，获奖者可获得专属勋章', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop', participants: 5623, startTime: '2026-01-01', endTime: '2026-01-10', type: 'online', tag: 'ended', status: 'ended', joined: true, progress: '已完成', organizer: 'platform', organizerType: 'platform' },
  { id: 5, title: '邀请好友得红包', desc: '邀请好友注册，双方各得5元红包', image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=200&fit=crop', participants: 23456, startTime: '2026-01-01', endTime: '2026-12-31', type: 'online', tag: 'hot', status: 'active', joined: false, organizer: 'platform', organizerType: 'platform' },
];

export default function ActivityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  // 检查是否从我的页面跳转过来
  const isFromProfile = route?.params?.fromProfile === true;
  const initialTab = isFromProfile ? t('screens.activity.tabs.mine') : t('screens.activity.tabs.all');
  
  // 检查是否从团队页面跳转过来创建活动
  const createMode = route?.params?.createMode === true;
  const teamId = route?.params?.teamId;
  const teamName = route?.params?.teamName;
  const fromTeamDetail = route?.params?.fromTeamDetail === true; // 标记是否从团队详情页进入
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activities, setActivities] = useState(initialActivities);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 监听路由参数变化
  useEffect(() => {
    if (route?.params?.fromProfile) {
      setActiveTab(t('screens.activity.tabs.mine'));
    }
  }, [route?.params?.fromProfile]);

  const getFilteredActivities = () => {
    const tabs = {
      [t('screens.activity.tabs.hot')]: activities.filter(a => a.tag === 'hot' && a.status === 'active'),
      [t('screens.activity.tabs.new')]: activities.filter(a => a.tag === 'new' && a.status === 'active'),
      [t('screens.activity.tabs.ended')]: activities.filter(a => a.status === 'ended'),
      [t('screens.activity.tabs.mine')]: activities.filter(a => a.joined),
    };
    return tabs[activeTab] || activities;
  };

  // 处理图片点击
  const handleImagePress = (activity) => {
    if (activity.images && activity.images.length > 1) {
      // 多张图片，打开图片查看器
      setViewerImages(activity.images);
      setCurrentImageIndex(0);
      setShowImageViewer(true);
    } else {
      // 单张图片或无图片，进入活动详情页
      Alert.alert(t('common.ok'), t('screens.activity.actions.viewDetail'));
    }
  };

  const handleJoinActivity = (id) => {
    setActivities(activities.map(a => {
      if (a.id === id) {
        if (a.joined) {
          Alert.alert(t('common.ok'), t('screens.activity.actions.quitConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), onPress: () => {
              setActivities(prev => prev.map(item => 
                item.id === id ? { ...item, joined: false, participants: item.participants - 1 } : item
              ));
            }}
          ]);
          return a;
        }
        return { ...a, joined: true, participants: a.participants + 1, progress: '0/7天' };
      }
      return a;
    }));
  };

  const getTagColor = (tag) => {
    switch (tag) {
      case 'hot': return '#ef4444';
      case 'new': return '#3b82f6';
      case 'ended': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  const getOrganizerIcon = (organizerType) => {
    switch (organizerType) {
      case 'team': return 'people';
      case 'personal': return 'person';
      case 'platform': return 'shield-checkmark';
      default: return 'person';
    }
  };

  const getOrganizerColor = (organizerType) => {
    switch (organizerType) {
      case 'team': return '#8b5cf6';
      case 'personal': return '#3b82f6';
      case 'platform': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const filteredActivities = getFilteredActivities();
  
  const tabs = [
    t('screens.activity.tabs.all'),
    t('screens.activity.tabs.hot'),
    t('screens.activity.tabs.new'),
    t('screens.activity.tabs.ended'),
    t('screens.activity.tabs.mine')
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        {isFromProfile ? (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Main', { screen: '我的' })} 
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={styles.headerTitle}>{isFromProfile ? t('screens.activity.myActivities') : t('screens.activity.title')}</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CreateActivity')}
          style={styles.createBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>{t('screens.activity.create')}</Text>
        </TouchableOpacity>
      </View>

      {/* 标签栏 - 仅在非从我的页面进入时显示 */}
      {!isFromProfile && (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {tabs.map(tab => (
              <TouchableOpacity 
                key={tab}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 活动列表 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map(item => (
            <View key={item.id} style={styles.activityCard}>
              {/* 封面图区域 - 可点击查看图片 */}
              <TouchableOpacity 
                style={styles.coverImageContainer}
                onPress={() => handleImagePress(item)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: item.image }} style={styles.activityImage} />
                
                {/* 图片数量角标 - 仅多图时显示 */}
                {item.images && item.images.length > 1 && (
                  <View style={styles.imageCountBadge}>
                    <Ionicons name="images" size={14} color="#fff" />
                    <Text style={styles.imageCountText}>1/{item.images.length}</Text>
                  </View>
                )}
                
                {/* 标签 */}
                <View style={styles.activityBadges}>
                  <View style={[styles.activityTag, { backgroundColor: getTagColor(item.tag) }]}>
                    <Text style={styles.activityTagText}>{t(`screens.activity.tag.${item.tag}`)}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: item.type === 'online' ? '#8b5cf6' : '#f59e0b' }]}>
                    <Ionicons name={item.type === 'online' ? 'globe-outline' : 'location-outline'} size={10} color="#fff" />
                    <Text style={styles.typeTagText}>{t(`screens.activity.type.${item.type}`)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* 活动信息区域 */}
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDesc} numberOfLines={2}>{item.desc}</Text>
                {item.type === 'offline' && item.address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location" size={14} color="#ef4444" />
                    <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
                  </View>
                )}
                <View style={styles.activityMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name={getOrganizerIcon(item.organizerType)} size={14} color={getOrganizerColor(item.organizerType)} />
                    <Text style={[styles.metaText, { color: getOrganizerColor(item.organizerType) }]}>
                      {item.organizerType === 'platform' ? t('screens.activity.organizer.platform') : item.organizer}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.participants}{t('screens.activity.participants')}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{item.startTime} ~ {item.endTime}</Text>
                  </View>
                </View>
                {item.joined && item.progress && (
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>{t('screens.activity.progress')}</Text>
                    <Text style={styles.progressText}>{item.progress}</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.joinBtn, item.joined && styles.joinedBtn, item.status === 'ended' && styles.endedBtn]}
                  onPress={() => item.status !== 'ended' && handleJoinActivity(item.id)}
                  disabled={item.status === 'ended'}
                >
                  <Text style={[styles.joinBtnText, item.joined && styles.joinedBtnText]}>
                    {item.status === 'ended' ? t('screens.activity.actions.ended') : item.joined ? t('screens.activity.actions.joined') : t('screens.activity.actions.join')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('screens.activity.empty')}</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 图片查看器 */}
      <Modal visible={showImageViewer} animationType="fade" transparent={false} statusBarTranslucent>
        <View style={styles.imageViewerContainer}>
          {/* 顶部工具栏 */}
          <View style={[styles.imageViewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowImageViewer(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageViewerCounter}>
              {currentImageIndex + 1}/{viewerImages.length}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* 图片轮播 */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
              );
              setCurrentImageIndex(index);
            }}
            style={styles.imageViewerScroll}
          >
            {viewerImages.map((image, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image
                  source={{ uri: image }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* 底部指示器 */}
          <View style={styles.imageViewerFooter}>
            {viewerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.imageIndicator,
                  index === currentImageIndex && styles.imageIndicatorActive
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', zIndex: 10 },
  backBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', flex: 1, textAlign: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4, minHeight: 38, minWidth: 74, justifyContent: 'center', zIndex: 20 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabScroll: { paddingHorizontal: 8 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#ef4444' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#ef4444', fontWeight: '600' },
  content: { flex: 1 },
  activityCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  activityImage: { width: '100%', height: 140 },
  activityBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  activityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  activityTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  typeTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, gap: 2 },
  typeTagText: { color: '#fff', fontSize: 10, fontWeight: '500' },
  activityInfo: { padding: 14 },
  activityTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 6 },
  activityDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  addressText: { flex: 1, fontSize: 12, color: '#ef4444' },
  activityMeta: { flexDirection: 'row', marginBottom: 10, gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#fef2f2', padding: 8, borderRadius: 6 },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  progressText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  joinBtn: { backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  joinedBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444' },
  endedBtn: { backgroundColor: '#e5e7eb' },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  joinedBtnText: { color: '#ef4444' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9ca3af', marginTop: 16 },
  // 封面图容器
  coverImageContainer: { position: 'relative', width: '100%', height: 140 },
  // 图片数量角标
  imageCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // 图片查看器
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: modalTokens.overlay,
  },
  imageViewerCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageSlide: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
});
