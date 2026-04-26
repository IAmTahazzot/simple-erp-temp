import {DEFAULT_HEADER_HEIGHT} from "@/constants"
import {useAuthStore} from "@/store/authStore"
import {StyleSheet, Text, View} from "react-native"

export const MainHeader = () => {
  const user = useAuthStore((state) => state.user)

  return (
    <View style={styles.headerContainer}>
      <View style={styles.greetingsContainer}>
        <View style={styles.profileGreetingWrapper}>
          {/*<Image source={require('@/assets/placeholders/profile.png')} style={{ width: 30, height: 30, borderRadius: 20 }} />*/}
          <Text style={styles.greetingTitle}>Welcome {user?.name || 'Anonymous'}</Text>
        </View>
      </View>
      <View style={styles.actionContainer}></View>
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

  greetingsContainer: {
    flex: 1,
  },

  greetingTitle: {
    fontSize: 14,
    fontFamily: 'InterBold',
    color: '#fff'
  },

  actionContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6
  },

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
