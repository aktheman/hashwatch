import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { getTheme } from '../theme';

type SwitchThemeFn = (themeSwitch: () => void) => void;

const ThemeTransitionContext = createContext<SwitchThemeFn | null>(null);

let _overlayVisible = false;
let _overlayBg = '#0A0A1A';
const _listeners = new Set<() => void>();

function subscribeOverlay(cb: () => void) {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

function getOverlayVisible() {
  return _overlayVisible;
}

function getOverlayBg() {
  return _overlayBg;
}

export function switchThemeWithTransition(themeSwitch: () => void) {
  _overlayBg = getTheme().bg;
  _overlayVisible = true;
  _listeners.forEach((cb) => cb());
  themeSwitch();
}

export function ThemeTransitionOverlay() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [bgColor, setBgColor] = useState('#0A0A1A');

  useEffect(() => {
    return subscribeOverlay(() => {
      if (getOverlayVisible()) {
        setBgColor(getOverlayBg());
        setVisible(true);
        opacity.setValue(1);
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          _overlayVisible = false;
          _listeners.forEach((cb) => cb());
          setVisible(false);
        });
      }
    });
  }, [opacity]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity }]} />
    </View>
  );
}

export function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [bgColor, setBgColor] = useState('#0A0A1A');

  const switchFn = useCallback(
    (themeSwitch: () => void) => {
      const oldBg: string = getTheme().bg;
      setBgColor(oldBg);
      setVisible(true);
      opacity.setValue(1);
      themeSwitch();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setVisible(false);
      });
    },
    [opacity],
  );

  return (
    <ThemeTransitionContext.Provider value={switchFn}>
      {children}
      {visible && (
        <View style={styles.overlay} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity }]} />
        </View>
      )}
    </ThemeTransitionContext.Provider>
  );
}

export function useThemeTransition(): SwitchThemeFn {
  const ctx = useContext(ThemeTransitionContext);
  if (!ctx) {
    return (themeSwitch: () => void) => {
      themeSwitch();
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
});
