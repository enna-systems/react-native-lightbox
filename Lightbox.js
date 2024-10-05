import React, {
  Children,
  cloneElement,
  useState,
  useRef,
  useCallback,
} from "react";
import { Animated, TouchableOpacity, View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import LightboxOverlay from "./LightboxOverlay";

const Lightbox = ({
  activeProps,
  renderHeader,
  renderContent,
  underlayColor,
  backgroundColor = "black",
  didOpen = () => {},
  onOpen = () => {},
  willClose = () => {},
  onClose = () => {},
  doubleTapCallback = () => {},
  doubleTapMaxZoom = 2,
  onLongPress = null,
  onLayout = () => {},
  springConfig = { tension: 30, friction: 7 },
  swipeToDismiss = true,
  navigator,
  children,
  style,
  testID,
}) => {
  const layoutOpacity = useRef(new Animated.Value(1));
  const rootRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const getContent = useCallback(() => {
    if (renderContent) {
      return renderContent();
    } else if (activeProps) {
      return cloneElement(Children.only(children), activeProps);
    }
    return children;
  }, [renderContent, activeProps, children]);

  const handleOpen = useCallback(() => {
    if (!rootRef.current) return;

    rootRef.current.measure((ox, oy, width, height, px, py) => {
      onOpen();

      setOrigin({ x: px, y: py, width, height });

      if (navigator) {
        setIsOpen(true);
        didOpen();

        const route = {
          component: LightboxOverlay,
          passProps: getOverlayProps(),
        };

        const routes = navigator.getCurrentRoutes();
        routes.push(route);
        navigator.immediatelyResetRouteStack(routes);
      } else {
        setIsOpen(true);
      }

      setTimeout(() => {
        layoutOpacity.current.setValue(0);
      }, 0);
    });
  }, [navigator, onOpen, didOpen, getOverlayProps]);

  const handleClose = useCallback(() => {
    layoutOpacity.current.setValue(1);
    setIsOpen(false);

    if (navigator) {
      const routes = navigator.getCurrentRoutes();
      routes.pop();
      navigator.immediatelyResetRouteStack(routes);
    }

    onClose();
  }, [navigator, onClose]);

  const getOverlayProps = useCallback(
    () => ({
      isOpen,
      origin,
      renderHeader,
      swipeToDismiss,
      springConfig,
      backgroundColor,
      children: getContent(),
      didOpen,
      willClose,
      onClose: handleClose,
      doubleTapCallback,
      doubleTapMaxZoom,
    }),
    [
      isOpen,
      origin,
      renderHeader,
      swipeToDismiss,
      springConfig,
      backgroundColor,
      getContent,
      didOpen,
      willClose,
      handleClose,
      doubleTapCallback,
      doubleTapMaxZoom,
    ]
  );

  return (
    <View testID={testID} ref={rootRef} style={style} onLayout={onLayout}>
      <Animated.View
        style={[styles.container, { opacity: layoutOpacity.current }]}
      >
        <TouchableOpacity
          activeOpacity={1}
          underlayColor={underlayColor}
          onPress={handleOpen}
          onLongPress={onLongPress}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
      {!navigator && isOpen && <LightboxOverlay {...getOverlayProps()} />}
    </View>
  );
};

Lightbox.propTypes = {
  activeProps: PropTypes.object,
  renderHeader: PropTypes.func,
  renderContent: PropTypes.func,
  underlayColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  didOpen: PropTypes.func,
  onOpen: PropTypes.func,
  willClose: PropTypes.func,
  onClose: PropTypes.func,
  doubleTapCallback: PropTypes.func,
  doubleTapMaxZoom: PropTypes.number,
  onLongPress: PropTypes.func,
  onLayout: PropTypes.func,
  springConfig: PropTypes.shape({
    tension: PropTypes.number,
    friction: PropTypes.number,
  }),
  swipeToDismiss: PropTypes.bool,
  navigator: PropTypes.object,
  children: PropTypes.node.isRequired,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  testID: PropTypes.string,
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
});

export default Lightbox;
