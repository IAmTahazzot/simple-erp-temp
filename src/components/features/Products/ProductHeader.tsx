import { DEFAULT_HEADER_HEIGHT } from "@/constants";
import { useAuthStore } from "@/store/authStore";
import { StyleSheet, Text, View } from "react-native";

export const ProductHeader = () => {
    const user = useAuthStore((state) => state.user)

    if (!user) {
        return <Text style={{color: 'white'}}>Unauthorized</Text>
    }

    return (
        <View style={styles.productHeaderContainer}>
            <Text style={styles.productHeaderText}>Products {user.email}</Text>
            <View />
        </View>
    )
}

const styles = StyleSheet.create({
    productHeaderContainer: {
        height: DEFAULT_HEADER_HEIGHT,
        paddingHorizontal: 12,
        paddingVertical: 8,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    productHeaderText: {
        fontSize: 20,
        fontFamily: 'InterBold',
        color: '#fff'
    },
});