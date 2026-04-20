import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { BaseLayout } from '@/components/core/BaseLayout';
import { MainHeader } from '@/components/core/MainHeader';
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
    <BaseLayout head={<MainHeader />}>
      <Text style={{ fontSize: 24, lineHeight: 30, fontFamily: 'InterRegular' }}>
        But I say fire, Watch your pour as I touch your face. {"\n"}
        While burn when I cry out of your name, your name.{"\n"}
        OH OHHHHH oh oh oh ohhhhhhh{"\n"}{"\n"}{"\n"}
      </Text>
    </BaseLayout>
  )

}

const styles = StyleSheet.create({
})