import {useState} from 'react';
import {Alert, Button, Pressable, StyleSheet, Text, View} from 'react-native';

import {BaseLayout} from '@/components/core/BaseLayout';
import {MainHeader} from '@/components/core/MainHeader';
import {setAppLanguage} from '@/i18n';
import {type AppLanguage} from '@/i18n/resources';
import {useHomeTranslation} from '@/i18n/useTypedTranslation';
import {useAuthStore} from '@/store/authStore';

export default function HomeScreen() {
  const {t: tHome, i18n} = useHomeTranslation()
  const [isHovered, setIsHovered] = useState(false);
  const logOut = useAuthStore(state => state.logout)

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };

  return (
    <BaseLayout head={<MainHeader/>}>
      <View>
        <Text style={{fontSize: 24, lineHeight: 30, fontFamily: 'InterRegular'}}>
          do you even know me?
        </Text>

        <Pressable onPress={logOut} style={({pressed}) => {
          return {
            backgroundColor: pressed ? '#101010' : '#000000',
            outlineWidth: pressed ? 1 : 0,
            outlineColor: '#000',
            outlineOffset: 3,
            padding: 10,
            borderRadius: 5,
            marginTop: 20,
          }
        }}>
          <Text style={{
            fontSize: 16,
            lineHeight: 22,
            color: '#fff',
          }}>Log Out</Text>
        </Pressable>
      </View>
    </BaseLayout>
  )

}
