import {DEFAULT_HEADER_HEIGHT} from "@/constants"
import {StyleSheet, Text, View, ToastAndroid, Animated, Easing} from "react-native"
import React from 'react';
import {useEffect, useState, useCallback, useRef} from 'react';
import {setAppLanguage} from '@/i18n';
import {type AppLanguage} from '@/i18n/resources';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import {useAuthStore} from '@/store/authStore';
import {AlertDialog} from '@/components/ui/AlertDialog'
import {Rocket} from 'lucide-react-native'
import {ShadcnAlert} from '@/components/ui/ShadcnAlert';
import {Drawer} from '@/components/ui/Drawer';
import {Select} from '@/components/ui/Select'
import {Button} from '@/components/ui/Button';
import {LogOut, RefreshCcw, Languages} from 'lucide-react-native'
import {sync} from '@/database/sync'

export const MainHeader = () => {
  const {t, i18n} = useCommonTranslation()
  const [isSyncing, setIsSyncing] = useState(false);
  const logOut = useAuthStore(state => state.logout)
  const [showLogoutWarning, setShowLogoutWarning] = useState(false)

  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [isSyncing, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };

  const user = useAuthStore((state) => state.user)

  return (
    <View style={styles.headerContainer}>
      <View style={styles.greetingsContainer}>
        <View style={styles.profileGreetingWrapper}>
          {/*<Image source={require('@/assets/placeholders/profile.png')} style={{ width: 30, height: 30, borderRadius: 20 }} />*/}
          <Text style={styles.greetingTitle}>Welcome {user?.name || 'Anonymous'}</Text>
        </View>
      </View>
      <View style={styles.actionContainer}>
        <Button size={'icon'}
                hitSlop={20}
                rightIcon={
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <RefreshCcw size={20} color={'white'} onPress={async () => {
                      if (isSyncing) return;
                      setIsSyncing(true)
                      sync().catch(() => {
                        // ToastAndroid.show('Everything is okay', ToastAndroid.SHORT)
                      }).finally(() => {
                        setIsSyncing(false)
                      })
                    }}/>
                  </Animated.View>
                }/>
        <Button size={'icon'} rightIcon={<Languages size={20} color={'white'}/>} onPress={() => {
          switchLanguage(activeLanguage === 'en' ? 'bn' : 'en').then(r => {
            ToastAndroid.show('Language switched', ToastAndroid.SHORT)
          })
        }}/>
        <Button size={'icon'}
                style={{
                  backgroundColor: 'rgb(255 255 255 / 0.15)',
                  borderRadius: 50,
                }}
                hitSlop={0}
                rightIcon={<LogOut size={20} color={'white'}/>}
                onPress={() => {
                  setShowLogoutWarning(true)
                }}/>
      </View>

      <AlertDialog
        title='Are you sure you want to log out?'
        visible={showLogoutWarning}
        buttons={[
          {text: 'Cancel', onPress: () => setShowLogoutWarning(false), style: 'default'},
          {
            text: 'Log Out', onPress: () => {
              logOut().then(r => {
              })
              setShowLogoutWarning(false)
            }, style: 'destructive'
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    height: DEFAULT_HEADER_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  profileGreetingWrapper: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    borderRadius: 50,
    padding: 6,
    alignItems: 'center',
  },

  greetingsContainer: {flex: 1,},

  greetingTitle: {fontSize: 14, fontFamily: 'InterBold', color: '#fff'},

  actionContainer: {display: 'flex', flexDirection: 'row', gap: 6},

  notificationIconContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 50,
    height: 30,
    width: 30
  },
})
