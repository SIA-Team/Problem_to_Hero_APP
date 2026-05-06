import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import superLikeCreditService from '../services/SuperLikeCreditService';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';

import { scaleFont } from '../utils/responsive';
export default function SuperLikePurchaseScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [balance, setBalance] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [loading, setLoading] = useState(false);

  // 加载当前余额
  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const currentBalance = await superLikeCreditService.getBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  // 获取当前选择的购买数量
  const getCurrentAmount = () => {
    return selectedAmount || parseInt(customAmount) || 0;
  };

  // 计算总价格
  const calculateTotalPrice = () => {
    const amount = getCurrentAmount();
    return superLikeCreditService.calculatePrice(amount);
  };
  const formatPointsCost = amount => formatRewardPointsValue(amount, { locale: i18n?.locale });

  // 处理购买
  const handlePurchase = async () => {
      const amount = getCurrentAmount();

      if (!amount || amount <= 0) {
        showAppAlert(t('superLike.purchase.alertTitle'), t('superLike.purchase.alertInvalidAmount'));
        return;
      }

      if (amount < 1 || amount > 100) {
        showAppAlert(t('superLike.purchase.alertTitle'), t('superLike.purchase.alertInvalidRange'));
        return;
      }

      setLoading(true);

      try {
        const result = await superLikeCreditService.purchase(amount);

        if (result.success) {
          const totalCost = calculateTotalPrice();

          // 更新余额显示
          setBalance(result.newBalance);

          // 显示成功提示
          showAppAlert(
            t('superLike.purchase.successTitle'),
            t('superLike.purchase.successMessage')
              .replace('{amount}', amount)
              .replace('{cost}', formatPointsCost(totalCost)),
            [
              {
                text: t('common.confirm'),
                onPress: () => {
                  // 重置选择
                  setSelectedAmount(null);
                  setCustomAmount('');
                }
              }
            ]
          );
        } else {
          showAppAlert(t('superLike.purchase.alertTitle'), result.error || t('superLike.purchase.alertPurchaseFailed'));
        }
      } catch (error) {
        console.error('Purchase error:', error);
        showAppAlert(t('superLike.purchase.alertTitle'), t('superLike.purchase.alertPurchaseFailed'));
      } finally {
        setLoading(false);
      }
    };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="star" size={20} color="#f59e0b" />
          <Text style={styles.headerTitle}>{t('superLike.purchase.title')}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        showsVerticalScrollIndicator={false}
      >
        {/* 当前余额信息 */}
        <View style={styles.currentInfo}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('superLike.purchase.currentBalance')}</Text>
              <View style={styles.countBadge}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.countText}>{balance} {t('superLike.credits')}</Text>
              </View>
            </View>
            <Text style={styles.infoDesc}>
              {t('superLike.purchase.infoDescription')}
            </Text>
          </View>
        </View>

        {/* 快速选择数量 */}
        <Text style={styles.sectionTitle}>{t('superLike.purchase.selectAmount')}</Text>
        <View style={styles.quickGrid}>
          {[5, 10, 20, 50, 100].map(amount => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickBtn,
                selectedAmount === amount && styles.quickBtnActive
              ]}
              onPress={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
            >
              <Ionicons name="star" size={18} color={selectedAmount === amount ? "#fff" : "#f59e0b"} />
              <Text style={[
                styles.quickText,
                selectedAmount === amount && styles.quickTextActive
              ]}>x{amount}</Text>
              <Text style={[
                styles.quickPrice,
                selectedAmount === amount && styles.quickPriceActive
              ]}>{formatPointsCost(superLikeCreditService.calculatePrice(amount))}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 自定义数量 */}
        <Text style={styles.sectionTitle}>{t('superLike.purchase.customAmount')}</Text>
        <View style={styles.customInput}>
          <Ionicons name="star-outline" size={20} color="#f59e0b" />
          <TextInput
            style={styles.customField}
            placeholder={t('superLike.purchase.minAmount')}
            placeholderTextColor="#9ca3af"
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              setSelectedAmount(null);
            }}
            keyboardType="numeric"
          />
          <Text style={styles.priceHint}>
            {formatPointsCost(calculateTotalPrice())}
          </Text>
        </View>

        {/* 价格说明 */}
        <View style={styles.priceInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('superLike.purchase.unitPrice')}</Text>
            <Text style={styles.priceValue}>{t('superLike.purchase.pricePerCredit')}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('superLike.purchase.quantity')}</Text>
            <Text style={styles.priceValue}>
              {getCurrentAmount()} {t('superLike.credits')}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.priceTotal]}>
            <Text style={styles.priceTotalLabel}>{t('superLike.purchase.total')}</Text>
            <Text style={styles.priceTotalValue}>
              {formatPointsCost(calculateTotalPrice())}
            </Text>
          </View>
        </View>

        {/* 提示信息 */}
        <View style={styles.tips}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.tipsText}>
            {t('superLike.purchase.tipsText')}
          </Text>
        </View>

        {/* 确认按钮 */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedAmount && !customAmount) && styles.confirmBtnDisabled
          ]}
          onPress={handlePurchase}
          disabled={!selectedAmount && !customAmount || loading}
        >
          <Ionicons name="star" size={18} color="#fff" />
          <Text style={styles.confirmBtnText}>
            {loading ? t('superLike.purchase.processing') : t('superLike.purchase.confirmButton').replace('{amount}', getCurrentAmount())}
          </Text>
        </TouchableOpacity>

        {/* 取消按钮 */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>{t('superLike.purchase.cancelButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  closeBtn: { 
    padding: 8, 
    minWidth: 44, 
    minHeight: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerCenter: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  },
  headerTitle: { 
    fontSize: scaleFont(18), 
    fontWeight: '600', 
    color: '#1f2937' 
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  currentInfo: { marginBottom: 24 },
  infoCard: { 
    backgroundColor: '#fffbeb', 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#fef3c7' 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  infoLabel: { fontSize: scaleFont(14), color: '#92400e', fontWeight: '500' },
  countBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fef3c7', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    gap: 4 
  },
  countText: { fontSize: scaleFont(16), fontWeight: 'bold', color: '#f59e0b' },
  infoDesc: { fontSize: scaleFont(12), color: '#92400e', lineHeight: scaleFont(18) },
  sectionTitle: { 
    fontSize: scaleFont(15), 
    fontWeight: '600', 
    color: '#1f2937', 
    marginBottom: 12 
  },
  quickGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 24 
  },
  quickBtn: { 
    width: '30%', 
    paddingVertical: 12, 
    borderRadius: 12, 
    backgroundColor: '#fffbeb', 
    borderWidth: 2, 
    borderColor: '#fef3c7', 
    alignItems: 'center', 
    gap: 4 
  },
  quickBtnActive: { 
    backgroundColor: '#f59e0b', 
    borderColor: '#f59e0b' 
  },
  quickText: { 
    fontSize: scaleFont(15), 
    fontWeight: '600', 
    color: '#f59e0b' 
  },
  quickTextActive: { color: '#fff' },
  quickPrice: { 
    fontSize: scaleFont(12), 
    color: '#92400e' 
  },
  quickPriceActive: { color: '#fff', opacity: 0.9 },
  customInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    marginBottom: 16, 
    gap: 8 
  },
  customField: { 
    flex: 1, 
    fontSize: scaleFont(16), 
    color: '#1f2937', 
    paddingVertical: 14 
  },
  priceHint: { 
    fontSize: scaleFont(16), 
    fontWeight: '600', 
    color: '#f59e0b' 
  },
  priceInfo: { 
    backgroundColor: '#f9fafb', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16 
  },
  priceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  priceLabel: { fontSize: scaleFont(14), color: '#6b7280' },
  priceValue: { fontSize: scaleFont(14), color: '#1f2937', fontWeight: '500' },
  priceTotal: { 
    borderTopWidth: 1, 
    borderTopColor: '#e5e7eb', 
    paddingTop: 12, 
    marginTop: 4, 
    marginBottom: 0 
  },
  priceTotalLabel: { fontSize: scaleFont(15), color: '#1f2937', fontWeight: '600' },
  priceTotalValue: { 
    fontSize: scaleFont(18), 
    color: '#f59e0b', 
    fontWeight: 'bold' 
  },
  tips: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    padding: 12, 
    borderRadius: 8, 
    gap: 8, 
    marginBottom: 24 
  },
  tipsText: { 
    flex: 1, 
    fontSize: scaleFont(13), 
    color: '#6b7280', 
    lineHeight: scaleFont(18) 
  },
  confirmBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f59e0b', 
    paddingVertical: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    gap: 8 
  },
  confirmBtnDisabled: { 
    backgroundColor: '#fcd34d', 
    opacity: 0.5 
  },
  confirmBtnText: { 
    fontSize: scaleFont(16), 
    fontWeight: '600', 
    color: '#fff' 
  },
  cancelBtn: { 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    fontSize: scaleFont(16), 
    fontWeight: '500', 
    color: '#6b7280' 
  },
});
