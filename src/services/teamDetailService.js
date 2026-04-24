import {
  TEAM_DETAIL_MOCK_ANNOUNCEMENTS,
  TEAM_DETAIL_MOCK_MEMBERS,
  TEAM_MEMBER_ROLE_LEADER,
  TEAM_MEMBER_ROLE_MEMBER,
} from '../data/teamDetailMockData';

const normalizeText = value => String(value ?? '').trim();

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

const pickFirstArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }

  return [];
};

const normalizeMemberRole = value => {
  const normalizedValue = normalizeText(value);

  if (
    normalizedValue === TEAM_MEMBER_ROLE_LEADER ||
    normalizedValue.toLowerCase() === 'leader'
  ) {
    return TEAM_MEMBER_ROLE_LEADER;
  }

  return normalizedValue || TEAM_MEMBER_ROLE_MEMBER;
};

const normalizeMember = (member, { teamId, index }) => {
  const fallbackId = `mock-member-${teamId || 'team'}-${index + 1}`;
  const userId = pickFirstNonEmpty(
    member?.userId,
    member?.user_id,
    member?.uid,
    member?.id
  );
  const memberId = pickFirstNonEmpty(member?.memberId, member?.member_id, member?.id, fallbackId);
  const id = pickFirstNonEmpty(member?.id, memberId, userId, fallbackId);

  return {
    id,
    memberId,
    userId: userId || memberId,
    name: pickFirstNonEmpty(member?.name, member?.nickName, member?.nickname, member?.userName, '匿名成员'),
    avatar: pickFirstNonEmpty(member?.avatar, member?.userAvatar, member?.headImg),
    role: normalizeMemberRole(member?.role ?? member?.roleName),
  };
};

const normalizeAnnouncement = (announcement, { teamId, teamName, index }) => {
  const fallbackId = `mock-announcement-${teamId || 'team'}-${index + 1}`;
  const id = pickFirstNonEmpty(
    announcement?.announcementId,
    announcement?.id,
    fallbackId
  );
  const title = pickFirstNonEmpty(announcement?.title, '未命名公告');
  const content = pickFirstNonEmpty(announcement?.content, announcement?.summary, '暂无公告内容');

  return {
    id,
    announcementId: id,
    teamId: pickFirstNonEmpty(announcement?.teamId, teamId),
    teamName: pickFirstNonEmpty(announcement?.teamName, teamName),
    title,
    summary: pickFirstNonEmpty(announcement?.summary, content),
    content,
    author: pickFirstNonEmpty(
      announcement?.author,
      announcement?.authorName,
      announcement?.publisher,
      '团队管理员'
    ),
    authorName: pickFirstNonEmpty(
      announcement?.authorName,
      announcement?.author,
      announcement?.publisher,
      '团队管理员'
    ),
    createdAt: pickFirstNonEmpty(
      announcement?.createdAt,
      announcement?.publishTime,
      announcement?.time,
      '未知时间'
    ),
    updatedAt: pickFirstNonEmpty(
      announcement?.updatedAt,
      announcement?.modifiedAt,
      announcement?.createdAt,
      announcement?.publishTime,
      '未知时间'
    ),
    isPinned: Boolean(announcement?.isPinned),
    category: pickFirstNonEmpty(announcement?.category, '团队公告'),
    viewCount: Number(announcement?.viewCount ?? announcement?.readCount ?? 0) || 0,
  };
};

export const getTeamMembers = ({ teamId, routeMembers, detailMembers, members } = {}) => {
  const sourceMembers = pickFirstArray(members, detailMembers, routeMembers);
  const fallbackMembers = sourceMembers.length > 0 ? sourceMembers : TEAM_DETAIL_MOCK_MEMBERS;

  return fallbackMembers.map((member, index) => normalizeMember(member, { teamId, index }));
};

export const getTeamAnnouncements = ({ teamId, teamName, announcements } = {}) => {
  const sourceAnnouncements = Array.isArray(announcements) ? announcements : [];
  const fallbackAnnouncements =
    sourceAnnouncements.length > 0 ? sourceAnnouncements : TEAM_DETAIL_MOCK_ANNOUNCEMENTS;

  return fallbackAnnouncements.map((announcement, index) =>
    normalizeAnnouncement(announcement, { teamId, teamName, index })
  );
};

export const getTeamAnnouncementById = ({
  announcementId,
  announcement,
  announcements,
  teamId,
  teamName,
} = {}) => {
  if (announcement && typeof announcement === 'object') {
    return normalizeAnnouncement(announcement, { teamId, teamName, index: 0 });
  }

  const normalizedAnnouncementId = normalizeText(announcementId);
  const announcementList = getTeamAnnouncements({ teamId, teamName, announcements });

  if (!normalizedAnnouncementId) {
    return announcementList[0] || null;
  }

  return (
    announcementList.find(item => normalizeText(item.announcementId) === normalizedAnnouncementId) ||
    announcementList.find(item => normalizeText(item.id) === normalizedAnnouncementId) ||
    null
  );
};

export const createLocalTeamAnnouncement = ({
  title,
  content,
  isPinned = false,
  teamId,
  teamName,
  authorName = '当前用户',
} = {}) =>
  normalizeAnnouncement(
    {
      announcementId: `announcement-${Date.now()}`,
      title,
      summary: content,
      content,
      author: authorName,
      authorName,
      createdAt: new Date().toLocaleString('zh-CN', {
        hour12: false,
      }),
      updatedAt: new Date().toLocaleString('zh-CN', {
        hour12: false,
      }),
      isPinned,
      category: '团队公告',
      viewCount: 0,
      teamId,
      teamName,
    },
    { teamId, teamName, index: 0 }
  );
