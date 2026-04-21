import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import AuthScreen from "@/components/auth";
import { NavigationBar } from "@/components/core/NavigationBar";
import { Colors } from "@/constants/colors";
import { initI18n } from "@/i18n";
import { useAuthStore } from "@/store/authStore";
import { StyleSheet, View, Text } from "react-native";

export default function RootLayout() {
  const { isLoggedIn, checkAuth, isLoading } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);

  // const [fontsLoaded, fontError] = useFonts({
  //   InterRegular: Inter_400Regular,
  //   InterMedium: Inter_500Medium,
  //   InterSemiBold: Inter_600SemiBold,
  //   InterBold: Inter_700Bold,
  //   HindSiliguri: require("@/assets/fonts/Hind Siliguri regular.ttf"),
  //   HindSiliguriMedium: require("@/assets/fonts/Hind Siliguri Medium.ttf"),
  //   HindSiliguriSemiBold: require("@/assets/fonts/Hind Siliguri SemiBold.ttf"),
  //   HindSiliguriLight: require("@/assets/fonts/Hind Siliguri Light.ttf"),
  //   HindSiliguribold: require("@/assets/fonts/Hind Siliguri Bold.ttf"),
  // });

  useEffect(() => {
    let active = true;

    async function initialize() {
      await checkAuth(); // Check for existing user token
    }
    
    initialize().then(r => {
      console.info('Auth check completed');
    })

    initI18n().finally(() => {
      if (active) {
        setI18nReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [checkAuth]);

  if (!i18nReady || isLoading) {
    return <Text>fucking loading......</Text>;
  }

  return (
    <>
      {isLoggedIn ? (
        <View style={styles.root}>
          <StatusBar backgroundColor={Colors.dark.background} style="light" />
          <Slot />
          <NavigationBar />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
          <StatusBar backgroundColor={Colors.dark.background} style="light" />
          <AuthScreen />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
