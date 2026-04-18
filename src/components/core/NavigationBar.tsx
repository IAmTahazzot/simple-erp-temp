import { HomeIcon, ProfileCircleIcon, SalesIcon, SearchIcon, StatusUpIcon } from "@/components/icons"
import { StyleSheet, Text, View } from "react-native"

export const NavigationBar = () => {
    return (
        <View style={styles.container}>
            <View style={styles.navigation}>
                <View style={styles.navItem}>
                    <HomeIcon size={26} />
                    <Text>Home</Text>
                </View>
                <View style={styles.navItem}>
                    <SalesIcon size={26} />
                </View>
                <View style={styles.navItem}>
                    <StatusUpIcon size={26} />
                </View>
                <View style={styles.navItem}>
                    <ProfileCircleIcon size={26} />
                </View>
            </View>
            <View style={styles.centerButton}>
                <SearchIcon size={26} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        padding: 10,
        width: "100%",
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        backgroundColor: 'transparent'

    },
    navigation: {
        height: 60,
        flex: 1,
        flexDirection: 'row',
        gap: 10,
        backgroundColor: '#fffffffb',
        borderRadius: 50,
        borderWidth: 1,
        borderColor: '#e9e9e9ff'
    },
    navItem: {
        display: 'flex',
        flexDirection: 'row',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        flexShrink: 1,
        flexGrow: 1,
    },
    centerButton: {
        height: 60,
        aspectRatio: 1,
        borderRadius: 50,
        elevation: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        borderWidth: 1,
        borderColor: '#e9e9e9ff'
    }
})