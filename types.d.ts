declare module 'react-native-lightbox-v2' {
  import React from 'react'
  import { Animated, StyleProp, ViewStyle } from 'react-native'

  interface LightboxProps {
    activeProps?: any
    renderHeader?: (close: () => void) => void
    renderContent?: () => void
    underlayColor?: string
    backgroundColor?: string
    didOpen?: () => void
    onOpen?: () => void
    willClose?: () => void
    onClose?: () => void
    springConfig?: Animated.SpringAnimationConfig['friction' | 'tension']
    swipeToDismiss?: boolean
    style?: StyleProp<ViewStyle>
    onLongPress?: (...args: any) => void
    children: React.ReactNode,
    doubleTapCallback?: () => void
    doubleTapMaxZoom?: number
    testID?: string
  }

  const Lightbox: React.FC<LightboxProps>

  export default Lightbox
}
