import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';
import {
  applyWalletPointsBalanceDelta,
  extractWalletTransactionRows,
  mergeLocalWalletTransactions,
  normalizeWalletServerOverview,
  normalizeWalletServerTransactionResponse,
  normalizeWalletPointsTxnListParams,
  roundWalletPointsAmount,
  WALLET_POINTS_DEFAULT_CURRENCY,
} from '../../utils/walletPoints';

const WALLET_API_PLACEHOLDER_MESSAGE = 'wallet api not configured';
const LOCAL_WALLET_LEDGER_STORAGE_KEY = '@wallet_points_local_ledger';
const LOCAL_WALLET_LEDGER_MAX_TRANSACTIONS = 50;

const createEmptyLocalLedger = () => ({
  balanceDelta: 0,
  transactions: [],
});

const normalizeLocalWalletTransaction = transaction => {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }

  const amount = roundWalletPointsAmount(transaction.amount);
  if (!(amount > 0)) {
    return null;
  }

  const txnNo = String(
    transaction.txnNo ||
      `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  ).trim();

  return {
    txnNo,
    amount,
    direction: String(transaction.direction || 'DEBIT').trim().toUpperCase(),
    sourceType: String(transaction.sourceType || 'BOUNTY').trim().toUpperCase(),
    remark: String(transaction.remark || '').trim(),
    refId:
      transaction.refId === undefined || transaction.refId === null
        ? null
        : String(transaction.refId).trim(),
    refType: String(transaction.refType || 'QUESTION').trim(),
    createTime: transaction.createTime || new Date().toISOString(),
    currency: String(transaction.currency || WALLET_POINTS_DEFAULT_CURRENCY).trim(),
  };
};

const normalizeLocalWalletLedger = rawValue => {
  if (!rawValue || typeof rawValue !== 'object') {
    return createEmptyLocalLedger();
  }

  const normalizedTransactions = Array.isArray(rawValue.transactions)
    ? rawValue.transactions
      .map(normalizeLocalWalletTransaction)
      .filter(Boolean)
      .slice(0, LOCAL_WALLET_LEDGER_MAX_TRANSACTIONS)
    : [];

  return {
    balanceDelta: roundWalletPointsAmount(rawValue.balanceDelta),
    transactions: normalizedTransactions,
  };
};

const loadLocalWalletLedger = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(LOCAL_WALLET_LEDGER_STORAGE_KEY);

    if (!rawValue) {
      return createEmptyLocalLedger();
    }

    return normalizeLocalWalletLedger(JSON.parse(rawValue));
  } catch (error) {
    console.warn('Failed to load local wallet ledger:', error);
    return createEmptyLocalLedger();
  }
};

const saveLocalWalletLedger = async ledger => {
  const normalizedLedger = normalizeLocalWalletLedger(ledger);
  await AsyncStorage.setItem(
    LOCAL_WALLET_LEDGER_STORAGE_KEY,
    JSON.stringify(normalizedLedger)
  );
  return normalizedLedger;
};

const getPointsOverviewBaseResponse = async () => (
  !API_ENDPOINTS.WALLET.POINTS_OVERVIEW
    ? {
      code: 200,
      msg: WALLET_API_PLACEHOLDER_MESSAGE,
      data: {
        balance: 0,
        withdrawableBalance: 0,
        lockedBalance: 0,
        frozenBalance: 0,
        currency: WALLET_POINTS_DEFAULT_CURRENCY,
      },
    }
    : await apiClient.get(API_ENDPOINTS.WALLET.POINTS_OVERVIEW)
);

const applyLocalLedgerToOverviewResponse = async response => {
  const ledger = await loadLocalWalletLedger();
  const normalizedOverview = normalizeWalletServerOverview(response?.data);
  const baseData = applyWalletPointsBalanceDelta(normalizedOverview, ledger.balanceDelta);

  return {
    ...response,
    data: baseData,
  };
};

const applyLocalLedgerToTransactionResponse = async (response, params = {}) => {
  const normalizedParams = normalizeWalletPointsTxnListParams(params);
  const ledger = await loadLocalWalletLedger();
  const normalizedResponse = normalizeWalletServerTransactionResponse(response);

  if (ledger.transactions.length === 0) {
    return normalizedResponse;
  }

  const requestedPageNum = Number(normalizedParams.pageNum) || 1;
  if (requestedPageNum > 1) {
    return normalizedResponse;
  }

  const mergedTransactions = mergeLocalWalletTransactions(
    extractWalletTransactionRows(normalizedResponse),
    ledger.transactions,
    normalizedParams
  );

  if (
    normalizedResponse?.data &&
    typeof normalizedResponse.data === 'object' &&
    !Array.isArray(normalizedResponse.data) &&
    (Array.isArray(normalizedResponse.data.rows) || normalizedResponse.data.total !== undefined)
  ) {
    return {
      ...normalizedResponse,
      data: {
        ...normalizedResponse.data,
        rows: mergedTransactions.rows,
        total: mergedTransactions.total,
      },
    };
  }

  return {
    ...normalizedResponse,
    rows: mergedTransactions.rows,
    total: mergedTransactions.total,
  };
};

const walletApi = {
  async getPointsOverview() {
    const baseResponse = await getPointsOverviewBaseResponse();
    return applyLocalLedgerToOverviewResponse(baseResponse);
  },

  async getPointsTransactionList(params = {}) {
    const normalizedParams = normalizeWalletPointsTxnListParams(params);

    const baseResponse = !API_ENDPOINTS.WALLET.POINTS_TXN_LIST
      ? {
        code: 200,
        msg: WALLET_API_PLACEHOLDER_MESSAGE,
        total: 0,
        rows: [],
      }
      : await apiClient.get(API_ENDPOINTS.WALLET.POINTS_TXN_LIST, {
        params: normalizedParams,
      });

    return applyLocalLedgerToTransactionResponse(baseResponse, normalizedParams);
  },

  async consumePoints(amount, options = {}) {
    const normalizedAmount = roundWalletPointsAmount(amount);
    if (!(normalizedAmount > 0)) {
      return {
        code: 400,
        msg: 'invalid wallet amount',
      };
    }

    const overviewResponse = await walletApi.getPointsOverview();
    const currentBalance = roundWalletPointsAmount(overviewResponse?.data?.balance);

    if (currentBalance < normalizedAmount) {
      return {
        code: 400,
        msg: 'insufficient wallet balance',
      };
    }

    const ledger = await loadLocalWalletLedger();
    const transaction = normalizeLocalWalletTransaction({
      amount: normalizedAmount,
      direction: 'DEBIT',
      sourceType: options.sourceType || 'BOUNTY',
      remark: options.remark,
      refId: options.refId,
      refType: options.refType || 'QUESTION',
      createTime: options.createTime || new Date().toISOString(),
      currency: options.currency || overviewResponse?.data?.currency,
    });

    const nextLedger = await saveLocalWalletLedger({
      balanceDelta: roundWalletPointsAmount(ledger.balanceDelta - normalizedAmount),
      transactions: [transaction, ...ledger.transactions],
    });

    return {
      code: 200,
      msg: 'ok',
      data: {
        balance: Math.max(0, roundWalletPointsAmount(currentBalance - normalizedAmount)),
        currency: overviewResponse?.data?.currency || WALLET_POINTS_DEFAULT_CURRENCY,
        ledger: nextLedger,
        transaction,
      },
    };
  },

  async syncServerPointsDebit(amount, options = {}) {
    const normalizedAmount = roundWalletPointsAmount(amount);
    const hasBalanceAfter = options.balanceAfter !== undefined && options.balanceAfter !== null;
    const normalizedBalanceAfter = hasBalanceAfter
      ? Math.max(0, roundWalletPointsAmount(options.balanceAfter))
      : null;

    if (!(normalizedAmount > 0) && normalizedBalanceAfter === null) {
      return {
        code: 400,
        msg: 'invalid wallet sync payload',
      };
    }

    const baseResponse = await getPointsOverviewBaseResponse();
    const overview = normalizeWalletServerOverview(baseResponse?.data);
    const currentServerBalance = roundWalletPointsAmount(overview?.balance);
    const ledger = await loadLocalWalletLedger();
    const transaction = normalizedAmount > 0
      ? normalizeLocalWalletTransaction({
        txnNo: options.txnNo,
        amount: normalizedAmount,
        direction: 'DEBIT',
        sourceType: options.sourceType || 'BOUNTY',
        remark: options.remark,
        refId: options.refId,
        refType: options.refType || 'QUESTION',
        createTime: options.createTime || new Date().toISOString(),
        currency: options.currency || overview?.currency,
      })
      : null;
    const nextTransactions = transaction
      ? [
        transaction,
        ...ledger.transactions.filter(item => item.txnNo !== transaction.txnNo),
      ]
      : ledger.transactions;
    const nextLedger = await saveLocalWalletLedger({
      balanceDelta: normalizedBalanceAfter === null
        ? ledger.balanceDelta
        : roundWalletPointsAmount(normalizedBalanceAfter - currentServerBalance),
      transactions: nextTransactions,
    });
    const nextBalance = normalizedBalanceAfter === null
      ? Math.max(0, roundWalletPointsAmount(currentServerBalance + nextLedger.balanceDelta))
      : normalizedBalanceAfter;

    return {
      code: 200,
      msg: 'ok',
      data: {
        balance: nextBalance,
        currency: overview?.currency || WALLET_POINTS_DEFAULT_CURRENCY,
        ledger: nextLedger,
        transaction,
      },
    };
  },
};

export default walletApi;
