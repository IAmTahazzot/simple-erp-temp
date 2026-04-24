import {useEffect, useState, useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {BaseLayout} from '@/components/core/BaseLayout';
import {MainHeader} from '@/components/core/MainHeader';
import {setAppLanguage} from '@/i18n';
import {type AppLanguage} from '@/i18n/resources';
import {useCommonTranslation} from '@/i18n/useTypedTranslation';
import {useAuthStore} from '@/store/authStore';
import {AlertDialog} from '@/components/ui/AlertDialog'
import {Button} from '@/components/ui/Button'
import React from 'react';
import {Rocket} from 'lucide-react-native'
import {ShadcnAlert} from '@/components/ui/ShadcnAlert';
import {Drawer} from '@/components/ui/Drawer';
import {Select} from '@/components/ui/Select'

export default function HomeScreen() {
  const {t, i18n} = useCommonTranslation()
  const logOut = useAuthStore(state => state.logout)

  const activeLanguage = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  const switchLanguage = async (language: AppLanguage) => {
    await setAppLanguage(language);
  };
  const [alertVisible, setAlertVisible] = useState(false);
  const [value, setValue] = useState<string | null>(null);

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
        <View style={{marginTop: 0, display: 'flex', gap: 5}}>
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

        <View style={{margin: 10, display: 'flex', gap: 5}}>
          <Button title={'Hi'}
                  variant={'secondary'}
                  size={'sm'}
                  leftIcon={<Rocket size={16} color={'black'}/>}/>

          <ShadcnAlert title={'Danger'}
                       icon={<Rocket size={16} color={'red'}/>}
                       description={'This is a destructive alert, be careful!'}
                       variant={'destructive'}
          />
          <Button onPress={() => setAlertVisible(true)}
                  title={'Show Alert'}/>
          <Drawer visible={alertVisible}
                  onClose={() => {
                    setAlertVisible(false)
                  }}
                  title={'Drawer Title'}
                  description={'This is a description for the drawer.'}>
            <Text>This is the content of the drawer. You can put anything you want here.</Text>
          </Drawer>


          <Select
            groups={[
              {
                items: [
                  {label: 'Apple', value: 'apple'},
                  {label: 'Orange', value: 'orange'},
                  {label: 'Strawberry', value: 'strawberry'},
                ]
              }
            ]}
            onValueChange={(value) => {
              setValue(value)
            }}
            placeholder="Pick a fruit…"
            value={value} 
          />

        </View>
      </View>
    </BaseLayout>
  )
}
