import React from 'react';
import renderer from 'react-test-renderer';
import { ScrollView } from 'react-native';
import IdentitySelector from '../IdentitySelector';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../i18n/withTranslation', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (key === 'components.identitySelector.selectedCount') {
        return `{count}`;
      }

      return key;
    },
  }),
}));

describe('IdentitySelector', () => {
  it('keeps team list interactions available while the keyboard stays open', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(<IdentitySelector selectedIdentity="team" />);
    });

    const teamList = tree.root.findByType(ScrollView);

    expect(teamList.props.keyboardShouldPersistTaps).toBe('handled');
    expect(teamList.props.keyboardDismissMode).toBe('none');
    expect(teamList.props.nestedScrollEnabled).toBe(true);
  });
});
