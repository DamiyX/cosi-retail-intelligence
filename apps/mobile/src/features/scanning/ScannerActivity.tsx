import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

/** Decorative framing only; detector scope and acceptance are unchanged. */
export default function ScannerActivity({ active }: { active: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [position] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReducedMotion(value); }).catch(() => { /* Static until motion preference is known. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!active || reducedMotion) return;
    position.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(position, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.linear), useNativeDriver: true }),
      Animated.timing(position, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.linear), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); position.stopAnimation(); };
  }, [active, position, reducedMotion]);
  if (!active) return null;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame} testID="scanner-frame">
    <View testID="scanner-corner-tl" style={[styles.corner, styles.topLeft]} />
    <View testID="scanner-corner-tr" style={[styles.corner, styles.topRight]} />
    <View testID="scanner-corner-bl" style={[styles.corner, styles.bottomLeft]} />
    <View testID="scanner-corner-br" style={[styles.corner, styles.bottomRight]} />
    {!reducedMotion ? <Animated.View testID="scanner-sweep" style={[styles.line, { transform: [{ translateY: position.interpolate({ inputRange: [0, 1], outputRange: [8, 160] }) }] }]} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  frame: { position: 'absolute', left: 24, right: 24, top: 32, height: 176 },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 1, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } },
  topLeft: { left: 0, top: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { right: 0, top: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { left: 0, bottom: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { right: 0, bottom: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  line: { position: 'absolute', left: 6, right: 6, height: 3, backgroundColor: '#61FFDA', borderWidth: 0.5, borderColor: '#153A30' },
});
