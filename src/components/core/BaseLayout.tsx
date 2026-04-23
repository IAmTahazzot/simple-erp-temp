import { ReactNode, useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

interface BaseLayoutProps {
    children: ReactNode;
    head?: ReactNode;
}

// Module-level variable to track if the startup animation has run for the session
let hasRunStartupAnimation = false;

export const BaseLayout = ({ children, head }: BaseLayoutProps) => {
    // Capture if this is the first render
    const isStartup = !hasRunStartupAnimation;

    // Start the scroll container 150 pixels higher ONLY if it's startup, otherwise 0
    const translateY = useRef(new Animated.Value(isStartup ? -150 : 0)).current;
    // Header starts completely transparent every time
    const headerOpacity = useRef(new Animated.Value(0)).current;
    // Slight downward offset for the header to slide up from every time
    const headerTranslateY = useRef(new Animated.Value(15)).current;

    useEffect(() => {
        let delay = 0;

        if (isStartup) {
            // 1. Spring the scroll container down to its natural position (0)
            Animated.spring(translateY, {
                toValue: 0,
                damping: 18,
                stiffness: 100,
                mass: 0.8,
                useNativeDriver: true,
            }).start();
            
            hasRunStartupAnimation = true;
            delay = 200; // Only delay the header reveal on startup to wait for the scrollContainer
        }

        // 2. Header reveal happens every time BaseLayout mounts
        Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(headerOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(headerTranslateY, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                })
            ])
        ]).start();
    }, [isStartup, translateY, headerOpacity, headerTranslateY]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.headWrapper, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
                {head}
            </Animated.View>

            {/* Background filler to cover the gap at the bottom when scrollContainer translates up */}
            <View style={{ position: 'absolute', top: '50%', bottom: -500, left: 0, right: 0, backgroundColor: 'white' }} />

            <Animated.View style={[styles.scrollContainer, { transform: [{ translateY }] }]}>
                <View style={{ flex: 1 }}>
                    {children}
                </View>
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
})
