import React from 'react';
import renderer from 'react-test-renderer';
import { View } from 'react-native';
import ComposerModalScaffold from '../ComposerModalScaffold';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })),
  initialWindowMetrics: {
    insets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
}));

jest.mock('../KeyboardDismissView', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function MockKeyboardDismissView({ children }) {
    return <View>{children}</View>;
  };
});

describe('ComposerModalScaffold', () => {
  it('renders floating overlays inside the content region so they do not cover the header', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <ComposerModalScaffold
          visible
          onClose={jest.fn()}
          title="写评论"
          footerLeft={<View testID="footer-left" />}
          floatingOverlay={<View testID="floating-overlay" />}
        >
          <View testID="body-content" />
        </ComposerModalScaffold>
      );
    });

    const contentNode = tree.root.findAll(
      node => Array.isArray(node.props?.style) === false && node.props?.style?.position === 'relative'
    )[0];
    const bodyContent = tree.root.findByProps({ testID: 'body-content' });
    const floatingOverlay = tree.root.findByProps({ testID: 'floating-overlay' });

    expect(contentNode).toBeDefined();
    expect(contentNode.findByProps({ testID: 'body-content' })).toBe(bodyContent);
    expect(contentNode.findByProps({ testID: 'floating-overlay' })).toBe(floatingOverlay);
  });
});
