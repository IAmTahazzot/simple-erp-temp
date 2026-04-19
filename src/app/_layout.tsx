import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { Header } from '@/components/core/Header';
import { NavigationBar } from '@/components/core/NavigationBar';
import { Colors } from '@/constants/colors';
import { initI18n } from '@/i18n';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    HindSiliguri: require('@/assets/fonts/Hind Siliguri regular.ttf'),
    HindSiliguriMedium: require('@/assets/fonts/Hind Siliguri Medium.ttf'),
    HindSiliguriSemiBold: require('@/assets/fonts/Hind Siliguri SemiBold.ttf'),
    HindSiliguriLight: require('@/assets/fonts/Hind Siliguri Light.ttf'),
    HindSiliguribold: require('@/assets/fonts/Hind Siliguri Bold.ttf'),
  })

  useEffect(() => {
    let active = true;

    initI18n().finally(() => {
      if (active) {
        setI18nReady(true);
      }
    });

    //setAppLanguage('en')

    return () => {
      active = false;
    };

  }, []);

  if (!fontsLoaded || !i18nReady) {
    return null;
  }


  return (
    <>
      <StatusBar backgroundColor={Colors.light.background} style='dark' translucent={false} />
      <View style={styles.root}>
        <Header />
        <ScrollView style={styles.scrollView}>
          <Slot />
        </ScrollView>
        <NavigationBar />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
});