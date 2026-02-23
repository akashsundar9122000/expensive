import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';

export default function App() {
  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.background}
        translucent={false}
      />
      <AppNavigator />
    </>
  );
}
