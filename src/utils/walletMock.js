import AsyncStorage from '@react-native-async-storage/async-storage';

const WALLET_MOCK_STATE_KEY = '@wallet_mock_state';
const MAX_WALLET_RECORDS = 20;

const createDefaultState = () => ({
  addedBalance: 0,
  rechargeRecords: [],
  expenseRecords: [],
});

const formatRecordTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const normalizeState = state => {
  if (!state || typeof state !== 'object') {
    return createDefaultState();
  }

  const addedBalance = Number(state.addedBalance);
  const rechargeRecords = Array.isArray(state.rechargeRecords)
    ? state.rechargeRecords.filter(item => item && typeof item === 'object')
    : [];
  const expenseRecords = Array.isArray(state.expenseRecords)
    ? state.expenseRecords.filter(item => item && typeof item === 'object')
    : [];

  return {
    addedBalance: Number.isFinite(addedBalance) ? addedBalance : 0,
    rechargeRecords,
    expenseRecords,
  };
};

export const getWalletMockState = async () => {
  try {
    const rawState = await AsyncStorage.getItem(WALLET_MOCK_STATE_KEY);

    if (!rawState) {
      return createDefaultState();
    }

    return normalizeState(JSON.parse(rawState));
  } catch (error) {
    console.error('Failed to read wallet mock state:', error);
    return createDefaultState();
  }
};

export const getWalletBalanceWithMock = async baseBalance => {
  const state = await getWalletMockState();
  const numericBaseBalance = Number(baseBalance);
  const safeBaseBalance = Number.isFinite(numericBaseBalance) ? numericBaseBalance : 0;

  return {
    balance: safeBaseBalance + state.addedBalance,
    mockAddedBalance: state.addedBalance,
  };
};

export const getMockRechargeRecords = async () => {
  const state = await getWalletMockState();
  return state.rechargeRecords;
};

export const getMockWalletExpenseRecords = async () => {
  const state = await getWalletMockState();
  return state.expenseRecords;
};

export const applyMockRecharge = async ({ amount, currency = 'usd' }) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid recharge amount');
  }

  const previousState = await getWalletMockState();
  const nextRecord = {
    id: `mock_recharge_${Date.now()}`,
    type: '官网充值(模拟)',
    amount: numericAmount,
    time: formatRecordTime(),
    status: 'completed',
    currency: String(currency || 'usd').toLowerCase(),
    isMock: true,
  };

  const nextState = {
    addedBalance: previousState.addedBalance + numericAmount,
    rechargeRecords: [nextRecord, ...previousState.rechargeRecords].slice(0, MAX_WALLET_RECORDS),
    expenseRecords: previousState.expenseRecords,
  };

  await AsyncStorage.setItem(WALLET_MOCK_STATE_KEY, JSON.stringify(nextState));

  return nextState;
};

export const applyMockWalletExpense = async ({
  amount,
  currency = 'usd',
  type = '追加悬赏',
}) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid expense amount');
  }

  const previousState = await getWalletMockState();
  const nextRecord = {
    id: `mock_expense_${Date.now()}`,
    type,
    amount: numericAmount,
    time: formatRecordTime(),
    status: 'completed',
    currency: String(currency || 'usd').toLowerCase(),
    isMock: true,
  };

  const nextState = {
    addedBalance: previousState.addedBalance - numericAmount,
    rechargeRecords: previousState.rechargeRecords,
    expenseRecords: [nextRecord, ...previousState.expenseRecords].slice(0, MAX_WALLET_RECORDS),
  };

  await AsyncStorage.setItem(WALLET_MOCK_STATE_KEY, JSON.stringify(nextState));

  return nextState;
};
