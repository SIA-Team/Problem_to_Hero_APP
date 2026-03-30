import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import superLikeCreditService from '../services/SuperLikeCreditService';
import { useTranslation } from '../i18n/withTranslation';
import { formatTime } from '../utils/timeFormatter';
import { scaleFont } from '../utils/responsive';
export default function SuperLikeHistoryScreen({
  navigation
}) {
  const insets = useSafeAreaInsets();
  const {
    t
  } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    loadHistory();
  }, []);
  const loadHistory = async () => {
    try {
      const history = await superLikeCreditService.getHistory();
      setTransactions(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };
  const renderTransaction = transaction => {
    const isPurchase = transaction.type === 'purchase';
    return <View key={transaction.id} style={styles.transactionCard}>
        <View style={[styles.iconContainer, isPurchase ? styles.iconPurchase : styles.iconUse]}>
          <Ionicons name={isPurchase ? "add-circle" : "star"} size={20} color={isPurchase ? "#10b981" : "#f59e0b"} />
        </View>
        
        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionType}>
              {isPurchase ? t('superLike.history.typePurchase') : t('superLike.history.typeUse')}
            </Text>
            <Text style={[styles.transactionAmount, isPurchase ? styles.amountPositive : styles.amountNegative]}>
              {isPurchase ? '+' : '-'}{transaction.amount} {t('superLike.history.amount')}
            </Text>
          </View>
          
          {Boolean(!isPurchase && transaction.answerTitle) && <Text style={styles.answerTitle} numberOfLines={2}>
              {t('superLike.history.usedOn')}{transaction.answerTitle}
            </Text>}
          
          <Text style={styles.transactionTime}>
            {formatTime(transaction.timestamp)}
          </Text>
        </View>
      </View>;
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('superLike.history.title')}</Text>
        <View style={{
        width: 44
      }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{
      paddingBottom: Math.max(insets.bottom, 20),
      paddingHorizontal: 16,
      paddingTop: 16
    }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? <View style={styles.emptyContainer}>
            <Ionicons name="hourglass-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('superLike.history.loading')}</Text>
          </View> : transactions.length === 0 ? <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('superLike.history.empty')}</Text>
            <Text style={styles.emptyHint}>
              {t('superLike.history.emptyHint')}
            </Text>
          </View> : <View style={styles.transactionList}>
            {transactions.map(renderTransaction)}
          </View>}
      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  content: {
    flex: 1
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: '#9ca3af',
    marginTop: 16,
    fontWeight: '500'
  },
  emptyHint: {
    fontSize: scaleFont(14),
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center'
  },
  transactionList: {
    gap: 12
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconPurchase: {
    backgroundColor: '#d1fae5'
  },
  iconUse: {
    backgroundColor: '#fef3c7'
  },
  transactionContent: {
    flex: 1
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  transactionType: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  transactionAmount: {
    fontSize: scaleFont(15),
    fontWeight: 'bold'
  },
  amountPositive: {
    color: '#10b981'
  },
  amountNegative: {
    color: '#f59e0b'
  },
  answerTitle: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: scaleFont(18)
  },
  transactionTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  }
});