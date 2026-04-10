import teamApi from '../services/api/teamApi';

export const FALLBACK_TEAM_MEMBERS = [
  {
    id: 1,
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
    role: '队长',
  },
  {
    id: 2,
    name: '李四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
    role: '成员',
  },
  {
    id: 3,
    name: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
    role: '成员',
  },
  {
    id: 4,
    name: '赵六',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member4',
    role: '成员',
  },
  {
    id: 5,
    name: '孙七',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member5',
    role: '成员',
  },
  {
    id: 6,
    name: '周八',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member6',
    role: '成员',
  },
  {
    id: 7,
    name: '吴九',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member7',
    role: '成员',
  },
  {
    id: 8,
    name: '郑十',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member8',
    role: '成员',
  },
  {
    id: 9,
    name: '钱十一',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member9',
    role: '成员',
  },
  {
    id: 10,
    name: '陈十二',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member10',
    role: '成员',
  },
  {
    id: 11,
    name: '林十三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member11',
    role: '成员',
  },
  {
    id: 12,
    name: '黄十四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member12',
    role: '成员',
  },
];

const TEAM_ROLE_LEADER_VALUE = 3;
const TEAM_ROLE_ADMIN_VALUE = 2;

export const normalizeTransferLeaderCandidate = (member) => {
  const rawUserId =
    member?.userId ?? member?.memberUserId ?? member?.targetUserId ?? member?.id;
  const userId = Number(rawUserId) || 0;
  const userRole =
    Number(member?.userRole ?? member?.roleValue ?? member?.roleType) || 0;
  const roleLabel =
    member?.role ||
    (userRole === TEAM_ROLE_LEADER_VALUE
      ? '队长'
      : userRole === TEAM_ROLE_ADMIN_VALUE
        ? '管理员'
        : '成员');
  const isLeader = userRole === TEAM_ROLE_LEADER_VALUE || roleLabel === '队长';

  return {
    id: String(member?.id ?? userId ?? ''),
    userId,
    name:
      member?.name ||
      member?.userName ||
      member?.nickName ||
      member?.nickname ||
      '-',
    avatar: member?.avatar || member?.userAvatar || '',
    role: roleLabel,
    isLeader,
  };
};

export const getTransferLeaderCandidates = (
  sources = [],
  fallbackMembers = FALLBACK_TEAM_MEMBERS
) => {
  for (const source of sources) {
    if (!Array.isArray(source) || source.length === 0) {
      continue;
    }

    const normalizedMembers = source
      .map(normalizeTransferLeaderCandidate)
      .filter((member) => member.userId > 0 && !member.isLeader);

    return normalizedMembers;
  }

  return fallbackMembers
    .map(normalizeTransferLeaderCandidate)
    .filter((member) => member.userId > 0 && !member.isLeader);
};

export const executeTeamExitFlow = async ({ teamId, newCaptainUserId }) => {
  const normalizedTeamId = Number(teamId);

  if (!Number.isFinite(normalizedTeamId) || normalizedTeamId <= 0) {
    throw new Error('团队ID无效');
  }

  const normalizedNewCaptainUserId =
    newCaptainUserId !== undefined && newCaptainUserId !== null && newCaptainUserId !== ''
      ? Number(newCaptainUserId) || 0
      : undefined;

  if (normalizedNewCaptainUserId) {
    const transferResponse = await teamApi.transferCaptain(
      normalizedTeamId,
      normalizedNewCaptainUserId
    );
    const transferSuccess =
      transferResponse?.code === 0 || transferResponse?.code === 200;

    if (!transferSuccess) {
      throw new Error(transferResponse?.msg || 'Failed to transfer team captain');
    }
  }

  const leaveResponse = await teamApi.leaveTeam(
    normalizedTeamId,
    normalizedNewCaptainUserId
  );
  const leaveSuccess = leaveResponse?.code === 0 || leaveResponse?.code === 200;

  if (!leaveSuccess) {
    throw new Error(leaveResponse?.msg || 'Failed to leave team');
  }

  return {
    transferResponse:
      normalizedNewCaptainUserId !== undefined ? true : false,
    leaveResponse,
  };
};
