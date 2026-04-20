import { ReactNode, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";

interface BaseLayoutProps {
    children: ReactNode;
    head?: ReactNode;
}

export const BaseLayout = ({ children, head }: BaseLayoutProps) => {
    // Start the scroll container 150 pixels higher (covering the header area)
    const translateY = useSharedValue(-150);
    // Header starts completely transparent
    const headerOpacity = useSharedValue(0);
    // Slight downward offset for the header to slide up from
    const headerTranslateY = useSharedValue(15);

    useEffect(() => {
        // 1. Spring the scroll container down to its natural position (0)
        translateY.value = withSpring(0, {
            damping: 18,
            stiffness: 100,
            mass: 0.8,
        });

        // 2. Delay the header reveal slightly so it happens as the container settles
        headerOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
        headerTranslateY.value = withDelay(200, withTiming(0, { duration: 500 }));
    }, []);

    const animatedScrollStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }]
        };
    });

    const animatedHeaderStyle = useAnimatedStyle(() => {
        return {
            opacity: headerOpacity.value,
            transform: [{ translateY: headerTranslateY.value }]
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.headWrapper, animatedHeaderStyle]}>
                {head}
            </Animated.View>

            {/* Background filler to cover the gap at the bottom when scrollContainer translates up */}
            <View style={{ position: 'absolute', top: '50%', bottom: -500, left: 0, right: 0, backgroundColor: 'white' }} />

            <Animated.View style={[styles.scrollContainer, animatedScrollStyle]}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {children}
                </ScrollView>
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headWrapper: {
        marginTop: 30,
        backgroundColor: 'black',
        // Removed zIndex: 100 so the scrollContainer (rendered later) naturally sits on top of it during the animation
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 10, // Ensure it stays above the header when translating up
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
        paddingHorizontal: 12,
    }
})
