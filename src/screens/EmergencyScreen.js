import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Image, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../i18n';
import { modalTokens } from '../components/modalTokens';

export default function EmergencyScreen({ navigation }) {
  const t = (key) => {
    if (!i18n || typeof i18n.t !== 'function') {
      return key;
    }
    return i18n.t(key);
  };
  
  const [emergencyForm, setEmergencyForm] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    contact: '', 
    rescuerCount: 1 
  });
  const [emergencyImages, setEmergencyImages] = useState([]); // 紧急求助图片
  const [showProgressModal, setShowProgressModal] = useState(false); // 显示进度模态框
  const [notificationProgress, setNotificationProgress] = useState(0); // 通知发送进度
  const [totalUsers, setTotalUsers] = useState(0); // 总用户数

  const freeCount = 1;
  const usedCount = 0;
  const remainingFree = freeCount - usedCount;
  const freeRescuerLimit = 5;
  const extraRescuerFee = 2;
  
  const calculateRescuerFee = (count) => {
    if (count <= freeRescuerLimit) return 0;
    return (count - freeRescuerLimit) * extraRescuerFee;
  };

  const rescuerFee = calculateRescuerFee(emergencyForm.rescuerCount || 1);

  // Use useMemo to prevent calling t() during initial render
  const quickTitles = React.useMemo(() => [
    t('emergency.quickTitle1'),
    t('emergency.quickTitle2'),
    t('emergency.quickTitle3')
  ], []);

  // 请求相册权限
  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册访问权限才能上传图片');
        return false;
      }
    }
    return true;
  };

  // 选择图片
  const pickImage = async () => {
    // 检查图片数量限制
    if (emergencyImages.length >= 3) {
      Alert.alert(t('common.ok'), '最多只能上传3张图片');
      return;
    }

    // 请求权限
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          id: Date.now(),
          uri: result.assets[0].uri
        };
        setEmergencyImages([...emergencyImages, newImage]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  // 拍照
  const takePhoto = async () => {
    // 检查图片数量限制
    if (emergencyImages.length >= 3) {
      Alert.alert(t('common.ok'), '最多只能上传3张图片');
      return;
    }

    // 请求相机权限
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相机访问权限才能拍照');
        return;
      }
    }

    try {
      // 打开相机
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          id: Date.now(),
          uri: result.assets[0].uri
        };
        setEmergencyImages([...emergencyImages, newImage]);
      }
    } catch (error) {
      console.error('拍照失败:', error);
      Alert.alert('错误', '拍照失败，请重试');
    }
  };

  // 显示图片选择选项
  const showImagePickerOptions = () => {
    Alert.alert(
      '选择图片',
      '请选择图片来源',
      [
        {
          text: '拍照',
          onPress: takePhoto
        },
        {
          text: '从相册选择',
          onPress: pickImage
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  // 删除图片
  const removeImage = (id) => {
    setEmergencyImages(emergencyImages.filter(img => img.id !== id));
  };

  const handleSubmit = () => {
    if (!emergencyForm.title.trim()) {
      Alert.alert(t('emergency.enterTitle'));
      return;
    }
    
    // 显示进度模态框
    setShowProgressModal(true);
    setNotificationProgress(0);
    
    // 模拟计算附近用户数量（实际应该从API获取）
    const nearbyUserCount = Math.floor(Math.random() * 150) + 50; // 50-200之间的随机数
    setTotalUsers(nearbyUserCount);
    
    // 模拟发送通知的过程
    let currentCount = 0;
    const interval = setInterval(() => {
      currentCount += Math.floor(Math.random() * 15) + 5; // 每次增加5-20个
      
      if (currentCount >= nearbyUserCount) {
        currentCount = nearbyUserCount;
        clearInterval(interval);
        
        // 发送完成后延迟1秒关闭模态框
        setTimeout(() => {
          setShowProgressModal(false);
          const feeInfo = rescuerFee > 0 ? `\n${t('emergency.needPay')}：${rescuerFee}` : '';
          Alert.alert(
            t('emergency.published'),
            `${t('emergency.rescuersNeeded')}${emergencyForm.rescuerCount}${t('emergency.rescuerUnit')}${feeInfo}\n已通知${nearbyUserCount}位附近用户`,
            [{ text: t('emergency.confirm'), onPress: () => navigation.goBack() }]
          );
          setEmergencyForm({ title: '', description: '', location: '', contact: '', rescuerCount: 1 });
          setEmergencyImages([]);
        }, 1000);
      }
      
      setNotificationProgress(currentCount);
    }, 200); // 每200毫秒更新一次
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.headerTitle}>{t('emergency.title')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitBtn, !emergencyForm.title.trim() && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!emergencyForm.title.trim()}
        >
          <Text style={[styles.submitText, !emergencyForm.title.trim() && styles.submitTextDisabled]}>
            {t('emergency.publish')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning */}
      <View style={styles.warning}>
        <Ionicons name="warning" size={18} color="#f59e0b" />
        <Text style={styles.warningText}>{t('emergency.warning')}</Text>
      </View>

      {/* Free Count Banner */}
      <View style={styles.freeCountBanner}>
        <View style={styles.freeCountLeft}>
          <Ionicons name="gift" size={20} color={remainingFree > 0 ? "#22c55e" : "#9ca3af"} />
          <Text style={styles.freeCountText}>{t('emergency.freeCount')}</Text>
          <Text style={[styles.freeCountNumber, remainingFree <= 0 && { color: '#9ca3af' }]}>
            {remainingFree}/{freeCount}
          </Text>
        </View>
        {remainingFree <= 0 && (
          <TouchableOpacity 
            style={styles.monthlyPayButton}
            onPress={() => Alert.alert(t('emergency.monthlyUnlock'))}
          >
            <Text style={styles.monthlyPayButtonText}>{t('emergency.payAmount')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.formArea} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {t('emergency.formTitle')} <Text style={{ color: '#ef4444' }}>*</Text>
          </Text>
          <TextInput
            style={styles.formInput}
            placeholder={t('emergency.formTitlePlaceholder')}
            placeholderTextColor="#bbb"
            value={emergencyForm.title}
            onChangeText={(text) => setEmergencyForm({...emergencyForm, title: text})}
          />
          <View style={styles.quickTitlesContainer}>
            <Text style={styles.quickTitlesLabel}>{t('emergency.quickTitles')}</Text>
            <View style={styles.quickTitlesRow}>
              {quickTitles.map((title, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickTitleTag}
                  onPress={() => setEmergencyForm({...emergencyForm, title: title})}
                >
                  <Text style={styles.quickTitleText}>{title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithCounter}>
            <Text style={styles.formLabel}>{t('emergency.description')}</Text>
            <Text style={[
              styles.charCounter,
              emergencyForm.description.length > 200 && styles.charCounterError
            ]}>
              {emergencyForm.description.length}/200
            </Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.formTextarea]}
            placeholder={t('emergency.descriptionPlaceholder')}
            placeholderTextColor="#bbb"
            value={emergencyForm.description}
            onChangeText={(text) => {
              if (text.length <= 200) {
                setEmergencyForm({...emergencyForm, description: text});
              }
            }}
            multiline
            textAlignVertical="top"
            maxLength={200}
          />
          
          {/* 图片上传区域 */}
          <View style={styles.imageUploadSection}>
            <View style={styles.imageGrid}>
              {emergencyImages.map((image) => (
                <View key={image.id} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.uploadedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(image.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* 添加图片按钮 */}
              {emergencyImages.length < 3 && (
                <View style={styles.addImageBtnWrapper}>
                  <TouchableOpacity 
                    style={styles.addImageBtn}
                    onPress={showImagePickerOptions}
                  >
                    <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                    <Text style={styles.addImageText}>添加图片</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={styles.imageHint}>最多可上传3张图片，帮助他人更好地了解情况</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('emergency.location')}</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationInput}>
              <Ionicons name="location" size={18} color="#ef4444" />
              <TextInput
                style={styles.locationText}
                placeholder={t('emergency.locationPlaceholder')}
                placeholderTextColor="#bbb"
                value={emergencyForm.location}
                onChangeText={(text) => setEmergencyForm({...emergencyForm, location: text})}
              />
            </View>
            <TouchableOpacity style={styles.locationBtn}>
              <Ionicons name="navigate" size={18} color="#3b82f6" />
              <Text style={styles.locationBtnText}>{t('emergency.locate')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('emergency.contact')}</Text>
          <View style={styles.contactInput}>
            <Ionicons name="call" size={18} color="#6b7280" />
            <TextInput
              style={styles.contactText}
              placeholder={t('emergency.contactPlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.contact}
              onChangeText={(text) => setEmergencyForm({...emergencyForm, contact: text})}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Rescuer Count */}
        <View style={styles.formGroup}>
          <View style={styles.rescuerCountHeader}>
            <Text style={styles.formLabel}>{t('emergency.rescuerCount')}</Text>
            <View style={styles.rescuerFreeTag}>
              <Ionicons name="information-circle" size={14} color="#22c55e" />
              <Text style={styles.rescuerFreeText}>{t('emergency.rescuerFree')}</Text>
            </View>
          </View>
          
          <View style={styles.rescuerCountInputWrapper}>
            <TextInput
              style={styles.rescuerCountInput}
              placeholder={t('emergency.rescuerPlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.rescuerCount === 0 ? '' : emergencyForm.rescuerCount.toString()}
              onChangeText={(text) => {
                if (text === '') {
                  setEmergencyForm({...emergencyForm, rescuerCount: 0});
                  return;
                }
                const num = parseInt(text);
                if (!isNaN(num)) {
                  const validNum = Math.max(1, Math.min(20, num));
                  setEmergencyForm({...emergencyForm, rescuerCount: validNum});
                }
              }}
              onBlur={() => {
                if (emergencyForm.rescuerCount === 0) {
                  setEmergencyForm({...emergencyForm, rescuerCount: 1});
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.rescuerCountUnit}>{t('emergency.rescuerUnit')}</Text>
          </View>

          <View style={styles.rescuerFeeInfo}>
            {rescuerFee === 0 ? (
              <View style={styles.rescuerFeeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.rescuerFeeTextFree}>{t('emergency.rescuerFeeTextFree')}</Text>
              </View>
            ) : (
              <View style={styles.rescuerFeeCard}>
                <View style={styles.rescuerFeeRow}>
                  <View style={styles.rescuerFeeLeft}>
                    <Text style={styles.rescuerFeeLabel}>{t('emergency.rescuerFeeLabel')}</Text>
                    <Text style={styles.rescuerFeeExtra}>
                      {emergencyForm.rescuerCount - freeRescuerLimit}{t('emergency.rescuerUnit')} × ${extraRescuerFee}
                    </Text>
                  </View>
                  <View style={styles.rescuerFeeRight}>
                    <Text style={styles.rescuerFeeTotalLabel}>{t('emergency.needPay')}</Text>
                    <Text style={styles.rescuerFeeTotal}>${rescuerFee}</Text>
                  </View>
                </View>
                <Text style={styles.rescuerFeeNote}>{t('emergency.rescuerFeeNote')}</Text>
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => Alert.alert(
                    t('emergency.pay') + ' ' + rescuerFee,
                    t('emergency.paymentMethods')
                  )}
                >
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>{t('emergency.payNow')} ${rescuerFee}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>{t('emergency.tips')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip1')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip2')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip3')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 通知发送进度模态框 */}
      <Modal
        visible={showProgressModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.progressModalOverlay}>
          <View style={styles.progressModalContent}>
            <View style={styles.progressHeader}>
              <Ionicons name="notifications" size={32} color="#ef4444" />
              <Text style={styles.progressTitle}>正在发送紧急通知</Text>
            </View>
            
            <View style={styles.progressBody}>
              <View style={styles.progressNumberContainer}>
                <Text style={styles.progressNumber}>{notificationProgress}</Text>
                <Text style={styles.progressTotal}>/ {totalUsers}</Text>
              </View>
              <Text style={styles.progressLabel}>已通知用户数</Text>
              
              {/* 进度条 */}
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${totalUsers > 0 ? (notificationProgress / totalUsers) * 100 : 0}%` }
                  ]} 
                />
              </View>
              
              <View style={styles.progressInfo}>
                <Ionicons name="location" size={16} color="#6b7280" />
                <Text style={styles.progressInfoText}>
                  正在通知附近5公里内的用户
                </Text>
              </View>
            </View>
            
            {notificationProgress >= totalUsers && (
              <View style={styles.progressComplete}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                <Text style={styles.progressCompleteText}>通知发送完成！</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: modalTokens.border 
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: modalTokens.textPrimary },
  submitBtn: { backgroundColor: modalTokens.danger, paddingHorizontal: modalTokens.actionPaddingX, paddingVertical: modalTokens.actionPaddingY, borderRadius: modalTokens.actionRadius },
  submitBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  submitText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  submitTextDisabled: { color: '#fff' },
  warning: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fffbeb', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    gap: 8 
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  freeCountBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  freeCountLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freeCountText: { fontSize: 14, color: '#374151' },
  freeCountNumber: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  monthlyPayButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#ef4444', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  monthlyPayButtonText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  formArea: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  charCounter: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500'
  },
  charCounterError: {
    color: '#ef4444'
  },
  formInput: { 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    fontSize: 15, 
    color: '#1f2937' 
  },
  quickTitlesContainer: { marginTop: 12 },
  quickTitlesLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  quickTitlesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickTitleTag: { 
    backgroundColor: '#fef2f2', 
    borderWidth: 1, 
    borderColor: '#fecaca', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  quickTitleText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  formTextarea: { minHeight: 100, textAlignVertical: 'top' },
  
  // 图片上传样式
  imageUploadSection: { marginTop: 12 },
  imageGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  imageItem: { 
    width: '33.33%',
    aspectRatio: 1, 
    paddingHorizontal: 4,
    marginBottom: 8, 
    position: 'relative'
  },
  uploadedImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  removeImageBtn: { 
    position: 'absolute', 
    top: 4, 
    right: 8, 
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  addImageBtn: { 
    width: '100%',
    height: '100%',
    backgroundColor: '#f9fafb', 
    borderWidth: 1.5, 
    borderColor: '#e5e7eb', 
    borderStyle: 'dashed',
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  addImageBtnWrapper: {
    width: '33.33%',
    aspectRatio: 1,
    paddingHorizontal: 4,
    marginBottom: 8
  },
  addImageText: { 
    fontSize: 12, 
    color: '#9ca3af', 
    marginTop: 4,
    fontWeight: '500'
  },
  imageHint: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4
  },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationInput: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  locationText: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  locationBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 4 
  },
  locationBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '500' },
  contactInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  contactText: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  rescuerCountHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  rescuerFreeTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#bbf7d0' 
  },
  rescuerFreeText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  rescuerCountInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  rescuerCountInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1f2937' },
  rescuerCountUnit: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  rescuerFeeInfo: { marginTop: 12 },
  rescuerFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rescuerFeeTextFree: { fontSize: 14, color: '#22c55e', fontWeight: '500' },
  rescuerFeeCard: { 
    backgroundColor: '#fff7ed', 
    borderWidth: 1, 
    borderColor: '#fed7aa', 
    borderRadius: 8, 
    padding: 12 
  },
  rescuerFeeLeft: { flex: 1 },
  rescuerFeeLabel: { fontSize: 13, color: '#92400e', marginBottom: 4 },
  rescuerFeeExtra: { fontSize: 15, color: '#ea580c', fontWeight: '600' },
  rescuerFeeRight: { alignItems: 'flex-end' },
  rescuerFeeTotalLabel: { fontSize: 12, color: '#92400e', marginBottom: 2 },
  rescuerFeeTotal: { fontSize: 24, fontWeight: 'bold', color: '#ef4444' },
  rescuerFeeNote: { fontSize: 12, color: '#92400e', marginTop: 8 },
  payButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ef4444', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginTop: 12, 
    gap: 8 
  },
  payButtonText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  tips: { 
    backgroundColor: '#fef2f2', 
    borderRadius: 8, 
    padding: 12, 
    marginTop: 8 
  },
  tipsTitle: { fontSize: 13, fontWeight: '500', color: '#991b1b', marginBottom: 8 },
  tipsText: { fontSize: 12, color: '#b91c1c', lineHeight: 20 },
  
  // 进度模态框样式
  progressModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressModalContent: {
    backgroundColor: modalTokens.surface,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: modalTokens.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginTop: 12,
  },
  progressBody: {
    alignItems: 'center',
  },
  progressNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ef4444',
    lineHeight: 56,
  },
  progressTotal: {
    fontSize: 24,
    fontWeight: '600',
    color: modalTokens.textMuted,
    marginLeft: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: modalTokens.textSecondary,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: modalTokens.surfaceMuted,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressInfoText: {
    fontSize: 13,
    color: modalTokens.textSecondary,
  },
  progressComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
  },
  progressCompleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
});
