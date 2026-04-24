import React from 'react';
import renderer from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
import TeamDiscussionComposerModal from '../TeamDiscussionComposerModal';
import useMentionComposer from '../../hooks/useMentionComposer';
const EXPECTED_SEND_BUTTON_COLOR = '#f472b6';
const mockNativeAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('../Avatar', () => 'Avatar');
jest.mock('../ComposerImageGrid', () => 'ComposerImageGrid');
jest.mock('../ImagePickerSheet', () => 'ImagePickerSheet');
jest.mock('../MentionSuggestionsPanel', () => 'MentionSuggestionsPanel');
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {
    Images: 'Images',
  },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 12,
    left: 0,
  })),
}));
jest.mock('../../hooks/useRecommendedMentionUsers', () =>
  jest.fn(() => ({
    recommendedMentionUsers: [],
    resetRecommendedMentionUsers: jest.fn(),
  }))
);
jest.mock('../../hooks/useMentionComposer', () =>
  jest.fn(() => ({
    activeMention: null,
    candidateUsers: [],
    focusInput: jest.fn(),
    handleMentionPress: jest.fn(),
    handleMentionSelect: jest.fn(),
    handleSelectionChange: jest.fn(),
    listMaxHeight: 240,
    mentionBottomInset: 0,
    mentionLoading: false,
    panelAnimatedStyle: null,
    panelBottomOffset: 0,
    panelMaxHeight: 240,
    renderMentionPanel: false,
    selection: undefined,
  }))
);
jest.mock('../../utils/toast', () => ({
  showToast: jest.fn(),
}));

describe('TeamDiscussionComposerModal', () => {
  beforeEach(() => {
    mockNativeAlert.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('places the send button in the external bottom toolbar instead of inside the input box', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const inputBox = tree.root.findByProps({
      testID: 'team-discussion-composer-input-box',
    });
    const toolbar = tree.root.findByProps({
      testID: 'team-discussion-composer-toolbar',
    });
    const sendButton = tree.root.findByProps({
      testID: 'team-discussion-composer-send-button',
    });
    const flattenedSendButtonStyle = Array.isArray(sendButton.props.style)
      ? Object.assign({}, ...sendButton.props.style.filter(Boolean))
      : sendButton.props.style;

    expect(toolbar).toBeTruthy();
    expect(
      inputBox.findAll(node => node.props?.testID === 'team-discussion-composer-send-button')
    ).toHaveLength(0);
    expect(flattenedSendButtonStyle.position).toBeUndefined();
    expect(flattenedSendButtonStyle.width).toBe(44);
    expect(flattenedSendButtonStyle.height).toBe(44);
  });

  it('enables publishing as soon as the user types text', async () => {
    const onPublish = jest.fn();
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={onPublish}
        />
      );
    });

    const textInput = tree.root.findByType('TextInput');

    renderer.act(() => {
      textInput.props.onChangeText('测试内容');
    });

    const sendButton = tree.root.findByProps({
      testID: 'team-discussion-composer-send-button',
    });
    const flattenedSendButtonStyle = Array.isArray(sendButton.props.style)
      ? Object.assign({}, ...sendButton.props.style.filter(Boolean))
      : sendButton.props.style;

    expect(sendButton.props.disabled).toBe(false);
    expect(flattenedSendButtonStyle.backgroundColor).toBe(EXPECTED_SEND_BUTTON_COLOR);

    await renderer.act(async () => {
      await sendButton.props.onPress();
    });

    expect(onPublish).toHaveBeenCalledWith('测试内容', []);
  });

  it('keeps the disabled state visibly styled before any content is entered', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const sendButton = tree.root.findByProps({
      testID: 'team-discussion-composer-send-button',
    });
    const flattenedSendButtonStyle = Array.isArray(sendButton.props.style)
      ? Object.assign({}, ...sendButton.props.style.filter(Boolean))
      : sendButton.props.style;

    expect(sendButton.props.disabled).toBe(true);
    expect(flattenedSendButtonStyle.backgroundColor).toBe(EXPECTED_SEND_BUTTON_COLOR);
  });

  it('opens the native source picker without refocusing the input immediately', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const imageButton = tree.root.findByProps({
      testID: 'team-discussion-composer-image-button',
    });

    renderer.act(() => {
      imageButton.props.onPress();
      jest.runOnlyPendingTimers();
    });

    expect(mockNativeAlert).toHaveBeenCalled();
    expect(mockNativeAlert.mock.calls[0][0]).toBe('选择图片');
  });

  it('keeps the source picker dormant until the image button is pressed', () => {
    renderer.act(() => {
      renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    expect(mockNativeAlert).not.toHaveBeenCalled();
  });

  it('uses the custom image picker sheet on Android instead of the native alert', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    let tree;

    try {
      renderer.act(() => {
        tree = renderer.create(
          <TeamDiscussionComposerModal
            visible
            onClose={jest.fn()}
            onPublish={jest.fn()}
          />
        );
      });

      const imageButton = tree.root.findByProps({
        testID: 'team-discussion-composer-image-button',
      });

      renderer.act(() => {
        imageButton.props.onPress();
      });

      expect(mockNativeAlert).not.toHaveBeenCalled();
      expect(tree.root.findAllByType('ImagePickerSheet')).toHaveLength(1);
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('does not render a duplicate publish button in the header', () => {
    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    expect(
      tree.root.findAll(node => node.type === 'Text' && node.props?.children === '发布')
    ).toHaveLength(0);
  });

  it('renders the mention suggestions as the previous horizontal inline strip', () => {
    useMentionComposer.mockReturnValueOnce({
      activeMention: { keyword: '' },
      candidateUsers: [{ id: 1, username: 'tester', name: '测试用户' }],
      focusInput: jest.fn(),
      handleMentionPress: jest.fn(),
      handleMentionSelect: jest.fn(),
      handleSelectionChange: jest.fn(),
      listMaxHeight: 240,
      mentionBottomInset: 12,
      mentionLoading: false,
      panelAnimatedStyle: null,
      panelBottomOffset: 0,
      panelMaxHeight: 240,
      renderMentionPanel: true,
      selection: undefined,
    });

    let tree;

    renderer.act(() => {
      tree = renderer.create(
        <TeamDiscussionComposerModal
          visible
          onClose={jest.fn()}
          onPublish={jest.fn()}
        />
      );
    });

    const mentionPanel = tree.root.findByType('MentionSuggestionsPanel');

    expect(mentionPanel.props.variant).toBe('keyboard-inline');
    expect(mentionPanel.props.placement).toBe('embedded');
    expect(mentionPanel.props.showHeader).toBe(false);
    expect(mentionPanel.props.keyboardInlineContentPadding).toBe(5);
    expect(mentionPanel.props.keyboardInlineTransparentItem).toBe(true);
  });
});
