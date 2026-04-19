import { HomeIcon, ProductIcon, ProfileCircleIcon, SalesIcon, SearchIcon } from "@/components/icons"
import { useHomeTranslation } from "@/i18n/useTypedTranslation"
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);


export const NavigationBar = () => {
    const [activeTab, setActiveTab] = useState('home')
    const [arrivedTab, setArrivedTab] = useState('home')
    const [layouts, setLayouts] = useState<Record<string, { x: number, width: number }>>({})
    const { t: tHome, i18n } = useHomeTranslation();
    const isEn = i18n.language === 'en'

    // Shared values for the active pill animation
    const pillX = useSharedValue(0)
    const pillWidth = useSharedValue(0)

    const TABS = useMemo(() => [
        { id: 'home', icon: HomeIcon, label: tHome('home') },
        { id: 'sales', icon: SalesIcon, label: tHome('sales') },
        { id: 'products', icon: ProductIcon, label: tHome('products') },
        { id: 'profile', icon: ProfileCircleIcon, label: tHome('contacts') },
    ], [tHome])

    const onTabLayout = (id: string, x: number, width: number) => {
        setLayouts(prev => {
            if (prev[id]?.x === x && prev[id]?.width === width) {
                return prev
            }
            return { ...prev, [id]: { x, width } }
        })

        // Initialize or animate position if it's the active tab
        if (id === activeTab) {
            if (pillWidth.value === 0) {
                pillX.value = x
                pillWidth.value = width
                setArrivedTab(activeTab)
            } else {
                const currentX = pillX.value
                const distance = Math.abs(currentX - x)
                // Base delay of 70ms + extra time for longer travel distances
                const dynamicDelay = 60 + (distance * 0.3)

                pillX.value = withSpring(x, { damping: 100, stiffness: 1300 })
                setTimeout(() => {
                    setArrivedTab(activeTab)
                }, dynamicDelay)
                pillWidth.value = withSpring(width, { damping: 100, stiffness: 1300 })
            }
        }
    }

    const handlePress = (id: string) => {
        if (id === activeTab) return

        setActiveTab(id)
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
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
                        const isArrived = arrivedTab === tab.id

                        return (
                            <AnimatedPressable
                                key={tab.id}
                                layout={LinearTransition.springify().damping(35).stiffness(350)}
                                onLayout={(e) => onTabLayout(tab.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
                                onPress={() => handlePress(tab.id)}
                                style={styles.tabItem}
                            >
                                <Icon
                                    size={24}
                                    color={isActive && isArrived ? '#FFF' : '#666'}
                                />
                                {isActive && (
                                    <Animated.View
                                        layout={LinearTransition.springify().damping(30).stiffness(400)}
                                        entering={FadeIn.duration(150)}
                                        exiting={FadeOut.duration(150)}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <Text
                                            style={[styles.tabLabel, { color: isActive && isArrived ? '#FFF' : '#666', fontFamily: isEn ? 'Inter_400Regular' : 'HindSiliguri' }]}
                                            numberOfLines={1}
                                        >
                                            {tab.label}
                                        </Text>
                                    </Animated.View>
                                )}
                            </AnimatedPressable>
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
        paddingVertical: 15,
        paddingHorizontal: 10,
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
        elevation: 3,
    },
    navContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    activePill: {
        position: 'absolute',
        top: 5,
        left: 0,
        height: 50,
        backgroundColor: '#000000f1',
        borderRadius: 25,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 25,
        height: 50,
        overflow: 'hidden',
    },
    tabLabel: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
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

