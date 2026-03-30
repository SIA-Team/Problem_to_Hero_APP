import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';

import { scaleFont } from '../utils/responsive';
export default function AddRewardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { currentReward = 50, rewardContributors = 3 } = route?.params || {};
  
  const [addRewardAmount, setAddRewardAmount] = useState('');
  const [selectedAddRewardAmount, setSelectedAddRewardAmount] = useState(null);

  const handleAddReward = () => {
    const amount = selectedAddRewardAmount || parseFloat(addRewardAmount);
    if (!amount || amount <= 0) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.invalidAmount'));
      return;
    }
    if (amount < 0.01) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.minAmount'));
      return;
    }
    if (amount > 1000) {
      showAppAlert(t('screens.addRewardScreen.validation.hint'), t('screens.addRewardScreen.validation.maxAmount'));
      return;
    }
    
    showAppAlert(
      t('screens.addRewardScreen.success.title'),
      t('screens.addRewardScreen.success.message').replace('${amount}', amount),
      [
        {
          text: t('screens.addRewardScreen.success.confirm'),
          onPress: () => navigation.goBack()
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

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* 当前悬赏信息 */}
        <View style={styles.currentRewardInfo}>
          <View style={styles.currentRewardRow}>
            <Text style={styles.currentRewardLabel}>{t('screens.addRewardScreen.currentReward.label')}</Text>
            <Text style={styles.currentRewardAmount}>${currentReward}</Text>
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
              ]}>${amount}</Text>
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
              setAddRewardAmount(text);
              setSelectedAddRewardAmount(null);
            }}
            keyboardType="numeric"
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
          onPress={handleAddReward}
          disabled={!selectedAddRewardAmount && !addRewardAmount}
        >
          <Text style={styles.confirmBtnText}>
            {t('screens.addRewardScreen.confirmButton').replace('${amount}', selectedAddRewardAmount || addRewardAmount || 0)}
          </Text>
        </TouchableOpacity>

        {/* 取消按钮 */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>{t('screens.addRewardScreen.cancelButton')}</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center', 
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
