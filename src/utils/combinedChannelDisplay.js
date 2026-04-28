import { getRegionPathById } from '../services/regionService';

export const pickFirstText = (...values) => {
  for (const value of values) {
    const normalizedValue = String(value ?? '').trim();
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

export const getChannelDisplayName = (channel) => {
  if (typeof channel === 'string') {
    return channel.trim();
  }

  return String(channel?.name ?? '').trim();
};

export const getMatchedCombinedChannelCategoryName = (channel, knownCategoryNames = []) => {
  const fullName = getChannelDisplayName(channel);
  return knownCategoryNames.find((name) => fullName.endsWith(name)) || '';
};

const splitChannelDisplaySegments = (value) =>
  String(value ?? '')
    .split(/\s*[-–—/]\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

const getLastChannelDisplaySegment = (value) => {
  const segments = splitChannelDisplaySegments(value);
  return segments.length > 0 ? segments[segments.length - 1] : '';
};

const ENGLISH_REGION_BOUNDARY_TOKENS = [
  'County',
  'District',
  'Province',
  'State',
  'City',
  'Township',
  'Town',
  'Village',
  'Parish',
  'Borough',
  'Municipality',
  'Region',
  'Prefecture',
];

const stripChannelDisplaySeparators = (value) =>
  String(value ?? '').replace(/[\s\-–—/]+/g, '');

const insertCamelCaseSeparators = (value) =>
  String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();

const extractTrailingChineseRegion = (value) => {
  const normalizedValue = String(value ?? '').trim();
  const match = normalizedValue.match(/([\u4e00-\u9fff]+(?:特别行政区|自治区|自治州|省|市|区|县|州|镇|乡|街道|旗))$/);
  return match?.[1] || '';
};

const extractFinalRegionFromCompactName = (value) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return '';
  }

  const directLastSegment = getLastChannelDisplaySegment(normalizedValue);
  if (directLastSegment && directLastSegment !== normalizedValue) {
    return directLastSegment;
  }

  const chineseRegion = extractTrailingChineseRegion(normalizedValue);
  if (chineseRegion) {
    return chineseRegion;
  }

  const spacedValue = insertCamelCaseSeparators(normalizedValue);
  const tokens = spacedValue.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return normalizedValue;
  }

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (ENGLISH_REGION_BOUNDARY_TOKENS.includes(tokens[index])) {
      const trailingTokens = tokens.slice(index + 1);
      if (trailingTokens.length > 0) {
        return trailingTokens.join(' ');
      }
    }
  }

  if (tokens.length >= 2) {
    return tokens.slice(-2).join(' ');
  }

  return tokens[tokens.length - 1];
};

export const isCombinedChannel = (channel) => {
  const raw = channel?.raw && typeof channel.raw === 'object' ? channel.raw : channel;
  const targetType = String(channel?.targetType ?? raw?.targetType ?? '').trim().toUpperCase();

  if (targetType) {
    return targetType === 'COMBINED';
  }

  return Boolean(
    pickFirstText(
      raw?.combinedChannelName,
      raw?.comboChannelName,
      raw?.locationText,
      raw?.regionDisplay,
      raw?.regionId,
      raw?.bindRegionId
    )
  );
};

export const shouldCompactCombinedChannelDisplay = (channel, knownCategoryNames = []) => {
  if (isCombinedChannel(channel)) {
    return true;
  }

  const fullName = getChannelDisplayName(channel);
  const matchedCategoryName = getMatchedCombinedChannelCategoryName(channel, knownCategoryNames);

  if (!fullName || !matchedCategoryName) {
    return false;
  }

  return fullName.length > matchedCategoryName.length;
};

export const getCombinedChannelDisplayName = (channel) => {
  const fullName = getChannelDisplayName(channel);

  if (!fullName || !isCombinedChannel(channel) || !channel || typeof channel !== 'object') {
    return fullName;
  }

  const raw = channel?.raw && typeof channel.raw === 'object' ? channel.raw : channel;
  const nameSegments = splitChannelDisplaySegments(fullName);
  const locationText = pickFirstText(
    raw?.locationText,
    raw?.regionDisplay,
    raw?.location
  );
  const finalRegion = pickFirstText(
    raw?.districtName,
    raw?.district,
    raw?.cityName,
    raw?.city,
    raw?.provinceName,
    raw?.province,
    raw?.stateName,
    raw?.state,
    raw?.countryName,
    raw?.country
  ) || getLastChannelDisplaySegment(locationText);
  let categoryLabel = pickFirstText(
    raw?.subCategoryName,
    raw?.subCategory,
    raw?.categoryName,
    raw?.categoryLabel,
    raw?.channelCategoryName
  );

  if (!categoryLabel && locationText) {
    const compactName = stripChannelDisplaySeparators(fullName);
    const compactLocation = stripChannelDisplaySeparators(locationText);

    if (compactLocation && compactName.startsWith(compactLocation)) {
      categoryLabel = compactName.slice(compactLocation.length).trim();
    }
  }

  if (!categoryLabel && nameSegments.length >= 2) {
    categoryLabel = nameSegments[nameSegments.length - 1];
  }

  if (finalRegion && categoryLabel) {
    return `${finalRegion}-${categoryLabel}`;
  }

  if (nameSegments.length >= 2) {
    return `${nameSegments[nameSegments.length - 2]}-${nameSegments[nameSegments.length - 1]}`;
  }

  return fullName;
};

export const getCombinedChannelRegionId = (channel) => {
  const raw = channel?.raw && typeof channel.raw === 'object' ? channel.raw : channel;
  const numericRegionId = Number(
    pickFirstText(
      raw?.regionId,
      raw?.bindRegionId,
      raw?.locationRegionId,
      raw?.areaId,
      raw?.locationId,
      raw?.region?.id
    )
  );

  return Number.isInteger(numericRegionId) && numericRegionId > 0 ? numericRegionId : 0;
};

export const getCombinedChannelCategoryLabel = (channel, knownCategoryNames = []) => {
  const raw = channel?.raw && typeof channel.raw === 'object' ? channel.raw : channel;
  const fullName = getChannelDisplayName(channel);
  const explicitCategoryLabel = pickFirstText(
    raw?.subCategoryName,
    raw?.subCategory,
    raw?.categoryName,
    raw?.categoryLabel,
    raw?.channelCategoryName
  );

  if (explicitCategoryLabel) {
    return explicitCategoryLabel;
  }

  const matchedCategoryName = getMatchedCombinedChannelCategoryName(channel, knownCategoryNames);
  return matchedCategoryName || '';
};

export const buildCombinedChannelResolvedDisplayName = async (channel, knownCategoryNames = []) => {
  const fullName = getChannelDisplayName(channel);

  if (!fullName || !channel || typeof channel !== 'object') {
    return fullName;
  }

  if (!shouldCompactCombinedChannelDisplay(channel, knownCategoryNames)) {
    return fullName;
  }

  const raw = channel?.raw && typeof channel.raw === 'object' ? channel.raw : channel;
  const categoryLabel = getCombinedChannelCategoryLabel(channel, knownCategoryNames);
  const compactNameWithoutCategory =
    categoryLabel && fullName.endsWith(categoryLabel)
      ? fullName.slice(0, fullName.length - categoryLabel.length).trim()
      : fullName;
  let finalRegion = pickFirstText(
    raw?.districtName,
    raw?.district,
    raw?.cityName,
    raw?.city,
    raw?.provinceName,
    raw?.province,
    raw?.stateName,
    raw?.state,
    raw?.countryName,
    raw?.country
  );

  if (!finalRegion) {
    const regionId = getCombinedChannelRegionId(channel);

    if (regionId > 0) {
      try {
        const regionPath = await getRegionPathById(regionId);
        finalRegion = regionPath.length > 0 ? regionPath[regionPath.length - 1]?.name || '' : '';
      } catch (error) {
        console.error('Failed to resolve combined channel region path:', error);
      }
    }
  }

  if (!finalRegion) {
    finalRegion = getLastChannelDisplaySegment(raw?.locationText || raw?.regionDisplay || raw?.location);
  }

  if (!finalRegion) {
    finalRegion = extractFinalRegionFromCompactName(compactNameWithoutCategory);
  }

  if (finalRegion && categoryLabel) {
    return `${finalRegion}-${categoryLabel}`;
  }

  return getCombinedChannelDisplayName(channel);
};
