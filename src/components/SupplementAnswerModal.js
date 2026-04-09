import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import KeyboardDismissView from './KeyboardDismissView';
import ModalSafeAreaView from './ModalSafeAreaView';
import { modalTokens } from './modalTokens';
import { toast } from '../utils/toast';
import answerApi from '../services/api/answerApi';
import uploadApi from '../services/api/uploadApi';
import useBottomSafeInset from '../hooks/useBottomSafeInset';

import { scaleFont } from '../utils/responsive';
/**
 * 补充回答弹窗组件
 * @param {boolean} visible - 是否显示弹窗
 * @param {function} onClose - 关闭弹窗回调
 * @param {object} answer - 要补充的原回答数据
 * @param {string|number} questionId - 问题ID（可选，用于后端bug修复后）
 * @param {function} onSuccess - 发布成功回调
 */
export default function SupplementAnswerModal({
  visible,
  onClose,
  answer,
  questionId,
  onSuccess
}) {
  const bottomSafeInset = useBottomSafeInset();
  const [supplementAnswerText, setSupplementAnswerText] = useState('');
  const [supplementIdentity, setSupplementIdentity] = useState('personal');
  const [supplementSelectedTeams, setSupplementSelectedTeams] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 图片相关状态
  const [images, setImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // 处理关闭
  const handleClose = () => {
    setSupplementAnswerText('');
    setSupplementIdentity('personal');
    setSupplementSelectedTeams([]);
    setImages([]);
    onClose();
  };

  // 处理图片选择
  const handleImageSelected = async imageUri => {
    if (images.length >= 9) {
      toast.error('最多只能上传9张图片');
      return;
    }
    try {
      setUploadingImages(true);

      // 先添加到本地预览
      const localImage = {
        uri: imageUri,
        uploading: true
      };
      setImages(prev => [...prev, localImage]);

      // 上传图片
      const fileName = imageUri.split('/').pop();
      const fileType = fileName.split('.').pop();
      const response = await uploadApi.uploadImage({
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`
      });
      if (response?.data?.code === 200 && response?.data?.data) {
        // 上传成功，更新图片URL
        setImages(prev => prev.map(img => img.uri === imageUri ? {
          uri: imageUri,
          url: response.data.data,
          uploading: false
        } : img));
        toast.success('图片上传成功');
      } else {
        throw new Error(response?.data?.msg || '上传失败');
      }
    } catch (error) {
      console.error('❌ 图片上传失败:', error);
      toast.error(error.message || '图片上传失败');
      // 移除上传失败的图片
      setImages(prev => prev.filter(img => img.uri !== imageUri));
    } finally {
      setUploadingImages(false);
    }
  };

  // 删除图片
  const handleRemoveImage = index => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交补充回答
  const handleSubmit = async () => {
    if (!supplementAnswerText.trim()) {
      toast.error('请输入补充回答内容');
      return;
    }
    if (!answer?.id) {
      toast.error('回答信息不完整');
      return;
    }
    if (isSubmitting || uploadingImages) {
      if (uploadingImages) {
        toast.error('图片正在上传中，请稍候');
      }
      return;
    }

    // 检查是否有图片还在上传
    const hasUploadingImages = images.some(img => img.uploading);
    if (hasUploadingImages) {
      toast.error('图片正在上传中，请稍候');
      return;
    }
    try {
      setIsSubmitting(true);

      // 按接口约定，仅提交补充回答内容
      const requestData = {
        content: supplementAnswerText.trim()
      };

      console.log('📤 发布补充回答:');
      console.log('  answerId:', answer.id);
      console.log('  requestData:', requestData);

      const response = await answerApi.publishSupplementAnswer(answer.id, requestData);

      if (response?.code === 200) {
        toast.success('补充回答发布成功');
        handleClose();

        // 调用成功回调
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        throw new Error(response?.msg || '发布失败');
      }
    } catch (error) {
      console.error('❌ 发布补充回答失败:', error);

      toast.error(error.message || '网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!answer) {
    return null;
  }
  return <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <KeyboardDismissView>
      <ModalSafeAreaView style={styles.container} edges={['top']}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>补充回答</Text>
          </View>
          <TouchableOpacity style={[styles.publishBtn, (!supplementAnswerText.trim() || isSubmitting) && styles.publishBtnDisabled]} onPress={handleSubmit} disabled={!supplementAnswerText.trim() || isSubmitting}>
            <Text style={[styles.publishText, (!supplementAnswerText.trim() || isSubmitting) && styles.publishTextDisabled]}>
              {isSubmitting ? '发布中...' : '发布'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 原回答信息 */}
        <View style={styles.originalAnswerContext}>
          <View style={styles.originalAnswerHeader}>
            <Ionicons name="document-text" size={18} color="#3b82f6" />
            <Text style={styles.originalAnswerLabel}>原回答</Text>
          </View>
          <View style={styles.originalAnswerAuthor}>
            <Avatar uri={answer.userAvatar || answer.avatar} name={answer.userName || answer.userNickname || answer.author || '匿名用户'} size={24} />
            <Text style={styles.originalAnswerAuthorName}>
              {answer.userName || answer.userNickname || answer.author || '匿名用户'}
            </Text>
          </View>
          <Text style={styles.originalAnswerContent} numberOfLines={3}>
            {answer.content}
          </Text>
        </View>

        {/* 内容输入区 */}
        <ScrollView
          style={styles.contentArea}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <TextInput style={styles.textInput} placeholder="补充你的回答，提供更多信息..." placeholderTextColor="#bbb" value={supplementAnswerText} onChangeText={setSupplementAnswerText} multiline autoFocus textAlignVertical="top" />
          
          {/* 图片预览区 */}
          {images.length > 0 && <View style={styles.imagesContainer}>
              {images.map((image, index) => <View key={index} style={styles.imageWrapper}>
                  <Image source={{
              uri: image.uri
            }} style={styles.imagePreview} />
                  {Boolean(image.uploading) && <View style={styles.uploadingOverlay}>
                      <Text style={styles.uploadingText}>上传中...</Text>
                    </View>}
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveImage(index)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>)}
            </View>}
          
          {/* 身份选择器 */}
          <View style={styles.identitySection}>
            <IdentitySelector selectedIdentity={supplementIdentity} selectedTeams={supplementSelectedTeams} onIdentityChange={setSupplementIdentity} onTeamsChange={setSupplementSelectedTeams} />
          </View>
        </ScrollView>

        {/* 底部工具栏 */}
        <View
          style={[
            styles.toolbar,
            {
              paddingBottom: bottomSafeInset + 8
            }
          ]}
        >
          <View style={styles.toolsLeft}>
            <TouchableOpacity style={styles.toolItem} onPress={() => setShowImagePicker(true)} disabled={uploadingImages || images.length >= 9}>
              <Ionicons name="image-outline" size={24} color={uploadingImages || images.length >= 9 ? '#ccc' : '#666'} />
              {images.length > 0 && <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{images.length}</Text>
                </View>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolItem}>
              <Ionicons name="at-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.wordCount}>{supplementAnswerText.length}/2000</Text>
        </View>

        {/* 图片选择器 */}
        <ImagePickerSheet visible={showImagePicker} onClose={() => setShowImagePicker(false)} onImageSelected={handleImageSelected} title="选择图片" />
      </ModalSafeAreaView>
      </KeyboardDismissView>
      </KeyboardAvoidingView>
    </Modal>;
}
const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  closeBtn: {
    padding: 4,
    zIndex: 10
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  publishBtn: {
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius,
    zIndex: 1
  },
  publishBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  publishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  publishTextDisabled: {
    color: '#fff',
    opacity: 0.7
  },
  originalAnswerContext: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe'
  },
  originalAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  originalAnswerLabel: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '600'
  },
  originalAnswerAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  originalAnswerAuthorName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  originalAnswerContent: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    lineHeight: scaleFont(20)
  },
  contentArea: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  textInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(26),
    minHeight: 300
  },
  identitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
    backgroundColor: modalTokens.surface
  },
  toolsLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toolItem: {
    padding: 10
  },
  wordCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted
  },
  // 图片相关样式
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6'
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadingText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600'
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  imageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  imageBadgeText: {
    color: '#fff',
    fontSize: scaleFont(11),
    fontWeight: '600'
  }
});
