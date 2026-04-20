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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'white',
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
    },
});