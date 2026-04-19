import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { setAppLanguage } from '@/i18n';
import { type AppLanguage } from '@/i18n/resources';
import { useHomeTranslation } from '@/i18n/useTypedTranslation';

export default function HomeScreen() {
  const { t: tHome, i18n } = useHomeTranslation()
  const [isHovered, setIsHovered] = useState(false);

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };

  return (
    <View style={styles.megaContainer}>
      {/* dummy UI for testing scroll-view */}
      <View style={{ margin: 10, display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={() => switchLanguage(activeLanguage === 'en' ? 'bn' : 'en')} style={{ padding: 10, backgroundColor: 'green', borderRadius: 10 }}>
          <Text style={{ fontSize: 20, color: 'white' }}>{tHome("title")}</Text>
        </Pressable>
        <Text style={{ fontSize: 20, color: 'black' }}>{activeLanguage}</Text>

        <View style={{
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <Image source={require('@/assets/image.png')} style={{ width: '100%', height: 800, borderRadius: 20 }} />
        </View>
      </View>
      <View style={{ margin: 10 }}>
        <View style={{
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <Image source={require('@/assets/image.png')} style={{ width: '100%', height: 800, borderRadius: 20 }} />
        </View>
      </View>
    </View>
  )

}

const styles = StyleSheet.create({
  megaContainer: {
    flex: 1,
    backgroundColor: Colors.light.background
  }
})