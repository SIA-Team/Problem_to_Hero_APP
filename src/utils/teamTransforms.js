const TEAM_ROLE_LEADER = '\u961f\u957f';
const TEAM_ROLE_ADMIN = '\u7ba1\u7406\u5458';
const TEAM_ROLE_MEMBER = '\u6210\u5458';
const TEAM_MEMBER_STATUS_APPLYING = 1;
const TEAM_MEMBER_STATUS_APPROVED = 2;
const TEAM_MEMBER_STATUS_REJECTED = 3;
const TEAM_MEMBER_STATUS_EXITED = 4;
const TEAM_MEMBER_STATUS_FROZEN = 5;

const normalizeComparableText = (value) =>
  String(value ?? '').trim().toLowerCase();

const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target ?? {}, key);

const pickString = (target, key, fallback) => {
  if (!hasOwn(target, key)) {
    return fallback;
  }

  const value = String(target?.[key] ?? '').trim();
  return value ? value : fallback;
};

const pickNumber = (target, key, fallback) => {
  if (!hasOwn(target, key)) {
    return fallback;
  }

  const value = target?.[key];
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const normalized = Number(value);
  return Number.isNaN(normalized) ? fallback : normalized;
};

const pickBoolean = (target, key, fallback) => {
  if (!hasOwn(target, key)) {
    return fallback;
  }

  return Boolean(target?.[key]);
};

const pickArray = (target, key, fallback) => {
  if (!hasOwn(target, key) || !Array.isArray(target?.[key])) {
    return fallback;
  }

  return target[key].length > 0 ? target[key] : fallback;
};

export const getRoleKey = (userRole, isJoined) => {
  if (!isJoined) {
    return 'notJoined';
  }

  switch (Number(userRole)) {
    case 3:
      return 'leader';
    case 2:
      return 'admin';
    case 1:
      return 'member';
    default:
      return 'member';
  }
};

export const getStatusMeta = (status, statusDesc) => {
  switch (Number(status)) {
    case 1:
      return {
        text: statusDesc || '\u62db\u52df\u4e2d',
        color: '#22c55e',
      };
    case 2:
      return {
        text: statusDesc || '\u6ee1\u5458',
        color: '#f59e0b',
      };
    case 3:
      return {
        text: statusDesc || '\u5df2\u7ed3\u675f',
        color: '#9ca3af',
      };
    default:
      return {
        text: statusDesc || '\u672a\u77e5\u72b6\u6001',
        color: '#6b7280',
      };
  }
};

export const normalizeQuestionTeam = (team, options = {}) => {
  const currentUserNames = Array.isArray(options?.currentUserNames)
    ? options.currentUserNames
    : [];
  const normalizedCurrentUserNames = currentUserNames
    .map(normalizeComparableText)
    .filter(Boolean);
  const questionIds = Array.isArray(team?.questionIds)
    ? team.questionIds
        .filter((id) => id !== undefined && id !== null && id !== '')
        .map((id) => String(id))
    : [];
  const fallbackQuestionId = questionIds[0] ?? '';
  const questionId = String(team?.questionId ?? fallbackQuestionId ?? '');
  const creatorName = team?.creatorName || '-';
  const isCreator =
    options?.forceCreatorMembership === true ||
    normalizedCurrentUserNames.includes(normalizeComparableText(creatorName));
  const rawUserRole = Number(team?.userRole) || 0;
  const userRole = rawUserRole || (isCreator ? 3 : 0);
  const myMemberStatus = Number(team?.myMemberStatus) || 0;
  const joinedByMemberStatus = myMemberStatus === TEAM_MEMBER_STATUS_APPROVED;
  const isJoined =
    Boolean(team?.isJoined) || userRole > 0 || joinedByMemberStatus || isCreator;
  const isPending =
    !isJoined &&
    (Boolean(team?.isPending) || myMemberStatus === TEAM_MEMBER_STATUS_APPLYING);
  const role = getRoleKey(userRole, isJoined);
  const statusMeta = getStatusMeta(team?.status, team?.statusDesc);
  const questionCount = questionIds.length || (questionId ? 1 : 0);

  return {
    id: String(team?.id ?? ''),
    questionId,
    questionIds,
    questionCount,
    name: team?.name || '',
    description: team?.description || '',
    avatar: team?.avatar || '',
    memberCount: Number(team?.memberCount) || 0,
    maxMembers: Number(team?.maxMembers) || 0,
    status: Number(team?.status) || 0,
    statusDesc: statusMeta.text,
    creatorName,
    isCreator,
    isJoined,
    isPending,
    userRole,
    myMemberStatus,
    isRejected: myMemberStatus === TEAM_MEMBER_STATUS_REJECTED,
    isExited: myMemberStatus === TEAM_MEMBER_STATUS_EXITED,
    isFrozen: myMemberStatus === TEAM_MEMBER_STATUS_FROZEN,
    role,
    isLeader: role === 'leader',
    isAdmin: role === 'leader' || role === 'admin',
    statusColor: statusMeta.color,
  };
};

export const normalizeMyTeam = (team) => {
  const normalized = normalizeQuestionTeam(team);

  return {
    id: normalized.id,
    questionId: normalized.questionId,
    questionIds: normalized.questionIds,
    name: normalized.name,
    avatar: normalized.avatar,
    role: normalized.isLeader
      ? TEAM_ROLE_LEADER
      : normalized.role === 'admin'
        ? TEAM_ROLE_ADMIN
        : TEAM_ROLE_MEMBER,
    members: normalized.memberCount,
    questions: normalized.questionCount,
    description: normalized.description,
    createdAt: '',
    isActive: normalized.status === 1,
    creatorId: normalized.isLeader ? 1 : 0,
    currentUserId: normalized.isLeader ? 1 : normalized.isAdmin ? 2 : -1,
    isAdmin: normalized.isAdmin,
    status: normalized.status,
    statusDesc: normalized.statusDesc,
    maxMembers: normalized.maxMembers,
    userRole: normalized.userRole,
    memberCount: normalized.memberCount,
    myMemberStatus: normalized.myMemberStatus,
    isJoined: normalized.isJoined,
  };
};

export const mapTeamToDetailRoute = (team) => {
  const memberCount = Number(team?.memberCount ?? team?.members) || 0;
  const questionCount = Number(team?.questionCount ?? team?.questions) || 0;
  const isLeader = Boolean(team?.isLeader) || team?.role === TEAM_ROLE_LEADER;
  const isAdmin = Boolean(team?.isAdmin) || isLeader || team?.role === TEAM_ROLE_ADMIN;

  return {
    team: {
      id: String(team?.id ?? ''),
      questionId: String(team?.questionId ?? ''),
      questionIds: Array.isArray(team?.questionIds) ? team.questionIds : [],
      name: team?.name || '',
      avatar: team?.avatar || '',
      role: isLeader ? TEAM_ROLE_LEADER : isAdmin ? TEAM_ROLE_ADMIN : TEAM_ROLE_MEMBER,
      members: memberCount,
      questions: questionCount,
      description: team?.description || '',
      createdAt: team?.createdAt || '',
      isActive: Boolean(team?.isActive ?? team?.statusDesc),
      creatorId: isLeader ? 1 : 0,
      currentUserId: isLeader ? 1 : isAdmin ? 2 : -1,
      isAdmin,
      isLeader,
      status: Number(team?.status) || 0,
      statusDesc: team?.statusDesc || '',
      statusColor: team?.statusColor || '',
      maxMembers: Number(team?.maxMembers) || 0,
      creatorName: team?.creatorName || '',
      userRole: Number(team?.userRole) || 0,
      myMemberStatus: Number(team?.myMemberStatus) || 0,
      memberCount,
      questionCount,
    },
    isJoined: team?.isJoined !== undefined ? Boolean(team.isJoined) : true,
    isPending: Boolean(team?.isPending),
    restrictedView: Boolean(team?.restrictedView) || team?.isJoined === false,
  };
};

export const buildTeamDetailRouteState = (detailTeam, fallbackRoute = {}) => {
  const fallbackTeam = fallbackRoute?.team || {};

  if (!detailTeam) {
    return {
      team: fallbackTeam,
      isJoined: fallbackRoute?.isJoined,
      isPending: fallbackRoute?.isPending,
      restrictedView: Boolean(fallbackRoute?.restrictedView),
    };
  }

  const normalizedDetail = normalizeQuestionTeam(detailTeam);
  const mappedDetail = mapTeamToDetailRoute(normalizedDetail);

  return {
    ...fallbackRoute,
    ...mappedDetail,
    team: {
      ...fallbackTeam,
      ...mappedDetail.team,
      id: pickString(detailTeam, 'id', fallbackTeam.id),
      questionId: pickString(
        detailTeam,
        'questionId',
        fallbackTeam.questionId || normalizedDetail.questionId
      ),
      questionIds: pickArray(
        detailTeam,
        'questionIds',
        fallbackTeam.questionIds || normalizedDetail.questionIds
      ),
      name: pickString(detailTeam, 'name', fallbackTeam.name),
      description: pickString(detailTeam, 'description', fallbackTeam.description),
      avatar: pickString(detailTeam, 'avatar', fallbackTeam.avatar),
      role: mappedDetail.team.role || fallbackTeam.role,
      members: pickNumber(
        detailTeam,
        'memberCount',
        fallbackTeam.members ?? fallbackTeam.memberCount ?? 0
      ),
      memberCount: pickNumber(
        detailTeam,
        'memberCount',
        fallbackTeam.memberCount ?? fallbackTeam.members ?? 0
      ),
      questions: Array.isArray(detailTeam?.questionIds)
        ? detailTeam.questionIds.length
        : fallbackTeam.questions ?? fallbackTeam.questionCount ?? normalizedDetail.questionCount,
      questionCount: Array.isArray(detailTeam?.questionIds)
        ? detailTeam.questionIds.length
        : fallbackTeam.questionCount ?? fallbackTeam.questions ?? normalizedDetail.questionCount,
      isActive: hasOwn(detailTeam, 'status')
        ? Number(detailTeam.status) === 1
        : Boolean(fallbackTeam.isActive),
      isAdmin: normalizedDetail.isAdmin,
      isLeader: normalizedDetail.isLeader,
      status: pickNumber(detailTeam, 'status', fallbackTeam.status ?? 0),
      statusDesc: pickString(detailTeam, 'statusDesc', fallbackTeam.statusDesc),
      statusColor: normalizedDetail.statusColor || fallbackTeam.statusColor,
      maxMembers: pickNumber(detailTeam, 'maxMembers', fallbackTeam.maxMembers ?? 0),
      creatorName: pickString(detailTeam, 'creatorName', fallbackTeam.creatorName),
      userRole: pickNumber(detailTeam, 'userRole', fallbackTeam.userRole ?? 0),
      myMemberStatus: pickNumber(
        detailTeam,
        'myMemberStatus',
        fallbackTeam.myMemberStatus ?? 0
      ),
      isJoined: pickBoolean(detailTeam, 'isJoined', fallbackTeam.isJoined),
      isPending: normalizedDetail.isPending,
    },
    isJoined: pickBoolean(detailTeam, 'isJoined', fallbackRoute?.isJoined),
    isPending: normalizedDetail.isPending || Boolean(fallbackRoute?.isPending),
    restrictedView:
      Boolean(fallbackRoute?.restrictedView) ||
      !pickBoolean(detailTeam, 'isJoined', fallbackRoute?.isJoined),
  };
};
