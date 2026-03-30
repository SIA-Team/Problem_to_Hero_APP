import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import superLikeCreditService from '../services/SuperLikeCreditService';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';

import { scaleFont } from '../utils/responsive';
export default function UseSuperLikeButton({ 
  answerId, 
  answerTitle, 
  currentSuperLikes = 0,
  onSuccess,
  navigation,
  style 
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [superLikes, setSuperLikes] = useState(currentSuperLikes);

  const handlePress = async () => {
    // 检查余额
    const balance = await superLikeCreditService.getBalance();
    
    if (balance <= 0) {
      // 余额不足，显示购买提示
      showAppAlert(
        t('components.useSuperLikeButton.insufficientBalance.title'),
        t('components.useSuperLikeButton.insufficientBalance.message'),
        [
          { text: t('components.useSuperLikeButton.insufficientBalance.cancel'), style: 'cancel' },
          { 
            text: t('components.useSuperLikeButton.insufficientBalance.purchase'), 
            onPress: () => {
              if (navigation) {
                navigation.navigate('SuperLikePurchase');
              }
            }
          }
        ]
      );
      return;
    }

    // 显示确认对话框
    showAppAlert(
      t('components.useSuperLikeButton.confirm.title'),
      t('components.useSuperLikeButton.confirm.message'),
      [
        { text: t('components.useSuperLikeButton.confirm.cancel'), style: 'cancel' },
        { 
          text: t('components.useSuperLikeButton.confirm.confirm'), 
          onPress: () => performUse()
        }
      ]
    );
  };

  const performUse = async () => {
    setLoading(true);
    
    try {
      const result = await superLikeCreditService.use(answerId, answerTitle);
      
      if (result.success) {
        // 更新本地显示的超级赞数量
        setSuperLikes(prev => prev + 1);
        
        // 显示成功提示
        showAppAlert(
          t('components.useSuperLikeButton.success.title'),
          t('components.useSuperLikeButton.success.message').replace('{balance}', result.newBalance),
          [{ text: t('components.useSuperLikeButton.success.ok') }]
        );
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        showAppAlert(
          t('components.useSuperLikeButton.error.title'), 
          result.error || t('components.useSuperLikeButton.error.message')
        );
      }
    } catch (error) {
      console.error('Use super like error:', error);
      showAppAlert(
        t('components.useSuperLikeButton.error.title'), 
        t('components.useSuperLikeButton.error.message')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={loading ? "hourglass-outline" : "star"} 
        size={16} 
        color="#fff" 
      />
      <Text style={styles.buttonText}>
        {loading 
          ? t('components.useSuperLikeButton.processing') 
          : t('components.useSuperLikeButton.button').replace('{count}', superLikes)
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});
