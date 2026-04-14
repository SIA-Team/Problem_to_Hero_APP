jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTwitterInviteStatusText,
  loadQuestionTwitterInvites,
  saveQuestionTwitterInvite,
} from '../twitterInviteState';

describe('twitterInviteState', () => {
  const storage = new Map();

  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();

    AsyncStorage.getItem.mockImplementation(async key => {
      return storage.has(key) ? storage.get(key) : null;
    });

    AsyncStorage.setItem.mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
  });

  it('stores twitter invites as initiated records for a question', async () => {
    const savedRecord = await saveQuestionTwitterInvite('question-1', {
      id: 'elonmusk',
      name: '@elonmusk',
      followers: '2.36亿粉丝',
      avatar: 'https://unavatar.io/x/elonmusk',
    }, {
      inviteText: 'test invite text',
      openedVia: 'browser',
    });

    expect(savedRecord).toEqual(expect.objectContaining({
      id: 'elonmusk',
      name: '@elonmusk',
      status: 'initiated',
      statusText: '已发起邀请',
      inviteText: 'test invite text',
      openedVia: 'browser',
    }));

    const storedList = await loadQuestionTwitterInvites('question-1');
    expect(storedList).toEqual([
      expect.objectContaining({
        id: 'elonmusk',
        statusText: '已发起邀请',
      }),
    ]);
  });

  it('updates an existing user invite instead of duplicating it', async () => {
    await saveQuestionTwitterInvite('question-2', {
      id: 'sama',
      name: '@sama',
    });

    await saveQuestionTwitterInvite('question-2', {
      id: 'sama',
      name: '@sama',
      followers: '440万粉丝',
    }, {
      openedVia: 'app',
    });

    const storedList = await loadQuestionTwitterInvites('question-2');

    expect(storedList).toHaveLength(1);
    expect(storedList[0]).toEqual(expect.objectContaining({
      id: 'sama',
      followers: '440万粉丝',
      openedVia: 'app',
      statusText: '已发起邀请',
    }));
  });

  it('returns user-facing status text for initiated invites', () => {
    expect(getTwitterInviteStatusText('initiated')).toBe('已发起邀请');
    expect(getTwitterInviteStatusText('invited')).toBe('已邀请');
  });
});
