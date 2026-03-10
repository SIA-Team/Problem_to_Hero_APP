import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../utils/toast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 通用图片选择器底部弹出框
 * 支持拍照和从相册选择
 * 
 * @param {boolean} visible - 是否显示
 * @param {function} onClose - 关闭回调
 * @param {function} onImageSelected - 图片选择成功回调，参数为图片URI
 * @param {string} title - 弹窗标题，默认为"选择图片"
 */
export default function ImagePickerSheet({ visible, onClose, onImageSelected, title = '选择图片' }) {
  const insets = useSafeAreaInsets();
  const [slideAnim] = React.useState(new Animated.Value(SCREEN_HEIGHT));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  /**
   * 请求相机权限
   */
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('需要相机权限才能拍照', 'error');
        return false;
      }
      return true;
    } catch (error) {
      console.error('请求相机权限失败:', error);
      showToast('请求权限失败', 'error');
      return false;
    }
  };

  /**
   * 请求相册权限
   */
  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('需要相册权限才能选择图片', 'error');
        return false;
      }
      return true;
    } catch (error) {
      console.error('请求相册权限失败:', error);
      showToast('请求权限失败', 'error');
      return false;
    }
  };

  /**
   * 拍照
   */
  const handleTakePhoto = async () => {
    handleClose();
    
    setTimeout(async () => {
      try {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;
        
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const imageUri = result.assets[0].uri;
          onImageSelected(imageUri);
        }
      } catch (error) {
        console.error('拍照失败:', error);
        showToast('拍照失败，请重试', 'error');
      }
    }, 300);
  };

  /**
   * 从相册选择
   */
  const handleChooseFromAlbum = async () => {
    handleClose();
    
    setTimeout(async () => {
      try {
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) return;
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const imageUri = result.assets[0].uri;
          onImageSelected(imageUri);
        }
      } catch (error) {
        console.error('选择图片失败:', error);
        showToast('选择失败，请重试', 'error');
      }
    }, 300);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom || 20,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.header} pointerEvents="auto">
            <View style={styles.dragIndicator} />
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.optionsContainer} pointerEvents="auto">
            <TouchableOpacity
              style={styles.option}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <Text style={styles.optionText}>拍照</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={handleChooseFromAlbum}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="images" size={24} color="#fff" />
              </View>
              <Text style={styles.optionText}>从相册选择</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.7}
            pointerEvents="auto"
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  option: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  optionText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
