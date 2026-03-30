/**
 * TranslateButton Component
 * 可复用的翻译按钮组件，类似 Instagram 的翻译功能
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { translateTextWithCache, detectLanguage, getCurrentLanguage } from '../services/translationService';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';
const TranslateButton = ({
  text,
  onTranslated,
  style,
  compact = false // 紧凑模式（只显示图标）
}) => {
  const {
    t
  } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState(null);

  // 检查是否需要显示翻译按钮
  const shouldShowTranslate = () => {
    if (!text || text.trim() === '') return false;
    const textLang = detectLanguage(text);
    const systemLang = getCurrentLanguage();

    // 如果文本语言和系统语言不同，显示翻译按钮
    return textLang !== systemLang;
  };

  // 处理翻译
  const handleTranslate = async () => {
    if (isTranslated) {
      // 如果已翻译，点击后显示原文
      setIsTranslated(false);
      if (onTranslated) {
        onTranslated(null, false);
      }
      return;
    }
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translateTextWithCache(text);
      if (result.success) {
        setTranslatedText(result.translatedText);
        setIsTranslated(true);
        if (onTranslated) {
          onTranslated(result.translatedText, true);
        }
      } else {
        setError(result.error || t('common.translateError'));
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(t('common.translateError'));
    } finally {
      setIsTranslating(false);
    }
  };

  // 如果不需要显示翻译按钮，返回null
  if (!shouldShowTranslate()) {
    return null;
  }
  return <View style={[styles.container, style]}>
      <TouchableOpacity style={[styles.button, compact && styles.buttonCompact, isTranslated && styles.buttonTranslated]} onPress={handleTranslate} disabled={isTranslating}>
        {isTranslating ? <>
            <ActivityIndicator size="small" color="#3b82f6" style={styles.icon} />
            {!compact && <Text style={styles.buttonText}>{t('common.translating')}</Text>}
          </> : <>
            <Ionicons name={isTranslated ? "language" : "language-outline"} size={compact ? 14 : 16} color={isTranslated ? "#3b82f6" : "#6b7280"} style={styles.icon} />
            {!compact && <Text style={[styles.buttonText, isTranslated && styles.buttonTextTranslated]}>
                {isTranslated ? t('common.showOriginal') : t('common.translate')}
              </Text>}
          </>}
      </TouchableOpacity>
      
      {Boolean(error && !compact) && <Text style={styles.errorText}>{error}</Text>}
    </View>;
};
const styles = StyleSheet.create({
  container: {
    marginTop: 4
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start'
  },
  buttonCompact: {
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  buttonTranslated: {
    // 翻译后的样式
  },
  icon: {
    marginRight: 4
  },
  buttonText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  buttonTextTranslated: {
    color: '#3b82f6'
  },
  errorText: {
    fontSize: scaleFont(11),
    color: '#ef4444',
    marginTop: 2
  }
});
export default TranslateButton;