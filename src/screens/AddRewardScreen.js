import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import userApi from '../services/api/userApi';
import { openOfficialRechargePage } from '../utils/externalLinks';
import { applyMockRecharge, applyMockWalletExpense, getWalletBalanceWithMock } from '../utils/walletMock';
import { REWARD_MIN_AMOUNT } from '../constants/reward';
import {
  formatAmount,
  parseRewardAmountToCents,
  sanitizeAmountInput,
} from '../utils/rewardAmount';

import { scaleFont } from '../utils/responsive';

const MOCK_RECHARGE_RETURN_AMOUNT = 100;

export default function AddRewardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    currentReward = 50,
    rewardContributors = 3,
    userId: routeUserId = '',
    username: routeUsername = '',
    sourceRouteKey = '',
  } = route?.params || {};
  
  const [addRewardAmount, setAddRewardAmount] = useState('');
  const [selectedAddRewardAmount, setSelectedAddRewardAmount] = useState(null);
  const [walletData, setWalletData] = useState({
    balance: 0,
    currency: 'usd',
  });
  const [userProfile, setUserProfile] = useState({
    userId: routeUserId,
    username: routeUsername,
  });
  const pendingRechargeSimulationRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const handleRechargeReturnRef = useRef(async () => {});

  const getCurrencySymbol = useCallback(currency => {
    switch (String(currency || 'usd').toLowerCase()) {
      case 'usd':
        return '$';
      case 'cny':
      case 'rmb':
        return '¥';
      case 'eur':
        return '€';
      case 'gbp':
        return '£';
      default:
        return '$';
    }
  }, []);

  const formatMoney = useCallback((amount, currency = walletData.currency) => {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

    return `${getCurrencySymbol(currency)}${safeAmount.toFixed(2)}`;
  }, [getCurrencySymbol, walletData.currency]);

  const loadWalletBalance = useCallback(async () => {
    const fallbackWalletBalance = await getWalletBalanceWithMock(0);

    setWalletData(prev => ({
      balance: fallbackWalletBalance.balance,
      currency: prev?.currency || 'usd',
    }));

    try {
      const response = await userApi.getWalletBalance();
      if (response.code === 0 || response.code === 200) {
        const nextCurrency = response?.data?.currency || 'usd';
        const walletBalance = await getWalletBalanceWithMock(response?.data?.balance);

        setWalletData({
          balance: walletBalance.balance,
          currency: nextCurrency,
        });
      }
    } catch (error) {
      console.error('Failed to load wallet balance in AddRewardScreen:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (routeUserId && routeUsername) {
      return;
    }

    try {
      const response = await userApi.getProfile();
      const profileData = response?.data || {};

      setUserProfile(prev => ({
        userId: profileData.userId || prev.userId || routeUserId,
        username: profileData.username || prev.username || routeUsername,
      }));
    } catch (error) {
      console.error('Failed to load user profile in AddRewardScreen:', error);
    }
  }, [routeUserId, routeUsername]);

  const handleMockRecharge = useCallback(async amount => {
    const numericAmount = Number(amount);

    await applyMockRecharge({
      amount: numericAmount,
      currency: walletData.currency,
    });

    setWalletData(prev => ({
      ...prev,
      balance: (Number(prev.balance) || 0) + (Number.isFinite(numericAmount) ? numericAmount : 0),
    }));

    await loadWalletBalance();
    showAppAlert(
      t('profile.rechargeSuccess'),
      `${t('profile.rechargeSuccess')} ${formatMoney(numericAmount, walletData.currency)} (${t('profile.mockRechargeTag')})`
    );
  }, [formatMoney, loadWalletBalance, t, walletData.currency]);

  useEffect(() => {
    handleRechargeReturnRef.current = async () => {
      await handleMockRecharge(MOCK_RECHARGE_RETURN_AMOUNT);
    };
  }, [handleMockRecharge]);

  useEffect(() => {
    loadWalletBalance();
    loadUserProfile();
  }, [loadUserProfile, loadWalletBalance]);

  useFocusEffect(useCallback(() => {
    loadWalletBalance();
  }, [loadWalletBalance]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const isReturningToForeground =
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active';

      if (isReturningToForeground && pendingRechargeSimulationRef.current) {
        pendingRechargeSimulationRef.current = false;
        handleRechargeReturnRef.current().catch(error => {
          console.error('Failed to simulate recharge after returning to AddRewardScreen:', error);
        });
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRecharge = useCallback(async () => {
    const result = await openOfficialRechargePage({
      userId: routeUserId || userProfile.userId,
      username: routeUsername || userProfile.username,
    });

    if (result.ok) {
      pendingRechargeSimulationRef.current = true;
      return;
    }

    const reasonKey = `profile.${result.reason}`;
    const reasonMessage = t(reasonKey);

    showAppAlert(
      t('profile.rechargeUnavailableTitle'),
      reasonMessage === reasonKey ? t('profile.rechargeUnavailableMessage') : reasonMessage
    );
  }, [routeUserId, routeUsername, t, userProfile.userId, userProfile.username]);

  const handleAddReward = async () => {
    const amountInCents =
      selectedAddRewardAmount !== null
        ? Math.round(Number(selectedAddRewardAmount) * 100)
        : parseRewardAmountToCents(addRewardAmount);
    const amount = amountInCents === null ? null : amountInCents / 100;

    if (!amount || amount <= 0) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.invalidAmount'));
      return;
    }
    if (amount < REWARD_MIN_AMOUNT) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.minAmount'));
      return;
    }
    if (amount > 1000) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.maxAmount'));
      return;
    }

    const currentBalance = Number(walletData.balance) || 0;
    if (currentBalance < amount) {
      showAppAlert(
        t('screens.addRewardScreen.insufficientBalance.title'),
        t('screens.addRewardScreen.insufficientBalance.message')
          .replace('{balance}', formatMoney(currentBalance))
          .replace('{amount}', formatMoney(amount)),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('profile.recharge'),
            onPress: () => {
              handleRecharge().catch(error => {
                console.error('Failed to open recharge page from AddRewardScreen:', error);
              });
            },
          },
        ]
      );
      return;
    }

    try {
      await applyMockWalletExpense({
        amount,
        currency: walletData.currency,
        type: t('screens.addRewardScreen.expenseRecordType'),
      });

      setWalletData(prev => ({
        ...prev,
        balance: Math.max(0, (Number(prev.balance) || 0) - amount),
      }));

      await loadWalletBalance();
    } catch (error) {
      console.error('Failed to deduct wallet balance for add reward:', error);
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.deductionFailed'));
      return;
    }

    showAppAlert(
      t('screens.addRewardScreen.success.title'),
      t('screens.addRewardScreen.success.message').replace('${amount}', formatAmount(amount)),
      [
        {
          text: t('screens.addRewardScreen.success.confirm'),
          onPress: () => {
            const nextTotalReward = Math.round((Number(currentReward) + Number(amount)) * 100) / 100;
            const addedRewardResult = {
              totalReward: nextTotalReward,
              rewardContributors: rewardContributors + 1,
              addedAmount: amount,
            };

            if (sourceRouteKey) {
              navigation.dispatch({
                ...CommonActions.setParams({
                  addedRewardResult,
                }),
                source: sourceRouteKey,
                target: navigation.getState()?.key,
              });
            }

            navigation.goBack();
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>{t('screens.addRewardScreen.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 当前悬赏信息 */}
        <View style={styles.currentRewardInfo}>
          <View style={styles.currentRewardRow}>
            <Text style={styles.currentRewardLabel}>{t('screens.addRewardScreen.currentReward.label')}</Text>
            <Text style={styles.currentRewardAmount}>{formatAmount(currentReward)}</Text>
          </View>
          <View style={styles.currentRewardRow}>
            <Text style={styles.currentRewardDesc}>
              {t('screens.addRewardScreen.currentReward.contributors').replace('{count}', rewardContributors)}
            </Text>
          </View>
        </View>

        {/* 快速选择金额 */}
        <Text style={styles.sectionTitle}>{t('screens.addRewardScreen.selectAmount.title')}</Text>
        <View style={styles.quickAmountGrid}>
          {[10, 20, 50, 100, 200, 500].map(amount => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAmountBtn,
                selectedAddRewardAmount === amount && styles.quickAmountBtnActive
              ]}
              onPress={() => {
                setSelectedAddRewardAmount(amount);
                setAddRewardAmount('');
              }}
            >
              <Text style={[
                styles.quickAmountText,
                selectedAddRewardAmount === amount && styles.quickAmountTextActive
              ]}>{formatAmount(amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 自定义金额 */}
        <Text style={styles.sectionTitle}>{t('screens.addRewardScreen.customAmount.title')}</Text>
        <View style={styles.customAmountInput}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.customAmountField}
            placeholder={t('screens.addRewardScreen.customAmount.placeholder')}
            placeholderTextColor="#9ca3af"
            value={addRewardAmount}
            onChangeText={(text) => {
              setAddRewardAmount(sanitizeAmountInput(text));
              setSelectedAddRewardAmount(null);
            }}
            keyboardType="decimal-pad"
          />
        </View>

        {/* 提示信息 */}
        <View style={styles.tips}>
          <Ionicons name="information-circle-outline" size={16} color="#d97706" />
          <Text style={styles.tipsText}>
            {t('screens.addRewardScreen.tips.text')}
          </Text>
        </View>

        {/* 确认按钮 */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!selectedAddRewardAmount && !addRewardAmount) && styles.confirmBtnDisabled
          ]}
          onPress={() => {
            handleAddReward().catch(error => {
              console.error('Add reward submit failed:', error);
            });
          }}
          disabled={!selectedAddRewardAmount && !addRewardAmount}
        >
          <Text style={styles.confirmBtnText}>
            {t('screens.addRewardScreen.confirmButton').replace('${amount}', formatAmount(selectedAddRewardAmount ?? addRewardAmount ?? 0))}
          </Text>
        </TouchableOpacity>

        {/* 取消按钮 */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>{t('screens.addRewardScreen.cancelButton')}</Text>
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
  headerTitle: { 
    fontSize: scaleFont(18), 
    fontWeight: '600', 
    color: '#1f2937', 
    flex: 1, 
    textAlign: 'center' 
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  currentRewardInfo: { 
    backgroundColor: '#d1fae5', // 浅翠绿色背景
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#6ee7b7', // 翠绿色边框
  },
  currentRewardRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  currentRewardLabel: { fontSize: scaleFont(14), color: '#065f46' }, // 深绿色文字
  currentRewardAmount: { 
    fontSize: scaleFont(28), 
    fontWeight: 'bold', 
    color: '#10b981' // 翠绿色金额
  },
  currentRewardDesc: { fontSize: scaleFont(12), color: '#065f46' },
  sectionTitle: { 
    fontSize: scaleFont(15), 
    fontWeight: '600', 
    color: '#1f2937', 
    marginBottom: 12 
  },
  quickAmountGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 24 
  },
  quickAmountBtn: { 
    width: '30%', 
    paddingVertical: 14, 
    borderRadius: 12, 
    backgroundColor: '#f9fafb', 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    alignItems: 'center' 
  },
  quickAmountBtnActive: { 
    backgroundColor: '#d1fae5', // 浅翠绿色背景
    borderColor: '#10b981' // 翠绿色边框
  },
  quickAmountText: { 
    fontSize: scaleFont(16), 
    fontWeight: '600', 
    color: '#6b7280' 
  },
  quickAmountTextActive: { color: '#059669' }, // 深翠绿色文字
  customAmountInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    marginBottom: 16 
  },
  currencySymbol: { 
    fontSize: scaleFont(18), 
    fontWeight: '600', 
    color: '#6b7280', 
    marginRight: 8 
  },
  customAmountField: { 
    flex: 1, 
    fontSize: scaleFont(16), 
    color: '#1f2937', 
    paddingVertical: 14 
  },
  tips: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#fef3c7', // 浅黄色背景
    padding: 12, 
    borderRadius: 8, 
    gap: 8, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a', // 黄色边框
  },
  tipsText: { 
    flex: 1, 
    fontSize: scaleFont(13), 
    color: '#92400e', // 深棕色文字
    lineHeight: scaleFont(18) 
  },
  confirmBtn: { 
    backgroundColor: '#10b981', // 翠绿色按钮
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: { 
    backgroundColor: '#6ee7b7', // 浅翠绿色禁用状态
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
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
