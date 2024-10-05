import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const now = () => +new Date();
const INIT_POSITION = { x: 0, y: 0 };
const DRAG_DISMISS_THRESHOLD = 150;
const DOUBLE_TAP_GAP_TIMER = 300;
const DOUBLE_TAP_ANIMATION_DURATION = 100;
const DOUBLE_TAP_ZOOM_ENABLED = true;
const DOUBLE_TAP_ZOOM_TO_CENTER = false;
const DOUBLE_TAP_INITIAL_SCALE = 1;
const isIOS = Platform.OS === "ios";

const LightboxOverlay = ({
  origin,
  springConfig = { tension: 30, friction: 7 },
  backgroundColor = "black",
  isOpen,
  renderHeader,
  onOpen,
  onClose,
  doubleTapMaxZoom = 2,
  doubleTapCallback = () => {},
  willClose = () => {},
  swipeToDismiss,
  useNativeDriver = false,
  children,
  navigator,
  didOpen = () => {},
}) => {
  const pan = useRef(new Animated.Value(0));
  const openVal = useRef(new Animated.Value(0));

  const [isAnimating, setIsAnimating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [target, setTarget] = useState({
    x: 0,
    y: 0,
    opacity: 1,
  });

  const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = useWindowDimensions();

  const doubleTapZoomStep = doubleTapMaxZoom - 1 || 1;
  const CROP_WIDTH = WINDOW_WIDTH;
  const CROP_HEIGHT = WINDOW_HEIGHT;

  const lastTapTimer = useRef(0);
  const isDoubleTaped = useRef(false);

  // Double-tap coordinates and scale
  const coordinates = useRef(INIT_POSITION);
  const doubleTapScale = useRef(DOUBLE_TAP_INITIAL_SCALE);

  // Animated values for scale and position
  const animatedScale = useRef(new Animated.Value(1));
  const animatedPositionX = useRef(new Animated.Value(INIT_POSITION.x));
  const animatedPositionY = useRef(new Animated.Value(INIT_POSITION.y));

  // Animation style to apply
  const animations = useRef();

  const styles = StyleSheet.create({
    background: {
      position: "absolute",
      top: 0,
      left: 0,
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
    },
    open: {
      position: "absolute",
      flex: 1,
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      width: WINDOW_WIDTH,
      backgroundColor: "transparent",
    },
    closeButton: {
      fontSize: 35,
      color: "white",
      lineHeight: 60,
      width: 70,
      textAlign: "center",
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 1.5,
      shadowColor: "black",
      shadowOpacity: 0.8,
    },
  });

  // Reset function
  const reset = useCallback(() => {
    animatedScale.current.setValue(DOUBLE_TAP_INITIAL_SCALE);
    animatedPositionX.current.setValue(INIT_POSITION.x);
    animatedPositionY.current.setValue(INIT_POSITION.y);
    animations.current = undefined;
  }, []);

  // Open function
  const open = useCallback(() => {
    if (isIOS) {
      StatusBar.setHidden(true, "fade");
    }

    pan.current.setValue(0);
    setIsAnimating(true);
    setTarget({ x: 0, y: 0, opacity: 1 });

    Animated.spring(openVal.current, {
      toValue: 1,
      ...springConfig,
      useNativeDriver,
    }).start(() => {
      setIsAnimating(false);
      didOpen();
    });
  }, [didOpen, isIOS, springConfig, useNativeDriver]);

  // Close function
  const close = useCallback(() => {
    willClose();
    if (isIOS) {
      StatusBar.setHidden(false, "fade");
    }

    reset();
    setIsAnimating(true);

    Animated.spring(openVal.current, {
      toValue: 0,
      ...springConfig,
      useNativeDriver,
    }).start(() => {
      setIsAnimating(false);
    });
    setTimeout(onClose, 200);
  }, [onClose, reset, springConfig, useNativeDriver, willClose]);

  // Double-tap handler
  const onDoubleTap = useCallback(
    (e, gestureState) => {
      if (gestureState.numberActiveTouches > 1) return;

      const nowTapTimer = now();

      if (nowTapTimer - lastTapTimer.current < DOUBLE_TAP_GAP_TIMER) {
        isDoubleTaped.current = true;
        lastTapTimer.current = 0;

        // Update scale
        doubleTapScale.current += DOUBLE_TAP_INITIAL_SCALE * doubleTapZoomStep;
        if (doubleTapScale.current > doubleTapMaxZoom) {
          doubleTapScale.current = DOUBLE_TAP_INITIAL_SCALE;
        }

        // Callback
        doubleTapCallback(doubleTapScale.current);

        if (!DOUBLE_TAP_ZOOM_ENABLED) return;

        coordinates.current = {
          x: e.nativeEvent.changedTouches[0].pageX,
          y: e.nativeEvent.changedTouches[0].pageY,
        };

        if (DOUBLE_TAP_ZOOM_TO_CENTER) {
          coordinates.current = {
            x: CROP_WIDTH / 2,
            y: CROP_HEIGHT / 2,
          };
        }

        Animated.parallel([
          Animated.timing(animatedScale.current, {
            toValue: doubleTapScale.current,
            duration: DOUBLE_TAP_ANIMATION_DURATION,
            useNativeDriver,
          }),
          Animated.timing(animatedPositionX.current, {
            toValue:
              ((CROP_WIDTH / 2 - coordinates.current.x) *
                (doubleTapScale.current - DOUBLE_TAP_INITIAL_SCALE)) /
              doubleTapScale.current,
            duration: DOUBLE_TAP_ANIMATION_DURATION,
            useNativeDriver,
          }),
          Animated.timing(animatedPositionY.current, {
            toValue:
              ((CROP_HEIGHT / 2 - coordinates.current.y) *
                (doubleTapScale.current - DOUBLE_TAP_INITIAL_SCALE)) /
              doubleTapScale.current,
            duration: DOUBLE_TAP_ANIMATION_DURATION,
            useNativeDriver,
          }),
        ]).start();

        animations.current = {
          transform: [
            { scale: animatedScale.current },
            { translateX: animatedPositionX.current },
            { translateY: animatedPositionY.current },
          ],
        };
      } else {
        lastTapTimer.current = nowTapTimer;
      }
    },
    [
      doubleTapCallback,
      doubleTapMaxZoom,
      doubleTapZoomStep,
      useNativeDriver,
      CROP_WIDTH,
      CROP_HEIGHT,
    ]
  );

  // Open when `isOpen` changes
  useEffect(() => {
    if (isOpen) {
      open();
    }
  }, [isOpen, open]);

  // PanResponder setup
  const _panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating,
      onStartShouldSetPanResponderCapture: () => !isAnimating,
      onMoveShouldSetPanResponder: () => !isAnimating,
      onMoveShouldSetPanResponderCapture: () => !isAnimating,

      onPanResponderGrant: (evt, gestureState) => {
        isDoubleTaped.current = false;
        pan.current.setValue(0);
        setIsPanning(true);
        onDoubleTap(evt, gestureState);
      },
      onPanResponderMove: Animated.event([null, { dy: pan.current }], {
        useNativeDriver,
      }),
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (isDoubleTaped.current) return;

        if (Math.abs(gestureState.dy) > DRAG_DISMISS_THRESHOLD) {
          setIsPanning(false);
          setTarget({
            y: gestureState.dy,
            x: gestureState.dx,
            opacity: 1 - Math.abs(gestureState.dy / WINDOW_HEIGHT),
          });
          close();
        } else {
          Animated.spring(pan.current, {
            toValue: 0,
            ...springConfig,
            useNativeDriver,
          }).start(() => setIsPanning(false));
        }
      },
    })
  );

  // Lightbox opacity style
  const lightboxOpacityStyle = {
    opacity: openVal.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0, target.opacity],
    }),
  };

  // Handlers for pan gestures
  let handlers = swipeToDismiss ? _panResponder.current.panHandlers : {};

  // Drag style for panning
  const dragStyle = isPanning
    ? {
        top: pan.current,
      }
    : {};

  if (isPanning) {
    lightboxOpacityStyle.opacity = pan.current.interpolate({
      inputRange: [-WINDOW_HEIGHT, 0, WINDOW_HEIGHT],
      outputRange: [0, 1, 0],
    });
  }

  // Open style for animations
  const openStyle = [
    styles.open,
    {
      left: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [origin.x, target.x],
      }),
      top: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [origin.y, target.y],
      }),
      width: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [origin.width, WINDOW_WIDTH],
      }),
      height: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [origin.height, WINDOW_HEIGHT],
      }),
    },
  ];

  // Background component
  const background = (
    <Animated.View
      style={[styles.background, { backgroundColor }, lightboxOpacityStyle]}
    />
  );

  // Header component
  const header = (
    <Animated.View style={[styles.header, lightboxOpacityStyle]}>
      {renderHeader ? (
        renderHeader(close)
      ) : (
        <TouchableOpacity onPress={close}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // Content component
  const content = (
    <Animated.View
      style={[openStyle, dragStyle, animations.current]}
      {...handlers}
    >
      {children}
    </Animated.View>
  );

  return (
    <>
      {navigator ? (
        <View>
          {background}
          {content}
          {header}
        </View>
      ) : (
        <Modal visible={isOpen} transparent onRequestClose={close}>
          {background}
          {content}
          {header}
        </Modal>
      )}
    </>
  );
};

LightboxOverlay.propTypes = {
  origin: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }).isRequired,
  springConfig: PropTypes.shape({
    tension: PropTypes.number,
    friction: PropTypes.number,
  }),
  backgroundColor: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  renderHeader: PropTypes.func,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  doubleTapMaxZoom: PropTypes.number,
  doubleTapCallback: PropTypes.func,
  willClose: PropTypes.func,
  swipeToDismiss: PropTypes.bool,
  useNativeDriver: PropTypes.bool,
  children: PropTypes.node,
  navigator: PropTypes.object,
  didOpen: PropTypes.func,
};

export default LightboxOverlay;
