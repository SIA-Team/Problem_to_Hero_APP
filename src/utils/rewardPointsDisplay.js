const normalizeLocale = locale => String(locale || 'en').trim().toLowerCase();

const trimTrailingZeros = value => (
  String(value)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1')
);

const formatScaledValue = (value, unit, decimals = 1) => (
  `${trimTrailingZeros(value.toFixed(decimals))}${unit}`
);

export const isChineseLocale = locale => normalizeLocale(locale).startsWith('zh');

export const resolveRewardPointsFromItem = item => {
  const bountyAmount = Number(item?.bountyAmount);
  if (Number.isFinite(bountyAmount) && bountyAmount > 0) {
    return Math.max(0, Math.round(bountyAmount));
  }

  const rewardAmount = Number(item?.reward);
  if (Number.isFinite(rewardAmount) && rewardAmount > 0) {
    return Math.max(0, Math.round(rewardAmount * 100));
  }

  return 0;
};

export const formatCompactRewardPoints = (points, options = {}) => {
  const numericPoints = Number(points);
  const safePoints =
    Number.isFinite(numericPoints) && numericPoints > 0 ? Math.round(numericPoints) : 0;
  const locale = normalizeLocale(options.locale);

  if (safePoints === 0) {
    return '0';
  }

  if (isChineseLocale(locale)) {
    if (safePoints >= 100000000) {
      return formatScaledValue(safePoints / 100000000, '亿', safePoints >= 1000000000 ? 0 : 1);
    }

    if (safePoints >= 10000) {
      return formatScaledValue(safePoints / 10000, '万');
    }

    return safePoints.toLocaleString('zh-CN');
  }

  if (safePoints >= 1000000000) {
    return formatScaledValue(safePoints / 1000000000, 'B');
  }

  if (safePoints >= 1000000) {
    return formatScaledValue(safePoints / 1000000, 'M');
  }

  if (safePoints >= 1000) {
    return formatScaledValue(safePoints / 1000, 'K');
  }

  return safePoints.toLocaleString('en-US');
};

export const formatRewardPointsBadge = (points, options = {}) => {
  const locale = normalizeLocale(options.locale);
  const formattedPoints = formatCompactRewardPoints(points, { locale });

  return isChineseLocale(locale)
    ? `悬赏 ${formattedPoints}积分`
    : `Reward ${formattedPoints} pts`;
};
