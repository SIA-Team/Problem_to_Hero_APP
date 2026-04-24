import {
  createLocalTeamAnnouncement,
  getTeamAnnouncementById,
  getTeamAnnouncements,
  getTeamMembers,
} from '../teamDetailService';

describe('teamDetailService', () => {
  it('normalizes team members from mixed sources', () => {
    const members = getTeamMembers({
      teamId: 'team-1',
      members: [
        {
          id: 'member-1',
          userId: 'user-1',
          nickName: 'Alice',
          roleName: 'leader',
        },
      ],
    });

    expect(members).toEqual([
      expect.objectContaining({
        id: 'member-1',
        userId: 'user-1',
        name: 'Alice',
        role: '队长',
      }),
    ]);
  });

  it('uses full announcement content when opening detail data', () => {
    const announcements = getTeamAnnouncements({
      teamId: 'team-1',
      teamName: 'Test Team',
      announcements: [
        {
          announcementId: 'announcement-1',
          title: 'Weekly Update',
          summary: 'Short summary',
          content: 'Long form content',
          authorName: 'Bob',
          createdAt: '2026-04-23 10:00',
        },
      ],
    });

    const detail = getTeamAnnouncementById({
      announcementId: 'announcement-1',
      announcements,
      teamId: 'team-1',
      teamName: 'Test Team',
    });

    expect(detail).toEqual(
      expect.objectContaining({
        announcementId: 'announcement-1',
        content: 'Long form content',
        teamName: 'Test Team',
      })
    );
  });

  it('creates a local announcement payload ready for routing', () => {
    const announcement = createLocalTeamAnnouncement({
      title: 'New Notice',
      content: 'Mock content',
      isPinned: true,
      teamId: 'team-1',
      teamName: 'Test Team',
      authorName: 'Current User',
    });

    expect(announcement).toEqual(
      expect.objectContaining({
        title: 'New Notice',
        content: 'Mock content',
        isPinned: true,
        teamId: 'team-1',
        teamName: 'Test Team',
        authorName: 'Current User',
      })
    );
  });
});
