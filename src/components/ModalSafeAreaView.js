import React from 'react';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

export default function ModalSafeAreaView({
  children,
  style,
  edges = ['top', 'bottom'],
}) {
  return (
    <SafeAreaView style={style} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
