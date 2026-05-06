import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { sanitizeUserFacingMessage } from '../utils/userFacingMessage';
import questionApi from '../services/api/questionApi';
import userApi from '../services/api/userApi';
import walletApi from '../services/api/walletApi';
import { recordQuestionLocalRewardContribution } from '../services/localRewardState';
import { openOfficialRechargePage } from '../utils/externalLinks';
import { REWARD_MIN_AMOUNT } from '../constants/reward';
import {
  centsToAmount,
  formatAmountValue,
  parseAmountNumber,
  parseRewardAmountToCents,
  sanitizeAmountInput,
} from '../utils/rewardAmount';
import {
  normalizeWalletPointsOverview,
  WALLET_POINTS_DEFAULT_CURRENCY,
} from '../utils/walletPoints';
import { formatRewardPointsValue, isChineseLocale } from '../utils/rewardPointsDisplay';

import { scaleFont } from '../utils/responsive';

const MIN_ADD_REWARD_POINTS = REWARD_MIN_AMOUNT;
const MAX_ADD_REWARD_POINTS = 1000;

const isSuccessResponse = response => {
  const code = Number(response?.code ?? response?.data?.code);
  return code === 0 || code === 200;
};

const isInsufficientBalanceMessage = message =>
  /积分.*不足|余额.*不足|not enough|insufficient/i.test(String(message || ''));

const resolveDisplayedBalanceAfter = (rawBalanceAfter, currentBalance, deductedAmount) => {
  const numericBalanceAfter = Number(rawBalanceAfter);
  if (!Number.isFinite(numericBalanceAfter)) {
    return null;
  }

  const expectedBalance = Math.max(
    0,
    Math.round((Number(currentBalance || 0) - Number(deductedAmount || 0) + Number.EPSILON) * 100) / 100
  );
  const candidates = [numericBalanceAfter, numericBalanceAfter / 100];

  return candidates.reduce((bestCandidate, candidate) => {
    if (!Number.isFinite(candidate)) {
      return bestCandidate;
    }

    if (bestCandidate === null) {
      return candidate;
    }

    const currentDistance = Math.abs(candidate - expectedBalance);
    const bestDistance = Math.abs(bestCandidate - expectedBalance);
    return currentDistance < bestDistance ? candidate : bestCandidate;
  }, null);
};

export default function AddRewardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const {
    currentReward = 50,
    rewardContributors = 3,
    questionId = '',
    questionTitle = '',
    sourceRouteKey = '',
    userId: routeUserId = '',
    username: routeUsername = '',
  } = route?.params || {};
  
  const [addRewardAmount, setAddRewardAmount] = useState('');
  const [selectedAddRewardAmount, setSelectedAddRewardAmount] = useState(null);
  const [walletData, setWalletData] = useState({
    balance: 0,
    currency: WALLET_POINTS_DEFAULT_CURRENCY,
  });
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState({
    userId: routeUserId,
    username: routeUsername,
  });

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
  const formatPoints = useCallback(
    amount => formatRewardPointsValue(amount, { locale: i18n?.locale }),
    [i18n?.locale]
  );
  const rewardInputUnitLabel = isChineseLocale(i18n?.locale) ? '积分' : 'pts';
  const rewardInputPlaceholder = isChineseLocale(i18n?.locale)
    ? `最低${formatAmountValue(MIN_ADD_REWARD_POINTS)}积分`
    : `Minimum ${formatAmountValue(MIN_ADD_REWARD_POINTS)} pts`;
  const minAmountValidationMessage = isChineseLocale(i18n?.locale)
    ? `最低追加金额为${formatPoints(MIN_ADD_REWARD_POINTS)}`
    : `Minimum amount is ${formatPoints(MIN_ADD_REWARD_POINTS)}`;
  const maxAmountValidationMessage = isChineseLocale(i18n?.locale)
    ? `单次追加最高为${formatPoints(MAX_ADD_REWARD_POINTS)}`
    : `Maximum amount per addition is ${formatPoints(MAX_ADD_REWARD_POINTS)}`;

  const loadWalletBalance = useCallback(async () => {
    try {
      const response = await walletApi.getPointsOverview();
      if (isSuccessResponse(response)) {
        const overview = normalizeWalletPointsOverview(response?.data);
        setWalletData({
          balance: overview.balance,
          currency: overview.currency || WALLET_POINTS_DEFAULT_CURRENCY,
        });
        return overview;
      }
    } catch (error) {
      console.error('Failed to load wallet balance in AddRewardScreen:', error);
    }

    return null;
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

  useEffect(() => {
    loadWalletBalance();
    loadUserProfile();
  }, [loadUserProfile, loadWalletBalance]);

  useFocusEffect(useCallback(() => {
    loadWalletBalance();
  }, [loadWalletBalance]));

  const handleRecharge = useCallback(async () => {
    const result = await openOfficialRechargePage({
      userId: routeUserId || userProfile.userId,
      username: routeUsername || userProfile.username,
      entryPoint: 'add_reward_insufficient_balance',
    });

    if (result.ok) {
      return;
    }

    const reasonKey = `profile.${result.reason}`;
    const reasonMessage = t(reasonKey);

    showAppAlert(
      t('profile.rechargeUnavailableTitle'),
      reasonMessage === reasonKey ? t('profile.rechargeUnavailableMessage') : reasonMessage
    );
  }, [routeUserId, routeUsername, t, userProfile.userId, userProfile.username]);

  const promptInsufficientBalance = useCallback((balanceAmount, requiredAmount) => {
    showAppAlert(
      t('screens.addRewardScreen.insufficientBalance.title'),
      t('screens.addRewardScreen.insufficientBalance.message')
        .replace('{balance}', formatPoints(balanceAmount))
        .replace('{amount}', formatPoints(requiredAmount)),
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
  }, [formatPoints, handleRecharge, t]);

  const syncRewardResultToSource = useCallback(addedRewardResult => {
    if (!sourceRouteKey) {
      return;
    }

    navigation.dispatch({
      ...CommonActions.setParams({
        addedRewardResult,
      }),
      source: sourceRouteKey,
    });
  }, [navigation, sourceRouteKey]);

  const handleAddReward = async () => {
    if (submitting) {
      return;
    }

    const customAmount = parseAmountNumber(addRewardAmount);
    const amount =
      selectedAddRewardAmount !== null
        ? Number(selectedAddRewardAmount)
        : customAmount;
    const amountInCents =
      selectedAddRewardAmount !== null
        ? Math.round(Number(selectedAddRewardAmount) * 100)
        : parseRewardAmountToCents(addRewardAmount);

    if (!amount || amount <= 0) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.invalidAmount'));
      return;
    }
    if (amount < MIN_ADD_REWARD_POINTS) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), minAmountValidationMessage);
      return;
    }
    if (amount > MAX_ADD_REWARD_POINTS) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), maxAmountValidationMessage);
      return;
    }
    if (!amountInCents || amountInCents <= 0) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.invalidAmount'));
      return;
    }

    const currentBalance = Number(walletData.balance) || 0;
    if (currentBalance < amount) {
      promptInsufficientBalance(currentBalance, amount);
      return;
    }

    try {
      setSubmitting(true);

      const normalizedQuestionId = String(questionId ?? '').trim();
      if (!normalizedQuestionId) {
        throw new Error(t('screens.addRewardScreen.validation.invalidAmount'));
      }

      const submitResponse = await questionApi.submitReward(normalizedQuestionId, {
        points: amountInCents,
      });
      const submitMessage = sanitizeUserFacingMessage(
        submitResponse,
        t('screens.addRewardScreen.deductionFailed')
      );

      if (!isSuccessResponse(submitResponse)) {
        if (isInsufficientBalanceMessage(submitMessage)) {
          const latestOverview = await loadWalletBalance();
          promptInsufficientBalance(latestOverview?.balance ?? currentBalance, amount);
          return;
        }

        throw new Error(submitMessage);
      }

      const submitData = submitResponse?.data || {};
      const debitedPoints = Number(submitData?.debitedPoints);
      const equivalentAmountFen = Number(submitData?.equivalentAmountFen);
      const debitedAmount = Number.isFinite(debitedPoints) && debitedPoints > 0
        ? centsToAmount(debitedPoints)
        : amount;
      const rewardAddedAmount = Number.isFinite(equivalentAmountFen) && equivalentAmountFen > 0
        ? centsToAmount(equivalentAmountFen)
        : debitedAmount;
      const nextBalance = resolveDisplayedBalanceAfter(
        submitData?.balanceAfter,
        currentBalance,
        debitedAmount
      );

      if (Number.isFinite(nextBalance) && nextBalance !== null) {
        setWalletData(prev => ({
          ...prev,
          balance: nextBalance,
        }));
      }

      const returnedQuestionId = submitData?.questionId ?? normalizedQuestionId;
      const normalizedAddedAmount =
        Math.round((rewardAddedAmount + Number.EPSILON) * 100) / 100;
      const localRewardState = await recordQuestionLocalRewardContribution(returnedQuestionId, {
        amount: normalizedAddedAmount,
        contributor: {
          id: submitData?.pointsTxnNo || `reward-${Date.now()}`,
          userId: routeUserId || userProfile.userId || null,
          name: routeUsername || userProfile.username || 'Me',
          avatar: null,
          amount: normalizedAddedAmount,
          time: t('home.justNow'),
        },
      });
      const addedRewardResult = {
        questionId: returnedQuestionId,
        addedAmount: normalizedAddedAmount,
        debitedPoints: Number.isFinite(debitedPoints) ? debitedPoints : amountInCents,
        balanceAfter: submitData?.balanceAfter ?? null,
        balanceAfterDisplay: nextBalance,
        pointsTxnNo: submitData?.pointsTxnNo || null,
        equivalentAmountFen: Number.isFinite(equivalentAmountFen)
          ? equivalentAmountFen
          : Math.round(normalizedAddedAmount * 100),
        totalReward: Math.round((currentReward + normalizedAddedAmount) * 100) / 100,
        rewardContributors: Math.max(Number(rewardContributors) || 0, 0) + Number(localRewardState.contributorCountDelta || 0),
        contributorUserId: routeUserId || userProfile.userId || null,
        contributor: localRewardState.contributors[0] || null,
        localRewardState,
      };

      syncRewardResultToSource(addedRewardResult);
      loadWalletBalance();

      showAppAlert(
        t('screens.addRewardScreen.success.title'),
        t('screens.addRewardScreen.success.message').replace(
          '${amount}',
          formatPoints(debitedAmount)
        ),
        [
          {
            text: t('screens.addRewardScreen.success.confirm'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Add reward submit failed:', error);
      const errorMessage = sanitizeUserFacingMessage(
        error,
        t('screens.addRewardScreen.deductionFailed')
      );

      if (isInsufficientBalanceMessage(errorMessage)) {
        const latestOverview = await loadWalletBalance();
        promptInsufficientBalance(latestOverview?.balance ?? currentBalance, amount);
        return;
      }

      showAppAlert(
        t('screens.addRewardScreen.validation.hint'),
        errorMessage
      );
    } finally {
      setSubmitting(false);
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
            <Text style={styles.currentRewardAmount}>{formatPoints(currentReward)}</Text>
          </View>
          <View style={styles.currentRewardRow}>
            <Text style={styles.currentRewardDesc}>
              {t('screens.addRewardScreen.currentReward.contributors').replace('{count}', rewardContributors)}
            </Text>
          </View>
        </View>

        <View style={styles.walletSummaryCard}>
          <Text style={styles.walletSummaryLabel}>{t('screens.addRewardScreen.paymentBalanceLabel')}</Text>
          <Text style={styles.walletSummaryValue}>{formatPoints(walletData.balance)}</Text>
        </View>
        <Text style={styles.walletSummaryHint}>{t('screens.addRewardScreen.paymentHint')}</Text>

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
              ]}>{formatPoints(amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 自定义金额 */}
        <Text style={styles.sectionTitle}>{t('screens.addRewardScreen.customAmount.title')}</Text>
        <View style={styles.customAmountInput}>
          <Text style={styles.currencySymbol}>{rewardInputUnitLabel}</Text>
          <TextInput
            style={styles.customAmountField}
            placeholder={rewardInputPlaceholder}
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
            ((!selectedAddRewardAmount && !addRewardAmount) || submitting) && styles.confirmBtnDisabled
          ]}
          onPress={() => {
            handleAddReward().catch(error => {
              console.error('Add reward submit failed:', error);
            });
          }}
          disabled={(!selectedAddRewardAmount && !addRewardAmount) || submitting}
        >
          <Text style={styles.confirmBtnText}>
            {t('screens.addRewardScreen.confirmButton').replace('${amount}', formatPoints(selectedAddRewardAmount ?? addRewardAmount ?? 0))}
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
  walletSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  walletSummaryLabel: {
    fontSize: scaleFont(14),
    color: '#1d4ed8',
    fontWeight: '500',
  },
  walletSummaryValue: {
    fontSize: scaleFont(16),
    color: '#1e40af',
    fontWeight: '700',
  },
  walletSummaryHint: {
    marginTop: -14,
    marginBottom: 24,
    fontSize: scaleFont(12),
    color: '#64748b',
    lineHeight: scaleFont(18),
  },
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
