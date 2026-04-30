jest.mock('../../config/env', () => ({
  getApiServerUrl: jest.fn(() => 'http://example.com'),
}));

jest.mock('../../i18n', () => ({
  locale: 'zh',
  t: key => key,
}));

import {
  getQuitActivityState,
  getQuitActivityStateFromResponse,
  isActivityOwnedByCurrentUser,
  isActivityJoined,
  normalizeActivityItem,
} from '../activityUtils';

describe('activity quit helpers', () => {
  it('uses response payload when cancel api returns updated activity fields', () => {
    const activity = {
      id: 7,
      title: 'City Cleanup',
      joined: true,
      isJoined: true,
      currentParticipants: 8,
      joinCount: 8,
      status: 'active',
    };

    const nextActivity = getQuitActivityStateFromResponse(activity, {
      activity: {
        id: 7,
        isJoined: false,
        currentParticipants: 6,
        joinCount: 6,
        statusName: 'Open',
      },
    });

    expect(nextActivity).toMatchObject({
      id: 7,
      joined: false,
      isJoined: false,
      currentParticipants: 6,
      joinCount: 6,
      participants: 6,
      statusName: 'Open',
    });
  });

  it('falls back to local decrement when cancel api data is empty', () => {
    const activity = {
      id: 9,
      joined: true,
      isJoined: true,
      currentParticipants: 3,
      joinCount: 3,
    };

    expect(getQuitActivityState(activity)).toMatchObject({
      id: 9,
      joined: false,
      isJoined: false,
      currentParticipants: 2,
      joinCount: 2,
      participants: 2,
    });
  });

  it('treats explicit quit flags as higher priority than stale joinStatus', () => {
    expect(isActivityJoined({
      id: 11,
      joined: false,
      isJoined: false,
      joinStatus: 1,
    })).toBe(false);

    expect(getQuitActivityState({
      id: 12,
      joined: true,
      isJoined: true,
      joinStatus: 1,
      currentParticipants: 4,
      joinCount: 4,
    })).toMatchObject({
      joined: false,
      isJoined: false,
      joinStatus: 0,
    });
  });

  it('detects organizer ownership by user id first and falls back to exact name match', () => {
    expect(isActivityOwnedByCurrentUser(
      {
        id: 15,
        creatorId: 321,
        organizerName: '活动发起人',
      },
      {
        currentUserId: '321',
        currentUserNames: ['别的名字'],
      }
    )).toBe(true);

    expect(isActivityOwnedByCurrentUser(
      {
        id: 16,
        organizerName: 'Alice',
      },
      {
        currentUserId: '',
        currentUserNames: ['Alice', 'alice01'],
      }
    )).toBe(true);

    expect(isActivityOwnedByCurrentUser(
      {
        id: 17,
        organizerName: 'Bob',
      },
      {
        currentUserId: '999',
        currentUserNames: ['Alice'],
      }
    )).toBe(false);
  });

  it('treats createBy as a display name fallback instead of blocking ownership by id mismatch', () => {
    expect(isActivityOwnedByCurrentUser(
      {
        id: 18,
        createBy: 'alice',
      },
      {
        currentUserId: '1001',
        currentUserNames: ['alice'],
      }
    )).toBe(true);

    expect(isActivityOwnedByCurrentUser(
      {
        id: 19,
        userId: '2002',
        createBy: 'alice',
      },
      {
        currentUserId: '1001',
        currentUserNames: ['alice'],
      }
    )).toBe(true);
  });

  it('maps activity center list sponsor fields as the primary organizer contract', () => {
    const normalized = normalizeActivityItem({
      id: 20,
      title: 'Center List Activity',
      description: 'Mapped from center/list fields',
      type: 1,
      typeName: 'Online',
      startTime: '2026-04-01 10:00:00',
      endTime: '2026-04-01 12:00:00',
      joinCount: 5,
      currentParticipants: 4,
      coverImage: '/cover.png',
      images: ['/a.png', '/b.png'],
      isOfficial: false,
      tags: ['featured'],
      location: 'Online room',
      maxParticipants: 10,
      rules: 'Be kind',
      status: 2,
      statusName: 'Open',
      isJoined: false,
      joinStatus: '',
      sponsor: {
        id: 123,
        name: 'Alice',
        avatar: '/avatar.png',
      },
      sponsorType: 1,
      sponsorTypeName: 'Personal',
      teamId: 0,
      teamName: '',
      teamAvatar: '',
      questionId: 99,
      questionTitle: 'Question title',
      userId: 999,
    });

    expect(normalized).toMatchObject({
      id: 20,
      title: 'Center List Activity',
      desc: 'Mapped from center/list fields',
      type: 'online',
      typeName: 'Online',
      participants: 5,
      joinCount: 5,
      currentParticipants: 4,
      status: 'active',
      statusCode: 2,
      statusName: 'Open',
      joined: false,
      isJoined: false,
      joinStatus: '',
      sponsorId: 123,
      sponsorName: 'Alice',
      sponsorAvatar: 'http://example.com/avatar.png',
      sponsorType: 1,
      sponsorTypeName: 'Personal',
      organizer: 'Alice',
      organizerName: 'Alice',
      organizerType: 'personal',
      address: 'Online room',
      location: 'Online room',
      reward: '',
      rules: 'Be kind',
      tags: ['featured'],
      questionId: 99,
      questionTitle: 'Question title',
    });

    expect(normalized.coverImage).toBe('http://example.com/cover.png');
    expect(normalized.images).toEqual([
      'http://example.com/cover.png',
      'http://example.com/a.png',
      'http://example.com/b.png',
    ]);
    expect(isActivityOwnedByCurrentUser(normalized, {
      currentUserId: '123',
      currentUserNames: [],
    })).toBe(true);
  });

  it('uses team fields for display while keeping sponsor id as the owner user id', () => {
    const normalized = normalizeActivityItem({
      id: 21,
      title: 'Team Activity',
      type: 2,
      sponsor: {
        id: 456,
        name: 'Captain',
        avatar: '/captain.png',
      },
      sponsorType: 2,
      sponsorTypeName: 'Team',
      teamId: 88,
      teamName: 'Builders',
      teamAvatar: '/team.png',
      joinCount: 2,
      status: 4,
    });

    expect(normalized).toMatchObject({
      type: 'offline',
      organizer: 'Builders',
      organizerName: 'Builders',
      organizerType: 'team',
      sponsorId: 456,
      sponsorName: 'Captain',
      teamId: 88,
      teamName: 'Builders',
      teamAvatar: 'http://example.com/team.png',
    });

    expect(isActivityOwnedByCurrentUser(normalized, {
      currentUserId: '456',
      currentUserNames: [],
    })).toBe(true);
  });

  it('matches sponsor id against any known current user id candidate', () => {
    expect(isActivityOwnedByCurrentUser(
      {
        id: 22,
        sponsor: {
          id: 789,
          name: 'Alice',
        },
      },
      {
        currentUserId: '',
        currentUserIds: ['100', '789'],
        currentUserNames: [],
      }
    )).toBe(true);
  });
});
