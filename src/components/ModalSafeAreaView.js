import React from 'react';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

export default function ModalSafeAreaView({
  children,
  style,
  edges = ['top', 'bottom'],
}) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={style} edges={edges}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
