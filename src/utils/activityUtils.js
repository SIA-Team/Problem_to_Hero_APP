import { formatDate } from './timeFormatter';

const ENDED_STATUS_PATTERNS = [
  /\u5df2\u7ed3\u675f/,
  /\u7ed3\u675f/,
  /ended/i,
  /finished/i,
  /closed/i,
  /completed/i,
];

const ACTIVE_STATUS_PATTERNS = [
  /\u8fdb\u884c\u4e2d/,
  /\u62a5\u540d\u4e2d/,
  /active/i,
  /ongoing/i,
  /open/i,
  /registering/i,
];

const ONLINE_TYPE_PATTERN = /\u7ebf\u4e0a|online/i;
const OFFLINE_TYPE_PATTERN = /\u7ebf\u4e0b|offline/i;

const toFiniteNumber = value => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const parseDateValue = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^\d+$/.test(trimmedValue)) {
    const timestamp = Number(trimmedValue);
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
    }
  }

  const directDate = new Date(trimmedValue);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const isoLikeDate = new Date(trimmedValue.replace(' ', 'T'));
  return Number.isNaN(isoLikeDate.getTime()) ? null : isoLikeDate;
};

const getTimestamp = value => parseDateValue(value)?.getTime() || 0;

const normalizeTags = tags =>
  Array.isArray(tags)
    ? tags
        .filter(tag => typeof tag === 'string')
        .map(tag => tag.trim())
        .filter(Boolean)
    : [];

export const formatActivityDate = value => {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return typeof value === 'string' ? value : '';
  }

  return formatDate(parsedDate, { short: true });
};

export const getActivityImages = activity => {
  const coverCandidates = [activity?.coverImage, activity?.image, activity?.cover];
  const arrayCandidates = [activity?.images, activity?.imageUrls];

  const images = arrayCandidates
    .filter(Array.isArray)
    .flat()
    .filter(image => typeof image === 'string' && image.trim())
    .map(image => image.trim());

  const coverImage = coverCandidates.find(image => typeof image === 'string' && image.trim());
  if (coverImage && !images.includes(coverImage)) {
    return [coverImage, ...images];
  }

  return images.length > 0 ? images : coverImage ? [coverImage] : [];
};

const inferActivityType = activity => {
  const rawType = activity?.type ?? activity?.activityType;
  const rawTypeName = String(activity?.typeName || '');

  if (
    rawType === 1 ||
    rawType === '1' ||
    rawType === 'online' ||
    ONLINE_TYPE_PATTERN.test(rawTypeName)
  ) {
    return 'online';
  }

  if (
    rawType === 2 ||
    rawType === '2' ||
    rawType === 'offline' ||
    OFFLINE_TYPE_PATTERN.test(rawTypeName)
  ) {
    return 'offline';
  }

  if (rawType === 'online' || rawType === 'offline') {
    return rawType;
  }

  return null;
};

const inferActivityStatus = activity => {
  const rawStatus = toFiniteNumber(activity?.status ?? activity?.activityStatus);

  if (rawStatus === 5 || rawStatus === 6) {
    return 'ended';
  }

  if (rawStatus === 2 || rawStatus === 4) {
    return 'active';
  }

  if (activity?.status === 'ended') {
    return 'ended';
  }

  if (activity?.status === 'active') {
    return 'active';
  }

  const rawStatusName = String(activity?.statusName || '');
  if (ENDED_STATUS_PATTERNS.some(pattern => pattern.test(rawStatusName))) {
    return 'ended';
  }

  if (ACTIVE_STATUS_PATTERNS.some(pattern => pattern.test(rawStatusName))) {
    return 'active';
  }

  const endTimestamp = getTimestamp(activity?.endTime);
  if (endTimestamp && endTimestamp < Date.now()) {
    return 'ended';
  }

  return 'active';
};

const inferOrganizerType = activity => {
  if (['platform', 'personal', 'team'].includes(activity?.organizerType)) {
    return activity.organizerType;
  }

  if (activity?.isOfficial) {
    return 'platform';
  }

  return activity?.sponsor?.name || activity?.organizer || activity?.organizerName
    ? 'personal'
    : 'platform';
};

export const normalizeActivityItem = (activity, index = 0) => {
  if (!activity || !activity.id) {
    return null;
  }

  const images = getActivityImages(activity);
  const participants = toFiniteNumber(
    activity.joinCount ?? activity.participants ?? activity.currentParticipants
  );
  const currentParticipants = toFiniteNumber(
    activity.currentParticipants ?? activity.joinCount ?? activity.participants
  );
  const organizer = activity?.sponsor?.name || activity?.organizer || activity?.organizerName || '';
  const type = inferActivityType(activity);
  const status = inferActivityStatus(activity);
  const rawStatusCode = Number(activity?.status ?? activity?.activityStatus);

  return {
    ...activity,
    id: activity.id,
    title: activity.title || '',
    desc: activity.description || activity.desc || '',
    description: activity.description || activity.desc || '',
    image: images[0] || null,
    images,
    participants,
    joinCount: participants,
    currentParticipants,
    startTime: formatActivityDate(activity.startTime),
    endTime: formatActivityDate(activity.endTime),
    startTimeRaw: activity.startTime ?? null,
    endTimeRaw: activity.endTime ?? null,
    type,
    typeName: activity.typeName || '',
    status,
    statusCode: Number.isFinite(rawStatusCode) ? rawStatusCode : null,
    statusKey: status,
    statusName: activity.statusName || '',
    joined: Boolean(activity.isJoined ?? activity.joined),
    isJoined: Boolean(activity.isJoined ?? activity.joined),
    organizer,
    organizerName: organizer,
    organizerType: inferOrganizerType(activity),
    address: activity.location || activity.address || '',
    location: activity.location || activity.address || '',
    reward: activity.reward || '',
    progress: activity.progress,
    tags: normalizeTags(activity.tags),
    isOfficial: Boolean(activity.isOfficial),
    coverImage: images[0] || activity.coverImage || activity.image || activity.cover || null,
    originalIndex: typeof activity.originalIndex === 'number' ? activity.originalIndex : index,
  };
};

export const normalizeActivityList = activities =>
  Array.isArray(activities)
    ? activities
        .map((activity, index) => normalizeActivityItem(activity, index))
        .filter(Boolean)
    : [];

const sortByOriginalIndex = (left, right) => (left.originalIndex || 0) - (right.originalIndex || 0);

export const getActivitiesByTab = (activities, tabKey) => {
  const list = Array.isArray(activities) ? [...activities] : [];

  switch (tabKey) {
    case 'hot':
      return list
        .filter(activity => activity.status !== 'ended')
        .sort(
          (left, right) =>
            right.participants - left.participants ||
            getTimestamp(right.startTimeRaw) - getTimestamp(left.startTimeRaw) ||
            sortByOriginalIndex(left, right)
        );
    case 'new':
      return list
        .filter(activity => activity.status !== 'ended')
        .sort(
          (left, right) =>
            getTimestamp(right.startTimeRaw) - getTimestamp(left.startTimeRaw) ||
            toFiniteNumber(right.id) - toFiniteNumber(left.id) ||
            sortByOriginalIndex(left, right)
        );
    case 'ended':
      return list
        .filter(activity => activity.status === 'ended')
        .sort(
          (left, right) =>
            getTimestamp(right.endTimeRaw) - getTimestamp(left.endTimeRaw) ||
            sortByOriginalIndex(left, right)
        );
    case 'mine':
      return list
        .filter(activity => activity.joined)
        .sort((left, right) => {
          if (left.status !== right.status) {
            return left.status === 'ended' ? 1 : -1;
          }

          return (
            getTimestamp(left.endTimeRaw) - getTimestamp(right.endTimeRaw) ||
            sortByOriginalIndex(left, right)
          );
        });
    case 'all':
    default:
      return list.sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'ended' ? 1 : -1;
        }

        return sortByOriginalIndex(left, right);
      });
  }
};

export const getJoinedActivityState = activity => {
  const normalizedActivity = normalizeActivityItem(activity);
  if (!normalizedActivity || normalizedActivity.joined) {
    return normalizedActivity;
  }

  const participants = normalizedActivity.participants + 1;
  const currentParticipants = normalizedActivity.currentParticipants + 1;

  return {
    ...normalizedActivity,
    joined: true,
    isJoined: true,
    participants,
    joinCount: participants,
    currentParticipants,
  };
};

export const getQuitActivityState = activity => {
  const normalizedActivity = normalizeActivityItem(activity);
  if (!normalizedActivity || !normalizedActivity.joined) {
    return normalizedActivity;
  }

  const participants = Math.max(0, normalizedActivity.participants - 1);
  const currentParticipants = Math.max(0, normalizedActivity.currentParticipants - 1);

  return {
    ...normalizedActivity,
    joined: false,
    isJoined: false,
    participants,
    joinCount: participants,
    currentParticipants,
  };
};
