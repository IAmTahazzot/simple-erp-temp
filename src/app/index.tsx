import {useEffect, useState} from 'react';
import {Alert, Button, Pressable, StyleSheet, Text, View} from 'react-native';

import {BaseLayout} from '@/components/core/BaseLayout';
import {MainHeader} from '@/components/core/MainHeader';
import {setAppLanguage} from '@/i18n';
import {type AppLanguage} from '@/i18n/resources';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import {useAuthStore} from '@/store/authStore';

export default function HomeScreen() {
  const {t, i18n} = useCommonTranslation()
  const logOut = useAuthStore(state => state.logout)

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };


  return (
    <BaseLayout head={<MainHeader/>}>
      <View>
        <Pressable onPress={logOut} style={({pressed}) => {
          return {
            backgroundColor: pressed ? '#101010' : '#000000',
            outlineWidth: pressed ? 1 : 0,
            outlineColor: '#000',
            outlineOffset: 3,
            padding: 10,
            borderRadius: 12,
            margin: 10,
          }
        }}>
          <Text style={{
            fontSize: 16,
            lineHeight: 22,
            color: '#fff',
          }}>Log Out</Text>
        </Pressable>

        <View style={{marginTop: 20, display: 'flex', gap: 5}}>
          <Pressable onPress={() => switchLanguage(activeLanguage === 'en' ? 'bn' : 'en')} style={{
            backgroundColor: '#000',
            padding: 10,
            borderRadius: 12,
            margin: 10,
            width: 100,
          }}>
            <Text style={{color: 'white'}}>
              {activeLanguage === 'en' ? t('language.bangla') : t('language.english')}
            </Text>
          </Pressable>
        </View>
      </View>
    </BaseLayout>
  )
}
