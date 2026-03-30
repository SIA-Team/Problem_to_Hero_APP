import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import { showToast } from '../utils/toast';
import useBottomSafeInset from '../hooks/useBottomSafeInset';

import { scaleFont } from '../utils/responsive';
export default function WriteAnswerModal({
  visible,
  onClose,
  onSubmit,
  title = '写回答',
  publishText = '发布',
  questionTitle = '',
  supplementLabel = '补充问题：',
  supplementText = '',
  text = '',
  onChangeText,
  placeholder = '写下你的回答，帮助有需要的人...',
  selectedIdentity = 'personal',
  selectedTeams = [],
  onIdentityChange,
  onTeamsChange,
  images = [],
  onChangeImages,
  wordLimit = 2000,
  submitting = false,
}) {
  const bottomSafeInset = useBottomSafeInset();
  const [showImagePicker, setShowImagePicker] = useState(false);

  const canSubmit = !!text.trim() && !submitting;

  const handleAddImage = imageUri => {
    const currentImages = Array.isArray(images) ? images : [];
    if (currentImages.length >= 9) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }
    onChangeImages?.([...currentImages, imageUri]);
    setShowImagePicker(false);
  };

  const handleRemoveImage = index => {
    const currentImages = Array.isArray(images) ? images : [];
    onChangeImages?.(currentImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleOpenImagePicker = () => {
    const currentImages = Array.isArray(images) ? images : [];
    if (currentImages.length >= 9) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }
    setShowImagePicker(true);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <SafeAreaView style={styles.answerModal} edges={['top']}>
          <View style={styles.answerModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.answerCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.answerHeaderCenter}>
              <Text style={styles.answerModalTitle}>{title}</Text>
            </View>
            <TouchableOpacity
              style={[styles.answerPublishBtn, !canSubmit && styles.answerPublishBtnDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <Text style={[styles.answerPublishText, !canSubmit && styles.answerPublishTextDisabled]}>
                {publishText}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.answerQuestionCard}>
            <View style={styles.answerQuestionIcon}>
              <Ionicons name="help-circle" size={20} color="#ef4444" />
            </View>
            <View style={styles.answerQuestionContent}>
              <Text style={styles.answerQuestionText} numberOfLines={2}>
                {questionTitle || '无标题'}
              </Text>
              {Boolean(supplementText) && (
                <View style={styles.answerSupplementInfo}>
                  <Ionicons name="arrow-forward" size={14} color="#f59e0b" />
                  <Text style={styles.answerSupplementLabel}>{supplementLabel}</Text>
                  <Text style={styles.answerSupplementText} numberOfLines={2}>
                    {supplementText}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView style={styles.answerContentArea} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.answerTextInput}
              placeholder={placeholder}
              placeholderTextColor="#bbb"
              value={text}
              onChangeText={onChangeText}
              multiline
              autoFocus
              textAlignVertical="top"
            />

            {images.length > 0 && (
              <View style={styles.answerImagesPreview}>
                {images.map((imageUri, index) => (
                  <View key={`${imageUri}_${index}`} style={styles.answerImagePreviewItem}>
                    <Image source={{ uri: imageUri }} style={styles.answerImagePreview} />
                    <TouchableOpacity style={styles.answerImageRemoveBtn} onPress={() => handleRemoveImage(index)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.answerIdentitySection}>
              <IdentitySelector
                selectedIdentity={selectedIdentity}
                selectedTeams={selectedTeams}
                onIdentityChange={onIdentityChange}
                onTeamsChange={onTeamsChange}
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.answerToolbar,
              {
                paddingBottom: bottomSafeInset + 8,
              },
            ]}
          >
            <View style={styles.answerToolsLeft}>
              <TouchableOpacity style={styles.answerToolItem} onPress={handleOpenImagePicker}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="at-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="pricetag-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerWordCount}>
              {text.length}/{wordLimit}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleAddImage}
      />
    </>
  );
}

const styles = StyleSheet.create({
  answerModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  answerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  answerCloseBtn: {
    padding: 4,
    zIndex: 10,
  },
  answerHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  answerModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#222',
  },
  answerPublishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  answerPublishBtnDisabled: {
    backgroundColor: '#ffcdd2',
  },
  answerPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600',
  },
  answerPublishTextDisabled: {
    color: '#fff',
  },
  answerQuestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  answerQuestionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  answerQuestionContent: {
    flex: 1,
  },
  answerQuestionText: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#333',
    lineHeight: scaleFont(22),
    fontWeight: '500',
  },
  answerSupplementInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4,
  },
  answerSupplementLabel: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '600',
  },
  answerSupplementText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
  },
  answerContentArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  answerTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: '#333',
    lineHeight: scaleFont(26),
    minHeight: 300,
  },
  answerIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerImagesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  answerImagePreviewItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  answerImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  answerImageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  answerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  answerToolsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerToolItem: {
    padding: 10,
  },
  answerWordCount: {
    fontSize: scaleFont(13),
    color: '#999',
  },
});
