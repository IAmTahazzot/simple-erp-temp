import { DEFAULT_HEADER_HEIGHT } from "@/constants";
import { StyleSheet, Text, View } from "react-native";

export const ProductHeader = () => {
    return (
        <View style={styles.productHeaderContainer}>
            <Text style={styles.productHeaderText}>Products</Text>
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