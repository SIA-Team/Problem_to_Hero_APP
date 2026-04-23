export const normalizeGroupId = value => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean' || typeof value === 'symbol' || (typeof value === 'object' && value !== null)) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }
    value = trimmedValue;
  }

  const normalizedValue = Number(value);
  return Number.isInteger(normalizedValue) ? normalizedValue : null;
};

export const hasGroupIdValue = value => normalizeGroupId(value) !== null;

export const getGroupIdValue = group =>
  normalizeGroupId(
    group?.resolvedGroupId ??
      group?.groupId ??
      group?.id ??
      group?.publicGroupId ??
      group?.questionGroupId ??
      group?.groupID ??
      group?.groupNo
  );

export const normalizeQuestionGroupIdsResponse = response => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.list)
        ? payload.list
        : [];

  return candidateList
    .map(item => {
      if (item && typeof item === 'object') {
        return normalizeGroupId(
          item?.groupId ??
            item?.id ??
            item?.publicGroupId ??
            item?.questionGroupId ??
            item?.groupID ??
            item?.groupNo
        );
      }

      return normalizeGroupId(item);
    })
    .filter(hasGroupIdValue);
};

export const extractGroupIdsFromGroups = groups =>
  groups
    .map(group => getGroupIdValue(group))
    .filter(hasGroupIdValue)
    .filter((groupId, index, array) => array.indexOf(groupId) === index);
