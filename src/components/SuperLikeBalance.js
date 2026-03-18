import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import superLikeCreditService from '../services/SuperLikeCreditService';
import { useTranslation } from '../i18n/withTranslation';
export default function SuperLikeBalance({
  size = 'medium',
  showLabel = true,
  onPress,
  style
}) {
  const {
    t
  } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadBalance();

    // 监听余额变化
    const interval = setInterval(loadBalance, 2000);
    return () => clearInterval(interval);
  }, []);
  const loadBalance = async () => {
    try {
      const currentBalance = await superLikeCreditService.getBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setLoading(false);
    }
  };
  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      icon: 14,
      text: styles.textSmall,
      label: styles.labelSmall
    },
    medium: {
      container: styles.containerMedium,
      icon: 16,
      text: styles.textMedium,
      label: styles.labelMedium
    },
    large: {
      container: styles.containerLarge,
      icon: 20,
      text: styles.textLarge,
      label: styles.labelLarge
    }
  };
  const currentSize = sizeStyles[size];
  const Container = onPress ? TouchableOpacity : View;
  return <Container style={[styles.container, currentSize.container, style]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      {Boolean(showLabel) && <Text style={[styles.label, currentSize.label]}>{t('components.superLikeBalance.label')}</Text>}
      <View style={styles.balanceRow}>
        <Ionicons name="star" size={currentSize.icon} color="#f59e0b" />
        <Text style={[styles.balanceText, currentSize.text]}>
          {loading ? '--' : balance}
        </Text>
        <Text style={[styles.unit, currentSize.label]}>{t('components.superLikeBalance.unit')}</Text>
        {Boolean(onPress) && <Ionicons name="chevron-forward" size={currentSize.icon} color="#9ca3af" />}
      </View>
    </Container>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  containerLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  label: {
    color: '#92400e',
    fontWeight: '500',
    marginBottom: 4
  },
  labelSmall: {
    fontSize: 11
  },
  labelMedium: {
    fontSize: 12
  },
  labelLarge: {
    fontSize: 14
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  balanceText: {
    color: '#f59e0b',
    fontWeight: 'bold'
  },
  textSmall: {
    fontSize: 14
  },
  textMedium: {
    fontSize: 16
  },
  textLarge: {
    fontSize: 20
  },
  unit: {
    color: '#92400e'
  }
});