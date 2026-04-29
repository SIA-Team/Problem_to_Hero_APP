import { centsToAmount } from './rewardAmount';

export const WALLET_POINTS_DIRECTIONS = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
};

export const WALLET_POINTS_SOURCE_TYPES = {
  TOPUP: 'TOPUP',
  REWARD: 'REWARD',
  ADOPT: 'ADOPT',
  PAID_VIEW: 'PAID_VIEW',
  WITHDRAW: 'WITHDRAW',
  REFUND: 'REFUND',
  BOUNTY: 'BOUNTY',
  SUPER_LIKE: 'SUPER_LIKE',
};

export const WALLET_POINTS_DEFAULT_CURRENCY = 'USD';

const WALLET_POINTS_DIRECTION_VALUES = new Set(Object.values(WALLET_POINTS_DIRECTIONS));
const WALLET_POINTS_SOURCE_TYPE_VALUES = new Set(Object.values(WALLET_POINTS_SOURCE_TYPES));
const WALLET_SERVER_MINOR_UNIT_HINTS = new Set([
  'cent',
  'cents',
  'fen',
  'minor',
  'minor_unit',
  'minorunit',
]);
const WALLET_SERVER_MAJOR_UNIT_HINTS = new Set([
  'dollar',
  'dollars',
  'usd',
  'major',
  'major_unit',
  'majorunit',
  'yuan',
  'cny',
  'rmb',
]);
const WALLET_SERVER_SCALE_KEYS = [
  'amountScale',
  'currencyScale',
  'scale',
  'fractionDigits',
  'decimalPlaces',
  'minorUnitScale',
];
const WALLET_SERVER_UNIT_KEYS = [
  'amountUnit',
  'currencyUnit',
  'unit',
];
const WALLET_SERVER_OVERVIEW_AMOUNT_KEYS = [
  'balance',
  'withdrawableBalance',
  'lockedBalance',
  'frozenBalance',
];
const WALLET_SERVER_TRANSACTION_AMOUNT_KEYS = [
  'amount',
  'balance',
  'availableBalance',
  'beforeBalance',
  'afterBalance',
];

const normalizeOptionalString = value => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
};

const normalizePositiveInteger = value => {
  const normalizedValue = Number(value);
  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    return null;
  }

  return normalizedValue;
};

export const normalizeWalletPointsAmount = value => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

export const roundWalletPointsAmount = value => {
  const normalizedValue = normalizeWalletPointsAmount(value);
  return Math.round((normalizedValue + Number.EPSILON) * 100) / 100;
};

const hasExplicitDecimalPlaces = value => {
  if (typeof value === 'string') {
    return value.trim().includes('.');
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && !Number.isInteger(numericValue);
};

const collectWalletServerObservedAmounts = (payload, keys = []) => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  return keys
    .map(key => payload?.[key])
    .filter(value => value !== undefined && value !== null && value !== '');
};

const resolveWalletServerAmountScale = (payload, observedAmounts = []) => {
  if (!payload || typeof payload !== 'object') {
    return 0;
  }

  for (const key of WALLET_SERVER_SCALE_KEYS) {
    const scaleValue = Number(payload?.[key]);
    if (Number.isInteger(scaleValue) && scaleValue >= 0 && scaleValue <= 6) {
      return scaleValue;
    }
  }

  for (const key of WALLET_SERVER_UNIT_KEYS) {
    const unitValue = normalizeOptionalString(payload?.[key])?.toLowerCase();
    if (!unitValue) {
      continue;
    }

    if (WALLET_SERVER_MINOR_UNIT_HINTS.has(unitValue)) {
      return 2;
    }

    if (WALLET_SERVER_MAJOR_UNIT_HINTS.has(unitValue)) {
      return 0;
    }
  }

  if (observedAmounts.some(hasExplicitDecimalPlaces)) {
    return 0;
  }

  const numericAmounts = observedAmounts
    .map(value => Number(value))
    .filter(Number.isFinite)
    .map(value => Math.abs(value));

  if (numericAmounts.some(value => value >= 100)) {
    return 2;
  }

  return 0;
};

const normalizeWalletServerAmountWithScale = (value, scale = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (!(scale > 0)) {
    return roundWalletPointsAmount(numericValue);
  }

  if (scale === 2) {
    return roundWalletPointsAmount(centsToAmount(numericValue));
  }

  return roundWalletPointsAmount(numericValue / Math.pow(10, scale));
};

export const normalizeWalletPointsDirection = value => {
  const normalizedValue = normalizeOptionalString(value);
  if (!normalizedValue) {
    return null;
  }

  const upperCasedValue = normalizedValue.toUpperCase();
  return WALLET_POINTS_DIRECTION_VALUES.has(upperCasedValue) ? upperCasedValue : null;
};

export const normalizeWalletPointsSourceType = value => {
  const normalizedValue = normalizeOptionalString(value);
  if (!normalizedValue) {
    return null;
  }

  const upperCasedValue = normalizedValue.toUpperCase();
  return WALLET_POINTS_SOURCE_TYPE_VALUES.has(upperCasedValue) ? upperCasedValue : null;
};

export const normalizeWalletPointsTxnListParams = (params = {}) => {
  const normalizedParams = {};
  const direction = normalizeWalletPointsDirection(params.direction);
  const sourceType = normalizeWalletPointsSourceType(params.sourceType);
  const startTime = normalizeOptionalString(params.startTime);
  const pageNum = normalizePositiveInteger(params.pageNum);
  const pageSize = normalizePositiveInteger(params.pageSize);

  if (direction) {
    normalizedParams.direction = direction;
  }

  if (sourceType) {
    normalizedParams.sourceType = sourceType;
  }

  if (startTime) {
    normalizedParams.startTime = startTime;
  }

  if (pageNum !== null) {
    normalizedParams.pageNum = pageNum;
  }

  if (pageSize !== null) {
    normalizedParams.pageSize = pageSize;
  }

  return normalizedParams;
};

export const extractWalletTransactionRows = response => {
  const nestedPayload =
    response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : null;

  const payload =
    nestedPayload?.rows || nestedPayload?.total !== undefined
      ? nestedPayload
      : response;

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      total: payload.length,
    };
  }

  const rows = payload?.rows || [];
  const total = Number(payload?.total ?? rows.length) || rows.length;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total,
  };
};

export const getWalletTransactionUniqueKey = item => {
  const candidateValues = [
    item?.txnNo,
    item?.refId && item?.refType ? `${item.refType}:${item.refId}` : null,
    item?.refId,
    item?.createTime,
  ];

  for (const value of candidateValues) {
    const normalizedValue = normalizeOptionalString(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return JSON.stringify(item ?? {});
};

export const summarizeWalletTransactions = rows => {
  return (Array.isArray(rows) ? rows : []).reduce(
    (summary, item) => {
      const direction = normalizeWalletPointsDirection(item?.direction);
      const amount = Math.abs(normalizeWalletPointsAmount(item?.amount));

      if (direction === WALLET_POINTS_DIRECTIONS.DEBIT) {
        summary.expense += amount;
      } else if (direction === WALLET_POINTS_DIRECTIONS.CREDIT) {
        summary.income += amount;
      }

      return summary;
    },
    {
      income: 0,
      expense: 0,
    }
  );
};

export const normalizeWalletPointsOverview = data => {
  return {
    balance: normalizeWalletPointsAmount(data?.balance),
    withdrawableBalance: normalizeWalletPointsAmount(data?.withdrawableBalance),
    lockedBalance: normalizeWalletPointsAmount(data?.lockedBalance),
    frozenBalance: normalizeWalletPointsAmount(data?.frozenBalance),
    currency: normalizeOptionalString(data?.currency) || WALLET_POINTS_DEFAULT_CURRENCY,
  };
};

export const normalizeWalletServerOverview = data => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return normalizeWalletPointsOverview(data);
  }

  const scale = resolveWalletServerAmountScale(
    data,
    collectWalletServerObservedAmounts(data, WALLET_SERVER_OVERVIEW_AMOUNT_KEYS)
  );

  return normalizeWalletPointsOverview({
    ...data,
    balance: normalizeWalletServerAmountWithScale(data?.balance, scale),
    withdrawableBalance: normalizeWalletServerAmountWithScale(
      data?.withdrawableBalance,
      scale
    ),
    lockedBalance: normalizeWalletServerAmountWithScale(data?.lockedBalance, scale),
    frozenBalance: normalizeWalletServerAmountWithScale(data?.frozenBalance, scale),
  });
};

const normalizeWalletServerTransactionItem = (item, scale) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  const nextItem = {
    ...item,
  };

  WALLET_SERVER_TRANSACTION_AMOUNT_KEYS.forEach(key => {
    if (item?.[key] !== undefined) {
      nextItem[key] = normalizeWalletServerAmountWithScale(item[key], scale);
    }
  });

  return nextItem;
};

export const normalizeWalletServerTransactionResponse = response => {
  if (!response || typeof response !== 'object') {
    return response;
  }

  const nestedPayload =
    response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : null;
  const nestedRows = Array.isArray(nestedPayload?.rows) ? nestedPayload.rows : null;
  const topLevelRows = Array.isArray(response?.rows) ? response.rows : null;
  const rows = nestedRows || topLevelRows;

  if (!rows) {
    return response;
  }

  const scaleSource = nestedRows ? nestedPayload : response;
  const observedAmounts = rows
    .flatMap(item => collectWalletServerObservedAmounts(item, ['amount']));
  const scale = resolveWalletServerAmountScale(scaleSource, observedAmounts);
  const normalizedRows = rows.map(item => normalizeWalletServerTransactionItem(item, scale));

  if (nestedRows) {
    return {
      ...response,
      data: {
        ...nestedPayload,
        rows: normalizedRows,
      },
    };
  }

  return {
    ...response,
    rows: normalizedRows,
  };
};

export const applyWalletPointsBalanceDelta = (overviewData, deltaAmount = 0) => {
  const overview = normalizeWalletPointsOverview(overviewData);
  const normalizedDeltaAmount = roundWalletPointsAmount(deltaAmount);

  return {
    ...overview,
    balance: Math.max(0, roundWalletPointsAmount(overview.balance + normalizedDeltaAmount)),
    withdrawableBalance: Math.max(
      0,
      roundWalletPointsAmount(overview.withdrawableBalance + normalizedDeltaAmount)
    ),
  };
};

export const matchesWalletTransactionFilters = (item, params = {}) => {
  const direction = normalizeWalletPointsDirection(params.direction);
  const sourceType = normalizeWalletPointsSourceType(params.sourceType);

  if (direction && normalizeWalletPointsDirection(item?.direction) !== direction) {
    return false;
  }

  if (sourceType && normalizeWalletPointsSourceType(item?.sourceType) !== sourceType) {
    return false;
  }

  return true;
};

export const mergeLocalWalletTransactions = (
  transactionListResult,
  localTransactions = [],
  params = {}
) => {
  const baseRows = Array.isArray(transactionListResult?.rows)
    ? transactionListResult.rows
    : [];
  const baseTotal = Number(transactionListResult?.total ?? baseRows.length) || baseRows.length;
  const filteredLocalTransactions = (Array.isArray(localTransactions) ? localTransactions : [])
    .filter(item => matchesWalletTransactionFilters(item, params));

  if (filteredLocalTransactions.length === 0) {
    return {
      rows: baseRows,
      total: baseTotal,
    };
  }

  const remoteKeys = new Set(baseRows.map(getWalletTransactionUniqueKey));
  const uniqueLocalTransactions = filteredLocalTransactions.filter(
    item => !remoteKeys.has(getWalletTransactionUniqueKey(item))
  );

  return {
    rows: [...uniqueLocalTransactions, ...baseRows],
    total: baseTotal + uniqueLocalTransactions.length,
  };
};
