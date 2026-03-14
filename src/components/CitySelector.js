import { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getRegionData } from '../data/regionData';
import { modalTokens } from './modalTokens';

/**
 * 城市选择器组件
 * 支持自动定位、热门城市、多语言
 */
export default function CitySelector({ visible, currentCity, onSelect, onClose }) {
  const [locating, setLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [cityList, setCityList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 获取多语言区域数据
  const regionData = getRegionData();

  // 自动获取当前位置
  useEffect(() => {
    if (visible && !currentLocation) {
      getCurrentLocation();
    }
  }, [visible]);
  
  // 根据检测到的国家更新城市列表
  useEffect(() => {
    if (detectedCountry && regionData.cities[detectedCountry]) {
      setCityList(regionData.cities[detectedCountry]);
    } else if (regionData.countries && regionData.countries.length > 0) {
      // 默认使用第一个国家的城市
      const firstCountry = regionData.countries[0];
      setCityList(regionData.cities[firstCountry] || []);
    }
  }, [detectedCountry, regionData]);

  const getCurrentLocation = async () => {
    try {
      setLocating(true);
      
      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('位置权限被拒绝');
        setLocating(false);
        return;
      }

      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 反向地理编码获取城市信息
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address.length > 0) {
        const city = address[0].city || address[0].subregion || address[0].region;
        const country = address[0].country;
        
        setCurrentLocation(city);
        setDetectedCountry(country);
        
        console.log('检测到的位置:', { city, country });
      }
    } catch (error) {
      console.error('获取位置失败:', error);
    } finally {
      setLocating(false);
    }
  };

  const handleSelect = (city) => {
    onSelect(city);
    onClose();
  };
  
  // 过滤城市列表（根据搜索关键词）
  const filteredCities = searchQuery.trim()
    ? cityList.filter(city => 
        city.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : cityList;
  
  // 获取热门城市（取前10个）
  const hotCities = filteredCities.slice(0, 10);
  const allCities = filteredCities;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modal}>
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.title}>选择城市</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 搜索框 */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="搜索城市..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 当前定位 */}
            {!searchQuery && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>当前定位</Text>
                <TouchableOpacity 
                  style={styles.locationItem}
                  onPress={() => currentLocation && handleSelect(currentLocation)}
                  disabled={!currentLocation}
                >
                  <Ionicons 
                    name={locating ? "hourglass-outline" : "location"} 
                    size={20} 
                    color={currentLocation ? "#ef4444" : "#9ca3af"} 
                  />
                  <Text style={[
                    styles.locationText,
                    !currentLocation && styles.locationTextDisabled
                  ]}>
                    {locating ? '定位中...' : currentLocation || '定位失败'}
                  </Text>
                  {currentLocation && (
                    <Ionicons name="checkmark-circle" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 热门城市 */}
            {!searchQuery && hotCities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>热门城市</Text>
                <View style={styles.cityGrid}>
                  {hotCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityItem,
                        currentCity === city && styles.cityItemActive
                      ]}
                      onPress={() => handleSelect(city)}
                    >
                      <Text style={[
                        styles.cityText,
                        currentCity === city && styles.cityTextActive
                      ]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 所有城市 / 搜索结果 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `搜索结果 (${allCities.length})` : '所有城市'}
              </Text>
              {allCities.length > 0 ? (
                <View style={styles.cityList}>
                  {allCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.cityListItem}
                      onPress={() => handleSelect(city)}
                    >
                      <Text style={styles.cityListText}>{city}</Text>
                      {currentCity === city && (
                        <Ionicons name="checkmark" size={20} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                  <Text style={styles.noResultsText}>未找到匹配的城市</Text>
                  <Text style={styles.noResultsHint}>试试其他关键词</Text>
                </View>
              )}
            </View>

            {/* 不显示位置 */}
            {!searchQuery && (
              <TouchableOpacity
                style={styles.noLocationBtn}
                onPress={() => handleSelect('不显示')}
              >
                <Ionicons name="close-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.noLocationText}>不显示位置</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    height: '80%',
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    ...Platform.select({
      ios: {
        shadowColor: modalTokens.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: modalTokens.textPrimary,
    marginLeft: 8,
    padding: 0,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: modalTokens.textSecondary,
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    gap: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: modalTokens.textPrimary,
  },
  locationTextDisabled: {
    color: modalTokens.textMuted,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: modalTokens.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityItemActive: {
    backgroundColor: modalTokens.dangerSoft,
    borderColor: modalTokens.danger,
  },
  cityText: {
    fontSize: 14,
    color: modalTokens.textSecondary,
  },
  cityTextActive: {
    color: modalTokens.danger,
    fontWeight: '700',
  },
  cityList: {
    gap: 1,
  },
  cityListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  cityListText: {
    fontSize: 15,
    color: modalTokens.textPrimary,
  },
  noLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    gap: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: modalTokens.textSecondary,
  },
});
