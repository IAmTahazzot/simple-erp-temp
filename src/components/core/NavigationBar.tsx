import { HomeIcon, ProfileCircleIcon, SalesIcon, SearchIcon, StatusUpIcon } from "@/components/icons"
import * as Haptics from 'expo-haptics'
import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated"

const TABS = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'sales', icon: SalesIcon, label: 'Sales' },
    { id: 'status', icon: StatusUpIcon, label: 'Status' },
    { id: 'profile', icon: ProfileCircleIcon, label: 'Profile' },
]

export const NavigationBar = () => {
    const [activeTab, setActiveTab] = useState('home')
    const [layouts, setLayouts] = useState<Record<string, { x: number, width: number }>>({})

    // Shared values for the active pill animation
    const pillX = useSharedValue(0)
    const pillWidth = useSharedValue(0)

    const onTabLayout = (id: string, x: number, width: number) => {
        const newLayouts = { ...layouts, [id]: { x, width } }
        setLayouts(newLayouts)

        // Initialize position if it's the active tab
        if (id === activeTab) {
            pillX.value = x
            pillWidth.value = width
        }
    }

    const handlePress = (id: string) => {
        if (id === activeTab) return

        setActiveTab(id)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        const layout = layouts[id]
        if (layout) {
            pillX.value = withSpring(layout.x, { damping: 18, stiffness: 150 })
            pillWidth.value = withSpring(layout.width, { damping: 18, stiffness: 150 })
        }
    }

    const animatedPillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pillX.value }],
        width: pillWidth.value,
    }))

    return (
        <View style={styles.outerContainer}>
            <View style={styles.navContainerWrapper}>
                <View style={styles.navContent}>
                    {/* Active Pill Indicator */}
                    <Animated.View style={[styles.activePill, animatedPillStyle]} />

                    {/* Tabs */}
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id

                        return (
                            <Pressable
                                key={tab.id}
                                onLayout={(e) => onTabLayout(tab.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
                                onPress={() => handlePress(tab.id)}
                                style={styles.tabItem}
                            >
                                <Icon
                                    size={24}
                                    color={isActive ? '#FFF' : '#666'}
                                />
                                {isActive && (
                                    <Text style={styles.tabLabel}>{tab.label}</Text>
                                )}
                            </Pressable>
                        )
                    })}
                </View>
            </View>

            {/* Separate Search Button */}
            <Pressable
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                style={styles.searchButtonWrapper}
            >
                <View style={styles.searchIconContainer}>
                    <SearchIcon size={24} color="#000" />
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
    },
    navContainerWrapper: {
        flex: 1,
        height: 60,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: '#f1f1f1ff',
        backgroundColor: '#ffffffe7',
        shadowColor: '#000000a4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    navContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4, // subtle inner padding
    },
    activePill: {
        position: 'absolute',
        height: 50, // slightly smaller than container height
        backgroundColor: '#000000f1',
        borderRadius: 27,
        top: 5, // center vertically in 64px height
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 25,
        height: 54,
    },
    tabLabel: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
        fontFamily: 'Inter_400Regular',
    },
    searchButtonWrapper: {
        width: 60,
        height: 60,
        borderRadius: 32,
        backgroundColor: '#ffffffef',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        elevation: 8,
        shadowColor: '#000000a9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    searchIconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})

