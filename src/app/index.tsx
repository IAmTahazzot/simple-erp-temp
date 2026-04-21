import { useState } from 'react';
import {Alert, Button, StyleSheet, Text, View} from 'react-native';

import { BaseLayout } from '@/components/core/BaseLayout';
import { MainHeader } from '@/components/core/MainHeader';
import { setAppLanguage } from '@/i18n';
import { type AppLanguage } from '@/i18n/resources';
import { useHomeTranslation } from '@/i18n/useTypedTranslation';
import {useAuthStore} from '@/store/authStore';

export default function HomeScreen() {
  const { t: tHome, i18n } = useHomeTranslation()
  const [isHovered, setIsHovered] = useState(false);
  const logOut = useAuthStore(state => state.logout)

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };

  return (
    <BaseLayout head={<MainHeader />}>
      <View>
          <Text style={{ fontSize: 24, lineHeight: 30, fontFamily: 'InterRegular' }}>
            do you even know me?
          </Text>
        
          <Button title="fuck it" onPress={() => {
            logOut()
            Alert.alert('fuck it', 'fucking logging out. FUCK YOU')
          }} />
      </View>
    </BaseLayout>
  )

}

const styles = StyleSheet.create({
})
