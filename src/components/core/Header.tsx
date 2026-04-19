import { Image, StyleSheet, Text, View } from "react-native"
import { NotificationIcon } from "../icons"

export const Header = () => {
    return (
        <View style={styles.headerContainer}>
            <View>
                <View style={styles.profileGreetingWrapper}>
                    <Image source={require('@/assets/placeholders/profile.png')} style={{ width: 40, height: 40, borderRadius: 20 }} />

                    <View style={styles.greetingsContainer}>
                        <Text style={styles.greetingTitle}>John Doe</Text>
                        <Text style={styles.greetingSubtitle}>Good Morning, John</Text>
                    </View>
                </View>
            </View>
            <View style={styles.rightContainer}>
                <View style={styles.notificationIconContainer}>
                    <NotificationIcon size={24} color='black' />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: 35,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'transparent',
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
        backgroundColor: 'white',
        borderRadius: 50,
        padding: 6,
        alignItems: 'center',
    },

    greetingsContainer: {
        display: 'flex',
        flexDirection: 'column',
        marginRight: 16,
    },

    greetingTitle: {
        fontSize: 14,
        fontFamily: 'InterBold',
        textTransform: 'uppercase'
    },

    greetingSubtitle: {
        fontSize: 12,
        color: '#9c9c9cff',
        fontFamily: 'InterRegular',
    },

    rightContainer: {
        display: 'flex',
        flexDirection: 'row',
    },

    notificationIconContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 50,
        height: 40,
        width: 40
    },

})