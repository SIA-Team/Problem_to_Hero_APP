import { API_ENDPOINTS } from '../config/api';
import { getApiServerUrl } from '../config/env';
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
const JOINED_STATUS_PATTERNS = [
  /\u5df2\u53c2\u4e0e/,
  /\u5df2\u53c2\u52a0/,
  /\u62a5\u540d\u6210\u529f/,
  /joined/i,
  /participated?/i,
  /registered?/i,
  /success/i,
  /approved/i,
];

const ONLINE_TYPE_PATTERN = /\u7ebf\u4e0a|online/i;
const OFFLINE_TYPE_PATTERN = /\u7ebf\u4e0b|offline/i;
const ABSOLUTE_IMAGE_URL_PATTERN = /^(https?:\/\/|data:image\/|file:\/\/|content:\/\/|asset:\/\/)/i;
const LEGACY_ACTIVITY_IMAGE_HOSTS = new Set([
  '123.144.149.59:30560',
]);

const pickFirstNonEmptyString = values =>
  values.find(value => typeof value === 'string' && value.trim())?.trim() || '';

const getActivityImageServerUrl = () =>
  String(getApiServerUrl(API_ENDPOINTS.UPLOAD.IMAGE) || '').replace(/\/+$/, '');

const getUrlOrigin = value => {
  try {
    return new URL(value).origin;
  } catch (error) {
    return '';
  }
};

const normalizeActivityImageUrl = rawUrl => {
  const normalizedUrl = String(rawUrl || '').trim();
  if (!normalizedUrl) {
    return '';
  }

  if (ABSOLUTE_IMAGE_URL_PATTERN.test(normalizedUrl)) {
    try {
      const parsedUrl = new URL(normalizedUrl);
      if (LEGACY_ACTIVITY_IMAGE_HOSTS.has(parsedUrl.host)) {
        const imageServerOrigin = getUrlOrigin(getActivityImageServerUrl());
        if (imageServerOrigin) {
          return `${imageServerOrigin}${parsedUrl.pathname}${parsedUrl.search}`;
        }
      }
    } catch (error) {
      // Keep the original absolute URL when parsing fails.
    }

    return normalizedUrl;
  }

  const imageServerUrl = getActivityImageServerUrl();

  if (normalizedUrl.startsWith('//')) {
    const protocol = imageServerUrl.startsWith('https://') ? 'https:' : 'http:';
    return `${protocol}${normalizedUrl}`;
  }

  if (!imageServerUrl) {
    return normalizedUrl;
  }

  const normalizedPath = normalizedUrl.startsWith('/')
    ? normalizedUrl
    : `/${normalizedUrl.replace(/^\/+/, '')}`;

  return `${imageServerUrl}${normalizedPath}`;
};

const extractActivityImageStrings = value => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractActivityImageStrings);
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return [];
    }

    if (
      (normalizedValue.startsWith('[') && normalizedValue.endsWith(']')) ||
      (normalizedValue.startsWith('{') && normalizedValue.endsWith('}'))
    ) {
      try {
        const parsedValue = JSON.parse(normalizedValue);
        const parsedImages = extractActivityImageStrings(parsedValue);
        if (parsedImages.length > 0) {
          return parsedImages;
        }
      } catch (error) {
        // Fall back to treating the raw string as the image value.
      }
    }

    return [normalizeActivityImageUrl(normalizedValue)].filter(Boolean);
  }

  if (typeof value === 'object') {
    const directImageUrl = pickFirstNonEmptyString([
      value.url,
      value.imageUrl,
      value.fileUrl,
      value.link,
      value.path,
      value.coverImage,
      value.cover,
      value.thumbnail,
    ]);

    if (directImageUrl) {
      return [normalizeActivityImageUrl(directImageUrl)].filter(Boolean);
    }

    return [
      ...extractActivityImageStrings(value.images),
      ...extractActivityImageStrings(value.imageUrls),
    ];
  }

  return [];
};

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

const parseBooleanLike = value => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (/^-?\d+(\.\d+)?$/.test(normalizedValue)) {
      const numericValue = Number(normalizedValue);

      if (Number.isFinite(numericValue) && numericValue > 0) {
        return true;
      }

      if (numericValue === 0) {
        return false;
      }
    }

    if (['true', '1', 'yes', 'y'].includes(normalizedValue)) {
      return true;
    }

    if (['false', '0', 'no', 'n'].includes(normalizedValue)) {
      return false;
    }
  }

  return null;
};

const normalizeIdentityToken = value => String(value ?? '').trim();

const pickFirstIdentityToken = values =>
  values
    .map(normalizeIdentityToken)
    .find(Boolean) || '';

const getActivityOwnerNameCandidates = activity =>
  [
    activity?.sponsor?.name,
    activity?.sponsorName,
    activity?.creatorName,
    activity?.createByName,
    activity?.create_by_name,
    activity?.createBy,
    activity?.create_by,
    activity?.publisherName,
    activity?.authorName,
    activity?.userName,
    activity?.userNickname,
    activity?.nickName,
    activity?.nickname,
    activity?.organizer,
    activity?.organizerName,
  ]
    .map(value => String(value ?? '').trim())
    .filter(Boolean);

export const getActivityOwnerUserId = activity =>
  pickFirstIdentityToken([
    activity?.sponsor?.id,
    activity?.sponsor?.userId,
    activity?.sponsor?.appUserId,
    activity?.sponsorId,
    activity?.ownerUserId,
    activity?.creatorUserId,
    activity?.creatorId,
    activity?.creator_id,
    activity?.publisherId,
    activity?.publisher_id,
    activity?.authorId,
    activity?.author_id,
    activity?.appUserId,
    activity?.userId,
    activity?.user_id,
    activity?.uid,
  ]);

export const isActivityOwnedByCurrentUser = (
  activity,
  { currentUserId = '', currentUserIds = [], currentUserNames = [] } = {}
) => {
  const normalizedCurrentUserIds = Array.from(
    new Set(
      [
        currentUserId,
        ...(Array.isArray(currentUserIds) ? currentUserIds : []),
      ]
        .map(normalizeIdentityToken)
        .filter(Boolean)
    )
  );
  const ownerUserId = getActivityOwnerUserId(activity);

  if (ownerUserId && normalizedCurrentUserIds.includes(ownerUserId)) {
    return true;
  }

  const normalizedCurrentUserNames = Array.isArray(currentUserNames)
    ? Array.from(
        new Set(
          currentUserNames
            .map(value => String(value ?? '').trim())
            .filter(Boolean)
        )
      )
    : [];

  if (normalizedCurrentUserNames.length === 0) {
    return false;
  }

  return getActivityOwnerNameCandidates(activity).some(ownerName =>
    normalizedCurrentUserNames.includes(ownerName)
  );
};

export const isActivityJoined = activity => {
  const isJoinedValue = parseBooleanLike(activity?.isJoined);
  if (isJoinedValue === true) {
    return true;
  }

  const legacyJoinedValue = parseBooleanLike(activity?.joined);
  if (legacyJoinedValue === true) {
    return true;
  }

  if (isJoinedValue === false || legacyJoinedValue === false) {
    return false;
  }

  const joinStatusValue = activity?.joinStatus;
  const parsedJoinStatusNumber = Number(joinStatusValue);
  if (Number.isFinite(parsedJoinStatusNumber) && parsedJoinStatusNumber > 0) {
    return true;
  }

  const normalizedJoinStatus = String(joinStatusValue || '').trim();
  if (
    normalizedJoinStatus &&
    JOINED_STATUS_PATTERNS.some(pattern => pattern.test(normalizedJoinStatus))
  ) {
    return true;
  }

  return false;
};

const isActivityResponsePayload = value =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (
    value.id !== undefined ||
    value.isJoined !== undefined ||
    value.joined !== undefined ||
    value.joinCount !== undefined ||
    value.participants !== undefined ||
    value.currentParticipants !== undefined ||
    value.progress !== undefined ||
    value.status !== undefined ||
    value.statusName !== undefined
  );

export const formatActivityDate = value => {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return typeof value === 'string' ? value : '';
  }

  return formatDate(parsedDate, { short: true });
};

export const getActivityImages = activity => {
  const coverCandidates = [
    activity?.coverImage,
    activity?.image,
    activity?.cover,
    activity?.imageUrl,
    activity?.coverUrl,
    activity?.coverImg,
    activity?.poster,
    activity?.posterUrl,
    activity?.thumbnail,
  ];
  const arrayCandidates = [
    activity?.images,
    activity?.imageUrls,
    activity?.bannerImages,
    activity?.gallery,
  ];

  const normalizedImages = [...coverCandidates, ...arrayCandidates]
    .flatMap(extractActivityImageStrings)
    .filter(Boolean);

  return Array.from(new Set(normalizedImages));
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

  const sponsorType = Number(activity?.sponsorType);
  if (sponsorType === 2) {
    return 'team';
  }

  if (sponsorType === 1) {
    return 'personal';
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
  const sponsorType = Number(activity?.sponsorType);
  const sponsorName = activity?.sponsor?.name || activity?.sponsorName || '';
  const sponsorAvatar = normalizeActivityImageUrl(activity?.sponsor?.avatar || activity?.sponsorAvatar || '');
  const teamName = activity?.teamName || '';
  const teamAvatar = normalizeActivityImageUrl(activity?.teamAvatar || '');
  const organizer = sponsorType === 2
    ? teamName || sponsorName || activity?.organizer || activity?.organizerName || ''
    : sponsorName || activity?.organizer || activity?.organizerName || '';
  const type = inferActivityType(activity);
  const status = inferActivityStatus(activity);
  const rawStatusCode = Number(activity?.status ?? activity?.activityStatus);
  const normalizedSponsor = activity?.sponsor && typeof activity.sponsor === 'object'
    ? activity.sponsor
    : {};

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
    joined: isActivityJoined(activity),
    isJoined: isActivityJoined(activity),
    joinStatus: activity.joinStatus ?? null,
    sponsor: {
      ...normalizedSponsor,
      id: normalizedSponsor.id ?? activity?.sponsorId ?? null,
      name: sponsorName,
      avatar: sponsorAvatar,
    },
    sponsorId: normalizedSponsor.id ?? activity?.sponsorId ?? null,
    sponsorName,
    sponsorAvatar,
    sponsorType: Number.isFinite(sponsorType) ? sponsorType : activity?.sponsorType,
    sponsorTypeName: activity?.sponsorTypeName || '',
    teamId: activity?.teamId ?? null,
    teamName,
    teamAvatar,
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

export const getKnownJoinedActivityState = activity => {
  const normalizedActivity = normalizeActivityItem(activity);
  if (!normalizedActivity) {
    return null;
  }

  return {
    ...normalizedActivity,
    joined: true,
    isJoined: true,
    joinStatus: normalizedActivity.joinStatus ?? 1,
  };
};

export const getJoinedActivityStateFromResponse = (activity, responsePayload) => {
  const normalizedActivity = normalizeActivityItem(activity);
  if (!normalizedActivity) {
    return null;
  }

  const responseActivity = [
    responsePayload?.activity,
    responsePayload?.item,
    responsePayload?.record,
    responsePayload?.result,
    responsePayload,
  ].find(isActivityResponsePayload);

  if (!responseActivity) {
    return null;
  }

  return normalizeActivityItem({
    ...normalizedActivity,
    ...responseActivity,
    joined: responseActivity.joined ?? responseActivity.isJoined ?? true,
    isJoined: responseActivity.isJoined ?? responseActivity.joined ?? true,
    joinStatus: responseActivity.joinStatus ?? normalizedActivity.joinStatus ?? 1,
  });
};

export const getQuitActivityStateFromResponse = (activity, responsePayload) => {
  const normalizedActivity = normalizeActivityItem(activity);
  if (!normalizedActivity) {
    return null;
  }

  const responseActivity = [
    responsePayload?.activity,
    responsePayload?.item,
    responsePayload?.record,
    responsePayload?.result,
    responsePayload,
  ].find(isActivityResponsePayload);

  if (!responseActivity) {
    return null;
  }

  return normalizeActivityItem({
    ...normalizedActivity,
    ...responseActivity,
    joined: responseActivity.joined ?? responseActivity.isJoined ?? false,
    isJoined: responseActivity.isJoined ?? responseActivity.joined ?? false,
    joinStatus: responseActivity.joinStatus ?? 0,
  });
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
    joinStatus: 0,
    participants,
    joinCount: participants,
    currentParticipants,
  };
};
