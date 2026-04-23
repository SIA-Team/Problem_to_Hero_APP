import {
  extractGroupIdsFromGroups,
  getGroupIdValue,
  hasGroupIdValue,
  normalizeGroupId,
  normalizeQuestionGroupIdsResponse,
} from '../groupChatGroupId';

describe('groupChatGroupId', () => {
  it('does not coerce empty values into a fake group id of 0', () => {
    expect(normalizeGroupId(null)).toBeNull();
    expect(normalizeGroupId(undefined)).toBeNull();
    expect(normalizeGroupId('')).toBeNull();
    expect(normalizeGroupId('   ')).toBeNull();
    expect(hasGroupIdValue(null)).toBe(false);
    expect(hasGroupIdValue('')).toBe(false);
  });

  it('preserves a real group id of 0 when the backend provides it explicitly', () => {
    expect(normalizeGroupId(0)).toBe(0);
    expect(normalizeGroupId('0')).toBe(0);
    expect(hasGroupIdValue(0)).toBe(true);
    expect(hasGroupIdValue('0')).toBe(true);
    expect(getGroupIdValue({ groupId: 0 })).toBe(0);
    expect(getGroupIdValue({ groupId: '0' })).toBe(0);
  });

  it('filters only truly valid ids from the question group id response', () => {
    const response = {
      data: {
        list: [
          null,
          '',
          '   ',
          { groupId: '' },
          { groupId: null },
          { groupId: '0' },
          { groupId: 12 },
          '15',
        ],
      },
    };

    expect(normalizeQuestionGroupIdsResponse(response)).toEqual([0, 12, 15]);
  });

  it('extracts deduplicated normalized ids from group objects', () => {
    const groups = [
      { groupId: '0' },
      { groupId: 0 },
      { id: '18' },
      { publicGroupId: 18 },
      { questionGroupId: '' },
      { groupNo: null },
    ];

    expect(extractGroupIdsFromGroups(groups)).toEqual([0, 18]);
  });
});
