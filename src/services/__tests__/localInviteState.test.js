jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOCAL_INVITE_STATUSES,
  getLocalInviteStatusText,
  isCompletedLocalInviteStatus,
  loadQuestionLocalInvites,
  saveQuestionLocalInvite,
} from '../localInviteState';

describe('localInviteState', () => {
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

  it('stores local invites after a question invite is sent', async () => {
    const savedRecord = await saveQuestionLocalInvite('question-1', {
      userId: '1001',
      username: 'coder001',
      nickName: '小王',
      profession: 'Python 开发',
      answerCount: 12,
    }, {
      inviteText: 'invite text',
    });

    expect(savedRecord).toEqual(expect.objectContaining({
      id: '1001',
      username: 'coder001',
      status: LOCAL_INVITE_STATUSES.INVITED,
      statusText: '已邀请',
      inviteText: 'invite text',
    }));

    const storedList = await loadQuestionLocalInvites('question-1');
    expect(storedList).toEqual([
      expect.objectContaining({
        id: '1001',
        nickName: '小王',
        statusText: '已邀请',
      }),
    ]);
  });

  it('returns invite status text for local invites', () => {
    expect(getLocalInviteStatusText(LOCAL_INVITE_STATUSES.INVITED)).toBe('已邀请');
    expect(getLocalInviteStatusText(LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE)).toBe('待重试');
    expect(getLocalInviteStatusText('')).toBe('已邀请');
    expect(isCompletedLocalInviteStatus(LOCAL_INVITE_STATUSES.INVITED)).toBe(true);
    expect(isCompletedLocalInviteStatus(LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE)).toBe(false);
  });
});
