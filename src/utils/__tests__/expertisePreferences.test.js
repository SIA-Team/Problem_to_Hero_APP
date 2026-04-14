jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

import { getExpertiseCategoryIds } from '../expertisePreferences';

describe('expertisePreferences', () => {
  it('builds category ids from both selected level1 and level2 items', () => {
    expect(
      getExpertiseCategoryIds({
        level1: [
          { id: 1, name: '行业' },
          { id: 2, name: '个人' },
        ],
        level2: [
          { id: 11, name: '互联网', parentId: 1, parentName: '行业' },
          { id: '12', name: '金融', parentId: '1', parentName: '行业' },
        ],
      })
    ).toEqual([1, 2, 11, 12]);
  });

  it('returns an empty array when the user clears all expertise selections', () => {
    expect(getExpertiseCategoryIds({ level1: [], level2: [] })).toEqual([]);
  });
});
