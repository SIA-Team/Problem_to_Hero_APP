import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeTabContent from '../components/HomeTabContent';
import { useTabPrefetch } from '../hooks/useTabPrefetch';
import { useTranslation } from '../i18n/useTranslation';
import { getRegionData } from '../data/regionData';

const { width: screenWidth } = Dimensions.get('window');

/**
 * 优化版首页（简化版）
 * 不依赖 react-native-tab-view，使用 ScrollView 实现
 */
export default function HomeScreenOptimizedSimple({ navigation }) {
  const { t } = useTranslation();
  const scrollViewRef = useRef(null);
  
  const [activeTabIndex, setActiveTabIndex] = useState(2); // 默认显示"推荐" Tab
  
  // 地区选择器状态
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionStep, setRegionStep] = useState(0); // 0:国家 1:城市 2:州 3:区
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  
  // 获取多语言区域数据
  const regionData = useMemo(() => getRegionData(), []);
  
  // Tab 配置
  const tabs = useMemo(() => [
    { key: 'follow', title: t('home.follow'), navigate: 'Follow' },
    { key: 'topics', title: t('home.topics') },
    { key: 'recommend', title: t('home.recommend') },
    { key: 'hot', title: t('home.hotList'), navigate: 'HotList' },
    { key: 'income', title: t('home.incomeRanking'), navigate: 'IncomeRanking' },
    { key: 'question', title: t('home.questionRanking'), navigate: 'QuestionRanking' },
    { key: 'sameCity', title: t('home.sameCity') },
    { key: 'country', title: t('home.country') },
    { key: 'industry', title: t('home.industry') },
    { key: 'personal', title: t('home.personal') },
    { key: 'workplace', title: t('home.workplace') },
    { key: 'education', title: t('home.education') },
  ], [t]);
  
  /**
   * 预加载函数
   */
  const prefetchTab = useCallback((tab, tabIndex) => {
    console.log(`🔮 预加载 Tab: ${tab.title} (index: ${tabIndex})`);
  }, []);
  
  /**
   * 使用预加载 Hook
   */
  useTabPrefetch(activeTabIndex, tabs, prefetchTab, {
    delay: 500,
    prefetchDistance: 1,
    enabled: true,
  });
  
  /**
   * 地区选择器函数
   */
  const getRegionOptions = () => {
    if (regionStep === 0) return regionData.countries;
    if (regionStep === 1) return regionData.cities[selectedRegion.country] || [];
    if (regionStep === 2) return regionData.states[selectedRegion.city] || [];
    if (regionStep === 3) return regionData.districts[selectedRegion.state] || [];
    return [];
  };

  const selectRegion = (value) => {
    if (regionStep === 0) { 
      setSelectedRegion({ ...selectedRegion, country: value, city: '', state: '', district: '' }); 
      // 自动跳转到下一层
      if (regionData.cities[value] && regionData.cities[value].length > 0) {
        setRegionStep(1);
      }
    }
    else if (regionStep === 1) { 
      setSelectedRegion({ ...selectedRegion, city: value, state: '', district: '' }); 
      // 自动跳转到下一层
      if (regionData.states[value] && regionData.states[value].length > 0) {
        setRegionStep(2);
      }
    }
    else if (regionStep === 2) { 
      setSelectedRegion({ ...selectedRegion, state: value, district: '' }); 
      // 自动跳转到下一层
      if (regionData.districts[value] && regionData.districts[value].length > 0) {
        setRegionStep(3);
      }
    }
    else { 
      setSelectedRegion({ ...selectedRegion, district: value }); 
    }
  };

  const getRegionTitle = () => [t('home.selectCountry'), t('home.selectCity'), t('home.selectState'), t('home.selectDistrict')][regionStep];
  
  const getDisplayRegion = () => {
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    // 只显示最后一级，如果没有选择则显示"全球"
    if (parts.length === 0) return t('home.global');
    return parts[parts.length - 1];
  };
  
  /**
   * 处理 Tab 点击
   */
  const handleTabPress = useCallback((tab, index) => {
    // 如果有导航目标，则跳转
    if (tab.navigate) {
      navigation.navigate(tab.navigate);
      return;
    }
    
    // 否则切换 Tab
    setActiveTabIndex(index);
  }, [navigation]);
  
  /**
   * 渲染当前激活的 Tab 内容
   */
  const renderActiveTabContent = () => {
    const activeTab = tabs[activeTabIndex];
    
    // 特殊处理某些 Tab
    if (activeTab.key === 'topics') {
      return (
        <View style={styles.comingSoon}>
          <Ionicons name="construct-outline" size={48} color="#9ca3af" />
          <Text style={styles.comingSoonText}>话题功能开发中...</Text>
        </View>
      );
    }
    
    return (
      <HomeTabContent
        tabKey={activeTab.key}
        tabType={activeTab.key}
        isActive={true}
        navigation={navigation}
      />
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部搜索栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => setShowRegionModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color="#ef4444" />
          <Text style={styles.regionText} numberOfLines={1}>
            {getDisplayRegion()}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={16} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>{t('home.search')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('MyTeams')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={22} color="#4b5563" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Messages')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#4b5563" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* Tab 栏 */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab, index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTabIndex === index && styles.tabTextActive,
                ]}
              >
                {tab.title}
              </Text>
              {activeTabIndex === index && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity
          style={styles.tabMenuBtn}
          onPress={() => navigation.navigate('ChannelManage')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Tab 内容 */}
      <View style={styles.content}>
        {renderActiveTabContent()}
      </View>

      {/* 地区选择器 Modal */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1} 
            onPress={() => { setShowRegionModal(false); setRegionStep(0); }}
          />
          <View style={[styles.regionModal, { paddingBottom: 30 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowRegionModal(false); setRegionStep(0); }}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('home.selectRegion')}</Text>
              <TouchableOpacity onPress={() => { 
                setShowRegionModal(false);
                setRegionStep(0);
              }}>
                <Text style={styles.confirmText}>{t('home.confirm')}</Text>
              </TouchableOpacity>
            </View>
            
            {/* 面包屑导航 */}
            <View style={styles.breadcrumbContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScrollContent}>
                <TouchableOpacity 
                  style={styles.breadcrumbItem}
                  onPress={() => setRegionStep(0)}
                >
                  <Text style={[styles.breadcrumbText, regionStep === 0 && styles.breadcrumbTextActive]}>
                    {selectedRegion.country || t('home.country')}
                  </Text>
                </TouchableOpacity>
                
                {selectedRegion.country && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(1)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 1 && styles.breadcrumbTextActive]}>
                        {selectedRegion.city}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedRegion.city && selectedRegion.state && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(2)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 2 && styles.breadcrumbTextActive]}>
                        {selectedRegion.state}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedRegion.state && selectedRegion.district && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity 
                      style={styles.breadcrumbItem}
                      onPress={() => setRegionStep(3)}
                    >
                      <Text style={[styles.breadcrumbText, regionStep === 3 && styles.breadcrumbTextActive]}>
                        {selectedRegion.district}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
            
            <ScrollView style={styles.regionList}>
              {getRegionOptions().map((option, idx) => (
                <TouchableOpacity key={idx} style={styles.regionOption} onPress={() => selectRegion(option)}>
                  <Text style={styles.regionOptionText}>{option}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    marginRight: 8,
    maxWidth: 80,
  },
  regionText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  iconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabBar: {
    flex: 1,
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ef4444',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#ef4444',
    borderRadius: 1.5,
  },
  tabMenuBtn: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  // 地区选择器 Modal 样式
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  regionModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  confirmText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  breadcrumbContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  breadcrumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  breadcrumbText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: 20,
  },
  breadcrumbTextActive: {
    color: '#ef4444',
    fontWeight: '500',
  },
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionList: {
    padding: 8,
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  regionOptionText: {
    fontSize: 15,
    color: '#1f2937',
  },
});
