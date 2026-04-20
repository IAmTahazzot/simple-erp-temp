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
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dignissimos amet at maiores optio quae tempore nesciunt impedit, laborum magnam deleniti ex saepe! Soluta reprehenderit architecto aperiam minima quas vitae eos, cumque porro iste eum optio ab in recusandae odit nostrum reiciendis, similique ea harum, ducimus illum. Repellendus obcaecati soluta expedita nobis laboriosam inventore voluptas, molestias ex impedit id aspernatur fugit quibusdam commodi facilis repellat rerum veniam dolor totam nemo adipisci laborum, suscipit enim! Tempora obcaecati ad quasi, nobis commodi libero deserunt eum quibusdam illo et, dolore exercitationem ullam odit voluptas possimus. Tempora qui reiciendis exercitationem expedita illum facilis nulla inventore odio id quisquam, at quibusdam itaque dolore! Quibusdam nulla autem commodi dignissimos animi repudiandae tenetur beatae, adipisci, ut unde ab dicta eligendi. Ipsam architecto aliquam deleniti qui nemo nisi perspiciatis, libero cumque magni est omnis. Minima laboriosam quasi hic cupiditate expedita aut in corrupti deleniti, recusandae sapiente esse, rem eligendi nisi cum dignissimos. Ipsa nihil incidunt natus in vel ullam voluptas perspiciatis placeat necessitatibus, et eaque enim at aspernatur officia dolorem laborum ex sit autem fuga molestiae est beatae illo quia cumque. Eaque vel cumque eligendi iusto beatae hic maxime culpa reprehenderit earum alias, iste aperiam, deserunt quas fugit eos.
      </Text>
    </BaseLayout>
  )

}

const styles = StyleSheet.create({
})