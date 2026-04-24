export const TEAM_DETAIL_TAB_KEYS = Object.freeze({
  DISCUSSION: 'discussion',
  ANNOUNCEMENT: 'announcement',
  APPROVAL: 'approval',
});

const normalizeText = value => String(value ?? '').trim();

const resolveMemberUserId = member =>
  normalizeText(member?.userId) ||
  normalizeText(member?.user_id) ||
  normalizeText(member?.uid) ||
  normalizeText(member?.id) ||
  normalizeText(member?.memberId);

export const resolveTeamDetailTabKey = (value, isLeader = false) => {
  const normalizedValue = normalizeText(value).toLowerCase();
  const allowedTabKeys = isLeader
    ? [
        TEAM_DETAIL_TAB_KEYS.DISCUSSION,
        TEAM_DETAIL_TAB_KEYS.ANNOUNCEMENT,
        TEAM_DETAIL_TAB_KEYS.APPROVAL,
      ]
    : [TEAM_DETAIL_TAB_KEYS.DISCUSSION, TEAM_DETAIL_TAB_KEYS.ANNOUNCEMENT];

  if (allowedTabKeys.includes(normalizedValue)) {
    return normalizedValue;
  }

  return TEAM_DETAIL_TAB_KEYS.DISCUSSION;
};

export const buildTeamMemberProfileRouteParams = (member, from = 'team-detail') => ({
  memberId: normalizeText(member?.memberId) || normalizeText(member?.id),
  userId: resolveMemberUserId(member),
  id: resolveMemberUserId(member),
  name: normalizeText(member?.name),
  avatar: normalizeText(member?.avatar),
  role: normalizeText(member?.role),
  from,
});

export const buildTeamAnnouncementDetailRouteParams = ({
  announcement,
  team,
  from = 'team-detail-announcement-tab',
} = {}) => ({
  announcementId: normalizeText(announcement?.announcementId) || normalizeText(announcement?.id),
  id: normalizeText(announcement?.announcementId) || normalizeText(announcement?.id),
  title: normalizeText(announcement?.title),
  summary: normalizeText(announcement?.summary),
  content: normalizeText(announcement?.content),
  authorName: normalizeText(announcement?.authorName) || normalizeText(announcement?.author),
  author: normalizeText(announcement?.author) || normalizeText(announcement?.authorName),
  createdAt: normalizeText(announcement?.createdAt),
  updatedAt: normalizeText(announcement?.updatedAt),
  isPinned: Boolean(announcement?.isPinned),
  category: normalizeText(announcement?.category),
  viewCount: Number(announcement?.viewCount ?? 0) || 0,
  teamId: normalizeText(announcement?.teamId) || normalizeText(team?.id),
  teamName: normalizeText(announcement?.teamName) || normalizeText(team?.name),
  from,
  returnToTab: TEAM_DETAIL_TAB_KEYS.ANNOUNCEMENT,
  announcement,
});
