import {
  buildTeamAnnouncementDetailRouteParams,
  buildTeamMemberProfileRouteParams,
  resolveTeamDetailTabKey,
  TEAM_DETAIL_TAB_KEYS,
} from '../teamDetailNavigation';

describe('teamDetailNavigation', () => {
  it('builds member profile params with source context', () => {
    expect(
      buildTeamMemberProfileRouteParams(
        {
          id: 'member-1',
          userId: 'user-1',
          name: 'Alice',
          avatar: 'avatar-url',
          role: '成员',
        },
        'team-member-list'
      )
    ).toEqual({
      memberId: 'member-1',
      userId: 'user-1',
      id: 'user-1',
      name: 'Alice',
      avatar: 'avatar-url',
      role: '成员',
      from: 'team-member-list',
    });
  });

  it('forces unsupported tab requests back to discussion', () => {
    expect(resolveTeamDetailTabKey('approval', false)).toBe(TEAM_DETAIL_TAB_KEYS.DISCUSSION);
    expect(resolveTeamDetailTabKey('announcement', false)).toBe(
      TEAM_DETAIL_TAB_KEYS.ANNOUNCEMENT
    );
  });

  it('builds announcement detail params with return tab context', () => {
    expect(
      buildTeamAnnouncementDetailRouteParams({
        announcement: {
          announcementId: 'announcement-1',
          title: 'Weekly Update',
          content: 'Long form content',
          authorName: 'Bob',
          createdAt: '2026-04-23 10:00',
          isPinned: true,
        },
        team: {
          id: 'team-1',
          name: 'Test Team',
        },
      })
    ).toEqual(
      expect.objectContaining({
        announcementId: 'announcement-1',
        teamId: 'team-1',
        teamName: 'Test Team',
        returnToTab: TEAM_DETAIL_TAB_KEYS.ANNOUNCEMENT,
      })
    );
  });
});
