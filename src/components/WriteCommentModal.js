import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';

const WriteCommentModal = ({ 
  visible, 
  onClose, 
  onPublish, 
  placeholder = "写下你的评论...", 
  title = "写评论" 
}) => {
  const [text, setText] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('personal');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handlePublish = () => {
    if (text.trim() || selectedImages.length > 0) {
      onPublish(text.trim(), selectedIdentity === 'team', selectedImages);
      setText('');
      setSelectedIdentity('personal');
      setSelectedImages([]);
    }
  };

  const handleImageSelected = (imageUri) => {
    if (selectedImages.length < 9) {
      setSelectedImages([...selectedImages, imageUri]);
    } else {
      // 这里可以添加提示最多9张图片的逻辑
    }
    setShowImagePicker(false);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity 
            onPress={handlePublish}
            style={[styles.publishBtn, (!text.trim() && selectedImages.length === 0) && styles.publishBtnDisabled]}
            disabled={!text.trim() && selectedImages.length === 0}
          >
            <Text style={[styles.publishBtnText, (!text.trim() && selectedImages.length === 0) && styles.publishBtnTextDisabled]}>
              发布
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={500}
          />
          
          {/* 图片预览区域 */}
          {selectedImages.length > 0 && (
            <View style={styles.imageGrid}>
              {selectedImages.map((imageUri, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <IdentitySelector
            selectedIdentity={selectedIdentity}
            onIdentityChange={setSelectedIdentity}
          />
        </ScrollView>
        
        <View style={styles.bottomToolbar}>
          <View style={styles.toolbarLeft}>
            <TouchableOpacity 
              style={styles.toolbarBtn}
              onPress={() => setShowImagePicker(true)}
            >
              <Ionicons name="image-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn}>
              <Ionicons name="at" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn}>
              <Ionicons name="happy-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.charCount}>{text.length}/500</Text>
        </View>
      </SafeAreaView>
      
      {/* 图片选择器 */}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  publishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: '#fca5a5',
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  publishBtnTextDisabled: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    minHeight: 120,
    fontSize: 16,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toolbarBtn: {
    padding: 4,
  },
  charCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
});

export default WriteCommentModal;