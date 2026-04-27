import { HomeIcon, ProductIcon, ProfileCircleIcon, SalesIcon, SearchIcon } from "@/components/icons"
import { useHomeTranslation } from "@/i18n/useTypedTranslation"
import * as Haptics from 'expo-haptics'
import { useRouter } from "expo-router"
import { useMemo, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"

export const NavigationBar = () => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('home')
    const [arrivedTab, setArrivedTab] = useState('home')
    const [layouts, setLayouts] = useState<Record<string, { x: number, width: number }>>({})
    const { t: tHome, i18n } = useHomeTranslation();
    const isEn = i18n.language === 'en'

    // Shared values for the active pill animation
    const pillX = useRef(new Animated.Value(0)).current
    const pillWidth = useRef(new Animated.Value(0)).current

    const TABS = useMemo(() => [
        { id: 'home', icon: HomeIcon, label: tHome('home'), href: '/' },
        { id: 'orders', icon: SalesIcon, label: tHome('orders'), href: '/orders' },
        { id: 'products', icon: ProductIcon, label: tHome('products'), href: '/products' },
        { id: 'contacts', icon: ProfileCircleIcon, label: tHome('contacts'), href: '/contacts' },
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
            // Check if it's the first time setting width
            // @ts-ignore
            if (pillWidth._value === 0) {
                pillX.setValue(x)
                pillWidth.setValue(width)
                setArrivedTab(activeTab)
            } else {
                // @ts-ignore
                const currentX = pillX._value
                const distance = Math.abs(currentX - x)
                // Base delay of 70ms + extra time for longer travel distances
                const dynamicDelay = 60 + (distance * 0.3)

                Animated.spring(pillX, {
                    toValue: x,
                    damping: 15,
                    stiffness: 150,
                    useNativeDriver: false // Width/Position animation can't easily use native driver for all properties in older RN, but standard x/width is fine here
                }).start()

                setTimeout(() => {
                    setArrivedTab(activeTab)
                }, dynamicDelay)

                Animated.spring(pillWidth, {
                    toValue: width,
                    damping: 15,
                    stiffness: 150,
                    useNativeDriver: false
                }).start()
            }
        }
    }

    const handlePress = (id: string) => {
        if (id === activeTab) return

        setActiveTab(id)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    }

    return (
        <View style={styles.outerContainer}>
            <View style={styles.navContainerWrapper}>
                <View style={styles.navContent}>
                    {/* Active Pill Indicator */}
                    <Animated.View style={[styles.activePill, { transform: [{ translateX: pillX }], width: pillWidth }]} />

                    {/* Tabs */}
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        const isArrived = arrivedTab === tab.id

                        return (
                            <Pressable
                                key={tab.id}
                                onLayout={(e) => onTabLayout(tab.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
                                onPress={() => {
                                    handlePress(tab.id)
                                    router.navigate(tab.href as any)
                                }}
                                style={styles.tabItem}
                            >
                                <Icon
                                    size={24}
                                    color={isActive && isArrived ? '#FFF' : '#666'}
                                />
                                {isActive && (
                                    <View style={{ overflow: 'hidden' }}>
                                        <Text
                                            style={[styles.tabLabel, { color: isActive && isArrived ? '#FFF' : '#666', fontFamily: isEn ? 'InterMedium' : 'HindSiliguri' }]}
                                            numberOfLines={1}
                                        >
                                            {tab.label}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        )
                    })}
                </View>
            </View>

            {/*/!* Separate Search Button *!/*/}
            {/*<Pressable*/}
            {/*    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}*/}
            {/*    style={styles.searchButtonWrapper}*/}
            {/*>*/}
            {/*    <View style={styles.searchIconContainer}>*/}
            {/*        <SearchIcon size={24} color="#000" />*/}
            {/*    </View>*/}
            {/*</Pressable>*/}
        </View>
    )
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 0,
        left: '10%',
        right: '10%',
        paddingVertical: 15,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        zIndex: 100,
        width: '80%'
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
        height: 50,
        overflow: 'hidden',
    },
    tabLabel: {
        color: '#FFF',
        fontSize: 13,
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

