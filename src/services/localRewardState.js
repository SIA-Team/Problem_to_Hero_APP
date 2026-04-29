import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_REWARD_STATE_STORAGE_KEY = '@question_local_reward_state_v1';
const MAX_LOCAL_REWARD_CONTRIBUTORS = 50;

const toRoundedAmount = value => {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return 0;
  }

  return Math.round((normalizedValue + Number.EPSILON) * 100) / 100;
};

const normalizeQuestionId = questionId => String(questionId ?? '').trim();

const normalizeContributorIdentity = contributor => {
  const candidates = [
    contributor?.userId,
    contributor?.contributorUserId,
    contributor?.publicUserId,
    contributor?.id,
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate ?? '').trim();
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return '';
};

const normalizeContributorItem = contributor => {
  if (!contributor || typeof contributor !== 'object') {
    return null;
  }

  const amount = toRoundedAmount(contributor.amount);
  if (!(amount > 0)) {
    return null;
  }

  const identity = normalizeContributorIdentity(contributor);

  return {
    id: String((contributor.id ?? identity) || `reward-${Date.now()}`).trim(),
    userId: identity || null,
    name: String(contributor.name || '').trim() || 'Me',
    avatar: contributor.avatar || null,
    amount,
    time: String(contributor.time || '').trim() || 'Just now',
  };
};

export const createEmptyLocalRewardState = () => ({
  totalAddedAmount: 0,
  contributors: [],
  updatedAt: null,
});

export const normalizeLocalRewardStateEntry = entry => {
  if (!entry || typeof entry !== 'object') {
    return createEmptyLocalRewardState();
  }

  return {
    totalAddedAmount: toRoundedAmount(entry.totalAddedAmount),
    contributors: Array.isArray(entry.contributors)
      ? entry.contributors
        .map(normalizeContributorItem)
        .filter(Boolean)
        .slice(0, MAX_LOCAL_REWARD_CONTRIBUTORS)
      : [],
    updatedAt: entry.updatedAt || null,
  };
};

const loadLocalRewardStateMap = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(LOCAL_REWARD_STATE_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce((accumulator, [questionId, entry]) => {
      const normalizedQuestionId = normalizeQuestionId(questionId);
      if (!normalizedQuestionId) {
        return accumulator;
      }

      accumulator[normalizedQuestionId] = normalizeLocalRewardStateEntry(entry);
      return accumulator;
    }, {});
  } catch (error) {
    console.warn('Failed to load local reward state:', error);
    return {};
  }
};

const saveLocalRewardStateMap = async stateMap => {
  await AsyncStorage.setItem(
    LOCAL_REWARD_STATE_STORAGE_KEY,
    JSON.stringify(stateMap)
  );
};

export const getQuestionLocalRewardState = async questionId => {
  const normalizedQuestionId = normalizeQuestionId(questionId);
  if (!normalizedQuestionId) {
    return createEmptyLocalRewardState();
  }

  const stateMap = await loadLocalRewardStateMap();
  return normalizeLocalRewardStateEntry(stateMap[normalizedQuestionId]);
};

export const mergeQuestionWithLocalRewardState = (question, localRewardState) => {
  if (!question || typeof question !== 'object') {
    return question;
  }

  const normalizedLocalRewardState = normalizeLocalRewardStateEntry(localRewardState);
  const baseBountyAmount = Number(question.__baseBountyAmount ?? question.bountyAmount ?? 0) || 0;
  const baseRewardContributorCount = Number(
    question.__baseRewardContributorCount ??
      question.rewardContributorCount ??
      question.rewardContributorUserIds?.length ??
      0
  ) || 0;
  const baseRewardContributorUserIds = Array.isArray(
    question.__baseRewardContributorUserIds
  )
    ? question.__baseRewardContributorUserIds
    : Array.isArray(question.rewardContributorUserIds)
      ? question.rewardContributorUserIds
      : [];
  const nextRewardContributorUserIds = new Set(
    baseRewardContributorUserIds.map(item => String(item ?? '').trim()).filter(Boolean)
  );

  let additionalContributorCount = 0;
  normalizedLocalRewardState.contributors.forEach(contributor => {
    const identity = normalizeContributorIdentity(contributor);
    if (!identity || nextRewardContributorUserIds.has(identity)) {
      return;
    }

    nextRewardContributorUserIds.add(identity);
    additionalContributorCount += 1;
  });

  const nextBountyAmount =
    baseBountyAmount + Math.round(normalizedLocalRewardState.totalAddedAmount * 100);
  const nextRewardContributorCount = baseRewardContributorCount + additionalContributorCount;

  return {
    ...question,
    bountyAmount: nextBountyAmount,
    reward: nextBountyAmount / 100,
    rewardContributorCount: nextRewardContributorCount,
    rewardContributorUserIds: Array.from(nextRewardContributorUserIds),
    __baseBountyAmount: baseBountyAmount,
    __baseRewardContributorCount: baseRewardContributorCount,
    __baseRewardContributorUserIds: baseRewardContributorUserIds,
    __localRewardHydratedAmount: normalizedLocalRewardState.totalAddedAmount,
  };
};

export const recordQuestionLocalRewardContribution = async (
  questionId,
  {
    amount,
    contributor,
  } = {}
) => {
  const normalizedQuestionId = normalizeQuestionId(questionId);
  const normalizedAmount = toRoundedAmount(amount);
  const normalizedContributor = normalizeContributorItem({
    ...contributor,
    amount: normalizedAmount || contributor?.amount,
  });

  if (!normalizedQuestionId || !(normalizedAmount > 0) || !normalizedContributor) {
    return createEmptyLocalRewardState();
  }

  const stateMap = await loadLocalRewardStateMap();
  const currentState = normalizeLocalRewardStateEntry(stateMap[normalizedQuestionId]);
  const contributorIdentity = normalizeContributorIdentity(normalizedContributor);
  const nextContributors = [...currentState.contributors];
  const existingContributorIndex = nextContributors.findIndex(item => {
    if (contributorIdentity) {
      return normalizeContributorIdentity(item) === contributorIdentity;
    }

    return String(item.id ?? '').trim() === normalizedContributor.id;
  });

  if (existingContributorIndex >= 0) {
    const existingContributor = nextContributors[existingContributorIndex];
    nextContributors.splice(existingContributorIndex, 1);
    nextContributors.unshift({
      ...existingContributor,
      ...normalizedContributor,
      amount: toRoundedAmount(existingContributor.amount + normalizedAmount),
    });
  } else {
    nextContributors.unshift(normalizedContributor);
  }

  const nextState = normalizeLocalRewardStateEntry({
    totalAddedAmount: currentState.totalAddedAmount + normalizedAmount,
    contributors: nextContributors,
    updatedAt: new Date().toISOString(),
  });

  stateMap[normalizedQuestionId] = nextState;
  await saveLocalRewardStateMap(stateMap);
  return {
    ...nextState,
    contributorCountDelta: existingContributorIndex >= 0 ? 0 : 1,
  };
};
