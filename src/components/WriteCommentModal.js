import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import KeyboardDismissView from './KeyboardDismissView';
import ModalSafeAreaView from './ModalSafeAreaView';
import useBottomSafeInset from '../hooks/useBottomSafeInset';

import { scaleFont } from '../utils/responsive';
const WriteCommentModal = ({
  visible,
  onClose,
  onPublish,
  originalComment = null,
  publishInFooter = false,
  closeOnRight = false,
  placeholder = '写下你的评论...',
  title = '写评论'
}) => {
  const bottomSafeInset = useBottomSafeInset();
  const insets = useSafeAreaInsets();
  const {
    height: windowHeight
  } = useWindowDimensions();
  const [text, setText] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('personal');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const canPublish = text.trim() || selectedImages.length > 0;
  const sheetMaxHeight = Math.min(windowHeight - Math.max(insets.top, 12), windowHeight * 0.9);

  const handlePublish = () => {
    if (!canPublish) {
      return;
    }
    onPublish(text.trim(), selectedIdentity === 'team', selectedImages);
    setText('');
    setSelectedIdentity('personal');
    setSelectedImages([]);
  };

  const handleImageSelected = imageUri => {
    if (selectedImages.length < 9) {
      setSelectedImages(prev => [...prev, imageUri]);
    }
    setShowImagePicker(false);
  };

  const removeImage = index => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const renderHeaderSide = side => {
    if (side === 'left') {
      if (closeOnRight) {
        return <View style={styles.headerSidePlaceholder} />;
      }
      return (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
      );
    }

    if (closeOnRight) {
      return (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
      );
    }

    if (publishInFooter) {
      return <View style={styles.headerSidePlaceholder} />;
    }

    return (
      <TouchableOpacity
        onPress={handlePublish}
        style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
        disabled={!canPublish}
      >
        <Text style={[styles.publishBtnText, !canPublish && styles.publishBtnTextDisabled]}>
          发布
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardDismissView>
        <ModalSafeAreaView style={[styles.container, {
          maxHeight: sheetMaxHeight
        }]} edges={['top']}>
          <View style={styles.header}>
            {renderHeaderSide('left')}
            <Text style={styles.title}>{title}</Text>
            {renderHeaderSide('right')}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, {
              paddingBottom: 24
            }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {originalComment ? (
              <View style={styles.originalCommentCard}>
                <View style={styles.originalCommentHeader}>
                  <Avatar
                    uri={originalComment.userAvatar || originalComment.avatar}
                    name={originalComment.userName || originalComment.userNickname || originalComment.author}
                    size={32}
                  />
                  <Text style={styles.originalCommentAuthor}>
                    {originalComment.userName || originalComment.userNickname || originalComment.author}
                  </Text>
                  <View style={styles.flexSpacer} />
                  <Text style={styles.originalCommentTime}>{originalComment.time}</Text>
                </View>
                {originalComment.content ? (
                  <Text style={styles.originalCommentText}>{originalComment.content}</Text>
                ) : null}
              </View>
            ) : null}

            <TextInput
              style={styles.textInput}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              maxLength={500}
              textAlignVertical="top"
            />

            {selectedImages.length > 0 ? (
              <View style={styles.imageGrid}>
                {selectedImages.map((imageUri, index) => (
                  <View key={`${imageUri}-${index}`} style={styles.imageItem}>
                    <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                    <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <IdentitySelector
              selectedIdentity={selectedIdentity}
              onIdentityChange={setSelectedIdentity}
            />
          </ScrollView>

          <View
            style={[
              styles.bottomToolbar,
              {
                paddingBottom: bottomSafeInset + 8
              }
            ]}
          >
            <View style={styles.toolbarLeft}>
              <TouchableOpacity style={styles.toolbarBtn} onPress={() => setShowImagePicker(true)}>
                <Ionicons name="image-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarBtn}>
                <Ionicons name="at" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarBtn}>
                <Ionicons name="happy-outline" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {publishInFooter ? (
              <TouchableOpacity
                onPress={handlePublish}
                style={[styles.footerPublishBtn, !canPublish && styles.publishBtnDisabled]}
                disabled={!canPublish}
              >
                <Text style={[styles.publishBtnText, !canPublish && styles.publishBtnTextDisabled]}>
                  发布
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.charCount}>{text.length}/500</Text>
            )}
          </View>
        </ModalSafeAreaView>
        </KeyboardDismissView>
      </KeyboardAvoidingView>

      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageSelected}
        title="添加图片"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.25)'
  },
  backdrop: {
    flex: 1
  },
  container: {
    width: '100%',
    minHeight: '60%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerSidePlaceholder: {
    width: 40
  },
  closeBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937'
  },
  publishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  footerPublishBtn: {
    backgroundColor: '#ef4444',
    minWidth: 84,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  publishBtnDisabled: {
    backgroundColor: '#fca5a5'
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: scaleFont(14),
    fontWeight: '600'
  },
  publishBtnTextDisabled: {
    color: '#ffffff'
  },
  content: {
    flex: 1,
    padding: 16
  },
  contentContainer: {
    paddingBottom: 16
  },
  originalCommentCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  flexSpacer: {
    flex: 1
  },
  originalCommentAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  originalCommentTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  originalCommentText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    color: '#374151'
  },
  textInput: {
    minHeight: 120,
    fontSize: scaleFont(16),
    color: '#1f2937',
    marginBottom: 16
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  toolbarBtn: {
    padding: 4
  },
  charCount: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden'
  },
  uploadedImage: {
    width: '100%',
    height: '100%'
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10
  }
});

export default WriteCommentModal;
