import React from 'react';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Colors } from './src/theme/colors';
import { themeService } from './src/services/themeService';
import { notificationService } from './src/services/notificationService';

export default function App() {
  const [Navigator, setNavigator] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await themeService.initializeTheme();
      await notificationService.initialize();
      const navigatorModule = await import('./src/navigation/AppNavigator');
      if (!isMounted) return;
      setNavigator(() => navigatorModule.default);
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Navigator) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <LinearGradient
          colors={Colors.gradientPrimary as any}
          style={{ width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="wallet" size={36} color="#FFF" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.background}
        translucent={false}
      />
      <Navigator />
    </>
  );
}
