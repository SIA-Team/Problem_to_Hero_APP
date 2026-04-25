import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import {
  containsEmojiCluster,
  splitTextIntoTwemojiParts,
} from '../utils/twemoji';

export default function TwemojiText({
  text,
  children,
  style,
  emojiSize,
  numberOfLines,
  ...restProps
}) {
  const resolvedText = typeof text === 'string' ? text : typeof children === 'string' ? children : null;
  const parts = React.useMemo(
    () => (resolvedText ? splitTextIntoTwemojiParts(resolvedText) : []),
    [resolvedText]
  );

  if (resolvedText === null || !containsEmojiCluster(resolvedText)) {
    return (
      <Text style={style} numberOfLines={numberOfLines} {...restProps}>
        {text ?? children}
      </Text>
    );
  }

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const resolvedEmojiSize = emojiSize || flattenedStyle.fontSize || 16;

  return (
    <Text style={style} numberOfLines={numberOfLines} {...restProps}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <Text key={`text-${index}`}>{part.value}</Text>;
        }

        return (
          <Image
            key={`emoji-${index}`}
            source={{ uri: part.url }}
            style={{
              width: resolvedEmojiSize,
              height: resolvedEmojiSize,
            }}
          />
        );
      })}
    </Text>
  );
}
