import React, { useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, Text, Dimensions, Platform } from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, { 
  useAnimatedStyle,
  useSharedValue, 
  withSpring,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { useTheme } from '@/src/context/ThemeContext'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  
  // This version handles the 4 core routes after Settings removal
  const routes = state.routes.map((route, index) => {
    const { options } = descriptors[route.key]
    return { ...route, options, originalIndex: index }
  }).filter(route => {
    const isHidden = (route.options as any).href === null || route.name === 'settings'
    return !isHidden
  })

  return (
    <View style={[
      styles.integratedBar, 
      { 
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom,
        borderTopColor: isDark ? '#1F1F1F' : '#E5E5E5',
      }
    ]}>
      {routes.map((route) => {
        const isFocused = state.index === route.originalIndex

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            Haptics.selectionAsync()
            navigation.navigate(route.name)
          }
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={1}
            style={styles.tabItem}
          >
            <TabContent 
                isFocused={isFocused} 
                icon={route.options.tabBarIcon} 
                label={route.options.title || route.name}
                colors={colors} 
            />
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function TabContent({ isFocused, icon, label, colors }: any) {
  const scale = useSharedValue(isFocused ? 1.05 : 1)
  
  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.05 : 1, { stiffness: 120, damping: 20 })
  }, [isFocused])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [1, 1.05], [0.45, 1])
  }))

  return (
    <Animated.View style={[styles.contentContainer, animatedStyle]}>
      <View style={styles.iconContainer}>
        {icon?.({ 
            color: isFocused ? colors.primary : colors.textTertiary, 
            size: 22, 
            focused: isFocused 
        })}
      </View>
      <Text style={[
        styles.label, 
        { color: isFocused ? colors.primary : colors.textTertiary }
      ]}>
        {label}
      </Text>
      
      {isFocused && (
        <Animated.View 
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(150)}
            style={[styles.dot, { backgroundColor: colors.primary }]} 
        />
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  integratedBar: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    // No margin for zero-gap look
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2, // Tiny micro-gap for visual balance
  },
  dot: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  }
})
