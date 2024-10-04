import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const now = () => +new Date();
const INIT_POSITION = { x: 0, y: 0 };
const DRAG_DISMISS_THRESHOLD = 150;
const isIOS = Platform.OS === "ios";

const LightboxOverlay = (props) => {
  const _panResponder = useRef();
  const pan = useRef(new Animated.Value(0));
  const openVal = useRef(new Animated.Value(0));

  const [isAnimating, setIsAnimating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [target, setTarget] = useState({
    x: 0,
    y: 0,
    opacity: 1,
  });

  const WINDOW_HEIGHT = useWindowDimensions().height;
  const WINDOW_WIDTH = useWindowDimensions().width;

  const doubleTapGapTimer = 300;
  const doubleTapAnimationDuration = 100;
  const doubleTapZoomEnabled = true;
  const doubleTapCallback = () => {};
  const doubleTapZoomToCenter = false;
  const doubleTapMaxZoom = 3;
  const doubleTapInitialScale = 1;
  const doubleTapZoomStep = 2;
  const UNSAFE_INNER_WIDTH__cropWidth = WINDOW_WIDTH;
  const UNSAFE_INNER_WIDTH__cropHeight = WINDOW_HEIGHT;

  const lastTapTimer = useRef(0);
  const isDoubleTaped = useRef(false);

  const useNativeDriver = props.useNativeDriver;

  // double tap coordinates
  const coordinates = useRef(INIT_POSITION);
  // double tap scale
  const doubleTapScale = useRef(doubleTapInitialScale);
  // animated
  const animatedScale = useRef(new Animated.Value(1));
  const animatedPositionX = useRef(new Animated.Value(INIT_POSITION.x));
  const animatedPositionY = useRef(new Animated.Value(INIT_POSITION.y));
  // animation style to export
  const animations = useRef();

  const styles = {
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
      // Android pan handlers crash without this declaration:
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
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowRadius: 1.5,
      shadowColor: "black",
      shadowOpacity: 0.8,
    },
  };

  useEffect(() => {
    _panResponder.current = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => !isAnimating,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating,
      onMoveShouldSetPanResponder: (evt, gestureState) => !isAnimating,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => !isAnimating,

      onPanResponderGrant: (evt, gestureState) => {
        isDoubleTaped.current = false;
        pan.current.setValue(0);
        setIsPanning(true);
        onDoubleTap(evt, gestureState);
      },
      onPanResponderMove: Animated.event([null, { dy: pan.current }], {
        useNativeDriver: props.useNativeDriver,
      }),
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (isDoubleTaped.current) {
          return;
        }
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
            ...props.springConfig,
            useNativeDriver: props.useNativeDriver,
          }).start(() => setIsPanning(false));
        }
      },
    });
  }, [props.useNativeDriver]);

  useEffect(() => {
    if (props.isOpen) {
      open();
    }
  }, [props.isOpen]);

  open = () => {
    if (isIOS) {
      StatusBar.setHidden(true, "fade");
    }

    pan.current.setValue(0);

    setIsAnimating(true);
    setTarget({
      x: 0,
      y: 0,
      opacity: 1,
    });

    Animated.spring(openVal.current, {
      toValue: 1,
      ...props.springConfig,
      useNativeDriver: props.useNativeDriver,
    }).start(() => {
      setIsAnimating(false);
      props.didOpen();
    });
  };

  close = () => {
    props.willClose();
    if (isIOS) {
      StatusBar.setHidden(false, "fade");
    }

    reset();
    setIsAnimating(true);
    Animated.spring(openVal.current, {
      toValue: 0,
      ...props.springConfig,
      useNativeDriver: props.useNativeDriver,
    }).start(() => {
      setIsAnimating(false);
    });

    // TODO delay when close
    setTimeout(props.onClose, 200);
  };

  const onDoubleTap = (e, gestureState) => {
    console.log("onDoubleTap", gestureState);
    if (gestureState.numberActiveTouches > 1) return;

    const nowTapTimer = now();
    // double tap
    if (nowTapTimer - lastTapTimer.current < doubleTapGapTimer) {
      isDoubleTaped.current = true;
      lastTapTimer.current = 0;
      // double tap callback
      if (doubleTapCallback) doubleTapCallback(e, gestureState);
      // double tap zoom
      if (!doubleTapZoomEnabled) return;
      // next scale
      doubleTapScale.current =
        doubleTapScale.current + doubleTapInitialScale * doubleTapZoomStep;
      if (doubleTapScale.current > doubleTapMaxZoom) {
        doubleTapScale.current = doubleTapInitialScale;
      }
      coordinates.current = {
        x: e.nativeEvent.changedTouches[0].pageX,
        y: e.nativeEvent.changedTouches[0].pageY,
      };
      if (doubleTapZoomToCenter) {
        coordinates.current = {
          x: UNSAFE_INNER_WIDTH__cropWidth / 2,
          y: UNSAFE_INNER_WIDTH__cropHeight / 2,
        };
      }
      console.log("coor", coordinates.current);
      console.log("doubleTapScale", doubleTapScale.current);
      Animated.parallel([
        Animated.timing(animatedScale.current, {
          toValue: doubleTapScale.current,
          duration: doubleTapAnimationDuration,
          useNativeDriver,
        }),
        Animated.timing(animatedPositionX.current, {
          toValue:
            ((UNSAFE_INNER_WIDTH__cropWidth / 2 - coordinates.current.x) *
              (doubleTapScale.current - doubleTapInitialScale)) /
            doubleTapScale.current,
          duration: doubleTapAnimationDuration,
          useNativeDriver,
        }),
        Animated.timing(animatedPositionY.current, {
          toValue:
            ((UNSAFE_INNER_WIDTH__cropHeight / 2 - coordinates.current.y) *
              (doubleTapScale.current - doubleTapInitialScale)) /
            doubleTapScale.current,
          duration: doubleTapAnimationDuration,
          useNativeDriver,
        }),
      ]).start();
      animations.current = {
        transform: [
          {
            scale: animatedScale.current,
          },
          {
            translateX: animatedPositionX.current,
          },
          {
            translateY: animatedPositionY.current,
          },
        ],
      };
    } else {
      lastTapTimer.current = nowTapTimer;
    }
  };

  // reset
  const reset = () => {
    // double tap animations reset
    animatedScale.current.setValue(doubleTapInitialScale);
    animatedPositionX.current.setValue(INIT_POSITION.x);
    animatedPositionY.current.setValue(INIT_POSITION.y);
    animations.current = void 0;
  };

  const lightboxOpacityStyle = {
    opacity: openVal.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0, target.opacity],
    }),
  };

  let handlers;
  if (props.swipeToDismiss && _panResponder.current) {
    handlers = _panResponder.current.panHandlers;
  }

  let dragStyle;
  if (isPanning) {
    dragStyle = {
      top: pan.current,
    };
    lightboxOpacityStyle.opacity = pan.current.interpolate({
      inputRange: [-WINDOW_HEIGHT, 0, WINDOW_HEIGHT],
      outputRange: [0, 1, 0],
    });
  }

  const openStyle = [
    styles.open,
    {
      left: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.x, target.x],
      }),
      top: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.y, target.y],
      }),
      width: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.width, WINDOW_WIDTH],
      }),
      height: openVal.current.interpolate({
        inputRange: [0, 1],
        outputRange: [props.origin.height, WINDOW_HEIGHT],
      }),
    },
  ];

  const background = (
    <Animated.View
      style={[
        styles.background,
        { backgroundColor: props.backgroundColor },
        lightboxOpacityStyle,
      ]}
    ></Animated.View>
  );
  const header = (
    <Animated.View style={[styles.header, lightboxOpacityStyle]}>
      {props.renderHeader ? (
        props.renderHeader(close)
      ) : (
        <TouchableOpacity onPress={close}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
  const content = (
    <Animated.View
      style={[openStyle, dragStyle, animations.current]}
      {...handlers}
    >
      {props.children}
    </Animated.View>
  );

  return (
    <>
      {props.navigator ? (
        <View>
          {background}
          {content}
          {header}
        </View>
      ) : (
        <Modal
          visible={props.isOpen}
          transparent={true}
          onRequestClose={() => close()}
        >
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
  }),
  springConfig: PropTypes.shape({
    tension: PropTypes.number,
    friction: PropTypes.number,
  }),
  backgroundColor: PropTypes.string,
  isOpen: PropTypes.bool,
  renderHeader: PropTypes.func,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  willClose: PropTypes.func,
  swipeToDismiss: PropTypes.bool,
  useNativeDriver: PropTypes.bool,
};

LightboxOverlay.defaultProps = {
  springConfig: { tension: 30, friction: 7 },
  backgroundColor: "black",
  useNativeDriver: false,
};

export default LightboxOverlay;
