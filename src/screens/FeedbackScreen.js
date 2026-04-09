import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import userApi from '../services/api/userApi';
import { scaleFont } from '../utils/responsive';

function FeedbackScreen({ navigation }) {
  const { t } = useTranslation();
  const bottomSafeInset = useBottomSafeInset();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  const titleInputRef = useRef(null);
  const contentInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const feedbackTypeMap = {
    '功能建议': 0,
    'Bug反馈': 1,
    '内容问题': 2,
    '其他': 2
  };

  // 验证联系方式格式（宽松验证，支持国际手机号和邮箱）
  const validateContact = (text) => {
    if (!text.trim()) return true; // 选填，空值有效
    
    // 邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // 手机号格式（支持国际号码，6-15位数字，可选+号和国家码）
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{4,15}$/;
    
    return emailRegex.test(text) || phoneRegex.test(text.replace(/\s/g, ''));
  };

  // 选择图片
  const pickImage = async () => {
    if (images.length >= 5) {
      showAppAlert('提示', '最多只能上传5张图片');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAppAlert('权限不足', '需要访问相册权限才能上传图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // 检查文件大小（5MB限制）
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showAppAlert('图片过大', '单张图片不能超过5MB，请选择其他图片');
          return;
        }

        setImages([...images, asset]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      showAppAlert('错误', '选择图片失败，请重试');
    }
  };

  // 删除图片
  const removeImage = (index) => {
    Alert.alert(
      '删除图片',
      '确定要删除这张图片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const newImages = [...images];
            newImages.splice(index, 1);
            setImages(newImages);
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      shakeInput();
      showAppAlert('\u63d0\u793a', '\u8bf7\u8f93\u5165\u53cd\u9988\u6807\u9898');
      titleInputRef.current?.focus();
      return;
    }

    if (!content.trim()) {
      shakeInput();
      showAppAlert('\u63d0\u793a', '\u8bf7\u8f93\u5165\u53cd\u9988\u5185\u5bb9');
      contentInputRef.current?.focus();
      return;
    }

    if (content.trim().length < 10) {
      shakeInput();
      showAppAlert('\u63d0\u793a', '\u53cd\u9988\u5185\u5bb9\u81f3\u5c11\u9700\u898110\u4e2a\u5b57\u7b26');
      return;
    }

    if (contact.trim() && !validateContact(contact)) {
      shakeInput();
      showAppAlert('\u63d0\u793a', '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u90ae\u7bb1\u6216\u624b\u673a\u53f7');
      contactInputRef.current?.focus();
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedContact = contact.trim();
    const requestData = {
      content: trimmedTitle
        ? `\u6807\u9898\uff1a${trimmedTitle}\n\n${trimmedContent}`
        : trimmedContent
    };

    if (selectedType && feedbackTypeMap[selectedType] !== undefined) {
      requestData.type = feedbackTypeMap[selectedType];
    }

    if (trimmedContact) {
      requestData.contact = trimmedContact;
    }

    setIsSubmitting(true);

    try {
      const response = await userApi.submitFeedback(requestData);

      if (!response || response.code !== 200) {
        throw new Error(response?.msg || '\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
      }

      showAppAlert(
        '\u63d0\u4ea4\u6210\u529f',
        '\u611f\u8c22\u60a8\u7684\u53cd\u9988\uff01\u6211\u4eec\u4f1a\u8ba4\u771f\u5904\u7406\u60a8\u7684\u610f\u89c1\u3002',
        [
          {
            text: '\u786e\u5b9a',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      showAppAlert('\u63d0\u4ea4\u5931\u8d25', error?.message || '\u7f51\u7edc\u9519\u8bef\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true
      })
    ]).start();
  };

  const clearAll = () => {
    setTitle('');
    setContent('');
    setContact('');
    setSelectedType('');
    setImages([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>意见反馈</Text>
          <TouchableOpacity
            onPress={clearAll}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>清空</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomSafeInset + 112 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* 顶部提示卡片 */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrapper}>
              <Ionicons name="bulb" size={24} color="#f59e0b" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>您的意见很重要</Text>
              <Text style={styles.tipText}>
                我们会认真对待每一条反馈，帮助我们做得更好
              </Text>
            </View>
          </View>

          {/* 标题输入区域 */}
          <Animated.View
            style={[
              styles.inputSection,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            <View style={styles.inputHeader}>
              <Ionicons name="create-outline" size={20} color="#6b7280" />
              <Text style={styles.inputLabel}>反馈标题</Text>
              <Text style={styles.requiredMark}>*</Text>
            </View>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'title' && styles.inputWrapperFocused
              ]}
            >
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="简要描述您的问题或建议"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
              />
              {title.length > 0 && (
                <TouchableOpacity
                  onPress={() => setTitle('')}
                  style={styles.clearIconButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.charCount}>{title.length}/50</Text>
          </Animated.View>

          {/* 内容输入区域 */}
          <Animated.View
            style={[
              styles.inputSection,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            <View style={styles.inputHeader}>
              <Ionicons name="document-text-outline" size={20} color="#6b7280" />
              <Text style={styles.inputLabel}>详细描述</Text>
              <Text style={styles.requiredMark}>*</Text>
            </View>
            <Pressable
              onPress={() => contentInputRef.current?.focus()}
              style={[
                styles.inputWrapper,
                styles.contentInputWrapper,
                focusedField === 'content' && styles.inputWrapperFocused
              ]}
            >
              <TextInput
                ref={contentInputRef}
                style={styles.contentInput}
                placeholder="请详细描述您遇到的问题或想法，帮助我们更好地理解您的需求（至少10个字符）"
                placeholderTextColor="#9ca3af"
                value={content}
                onChangeText={setContent}
                maxLength={500}
                multiline
                textAlignVertical="top"
                onFocus={() => setFocusedField('content')}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
            <Text style={styles.charCount}>{content.length}/500</Text>
          </Animated.View>

          {/* 联系方式输入区域 */}
          <Animated.View
            style={[
              styles.inputSection,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            <View style={styles.inputHeader}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text style={styles.inputLabel}>联系方式</Text>
              <Text style={styles.optionalMark}>（选填）</Text>
            </View>
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'contact' && styles.inputWrapperFocused
              ]}
            >
              <TextInput
                ref={contactInputRef}
                style={styles.titleInput}
                placeholder="如需回复，请留下邮箱"
                placeholderTextColor="#9ca3af"
                value={contact}
                onChangeText={setContact}
                maxLength={100}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('contact')}
                onBlur={() => setFocusedField(null)}
              />
              {contact.length > 0 && (
                <TouchableOpacity
                  onPress={() => setContact('')}
                  style={styles.clearIconButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* 反馈类型快捷选择 */}
          <View style={styles.quickSelectSection}>
            <Text style={styles.quickSelectTitle}>反馈类型</Text>
            <View style={styles.quickSelectButtons}>
              {['功能建议', 'Bug反馈', '其他'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.quickSelectButton,
                    selectedType === type && styles.quickSelectButtonActive
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[
                    styles.quickSelectButtonText,
                    selectedType === type && styles.quickSelectButtonTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 上传截图区域 */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadHeader}>
              <Ionicons name="image-outline" size={20} color="#6b7280" />
              <Text style={styles.uploadLabel}>上传截图</Text>
              <Text style={styles.optionalMark}>（选填，最多5张）</Text>
            </View>
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.imageRemoveBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.imageAddBtn}
                  onPress={pickImage}
                >
                  <Ionicons name="add" size={32} color="#9ca3af" />
                  <Text style={styles.imageAddText}>添加图片</Text>
                </TouchableOpacity>
              )}
            </View>
            {images.length > 0 && (
              <Text style={styles.imageHint}>
                已添加 {images.length}/5 张图片，每张不超过5MB
              </Text>
            )}
          </View>

          {/* 底部说明 */}
          <View style={styles.noteSection}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#9ca3af" />
            <Text style={styles.noteText}>
              您的反馈信息将被严格保密，仅用于改进产品体验
            </Text>
          </View>
        </ScrollView>

        {/* 底部提交按钮 */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: bottomSafeInset,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!title.trim() || !content.trim() || isSubmitting) &&
                styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>提交反馈</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  keyboardView: {
    flex: 1
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
  backButton: {
    padding: 4,
    width: 60
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center'
  },
  clearButton: {
    padding: 4,
    width: 60,
    alignItems: 'flex-end'
  },
  clearButtonText: {
    fontSize: scaleFont(15),
    color: '#6b7280'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  tipIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  tipContent: {
    flex: 1
  },
  tipTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4
  },
  tipText: {
    fontSize: scaleFont(13),
    color: '#b45309',
    lineHeight: scaleFont(18)
  },
  inputSection: {
    marginBottom: 24
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  inputLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6
  },
  requiredMark: {
    fontSize: scaleFont(15),
    color: '#ef4444',
    marginLeft: 4
  },
  optionalMark: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginLeft: 4
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputWrapperFocused: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  titleInput: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#1f2937',
    padding: 0
  },
  clearIconButton: {
    padding: 4,
    marginLeft: 8
  },
  contentInputWrapper: {
    minHeight: 180,
    alignItems: 'stretch'
  },
  contentInput: {
    flex: 1,
    minHeight: 152,
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    padding: 0,
    width: '100%'
  },
  charCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8
  },
  quickSelectSection: {
    marginBottom: 24
  },
  quickSelectTitle: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickSelectButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  quickSelectButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  quickSelectButtonText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  quickSelectButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  noteText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(16)
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0
  },
  submitButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff'
  },
  uploadSection: {
    marginBottom: 24
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  uploadLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f3f4f6'
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  imageAddBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4
  },
  imageAddText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  imageHint: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 8
  }
});

export default FeedbackScreen;
