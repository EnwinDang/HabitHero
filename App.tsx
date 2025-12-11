// @ts-nocheck
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStateProvider } from './src/context/AppStateContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}

