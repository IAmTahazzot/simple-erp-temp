import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

interface BaseLayoutProps {
    children: ReactNode;
    head?: ReactNode;
}

export const BaseLayout = ({ children, head }: BaseLayoutProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.headWrapper}>
                {head}
            </View>
            <View style={styles.scrollContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {children}
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headWrapper: {
        marginTop: 30,
        zIndex: 100,
        backgroundColor: 'black',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
        paddingHorizontal: 12,
    }
})
