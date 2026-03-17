import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IdentitySelector from './IdentitySelector';

const CommentModal = ({ 
  visible, 
  onClose, 
  onPublish, 
  placeholder = "写下你的评论...", 
  title = "写评论" 
}) => {
  const [text, setText] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('personal');

  const handlePublish = () => {
    if (text.trim()) {
      onPublish(text.trim(), selectedIdentity === 'team');
      setText('');
      setSelectedIdentity('personal');
    }
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
            style={[styles.publishBtn, !text.trim() && styles.publishBtnDisabled]}
            disabled={!text.trim()}
          >
            <Text style={[styles.publishBtnText, !text.trim() && styles.publishBtnTextDisabled]}>
              发布
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={500}
          />
          
          <IdentitySelector
            selectedIdentity={selectedIdentity}
            onIdentityChange={setSelectedIdentity}
          />
          
          <View style={styles.bottomToolbar}>
            <View style={styles.toolbarLeft}>
              <TouchableOpacity style={styles.toolbarBtn}>
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
        </View>
      </SafeAreaView>
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
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
});

export default CommentModal;