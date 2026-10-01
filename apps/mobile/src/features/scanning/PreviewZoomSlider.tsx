import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../ui/theme';
import type { usePreviewZoom } from './usePreviewZoom';

/** Opaque contrast surface at the bottom of the decorative framing guide. */
export default function PreviewZoomSlider({ control: { zoom, zoomIn, zoomOut, trackRef, trackWidth, trackHandlers, onAccessibilityAction }, available }: { control: ReturnType<typeof usePreviewZoom>; available: boolean }) {
  return <View style={styles.bar} testID="preview-zoom-bar">
    <View style={styles.magnifier} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.lens} /><View style={styles.handle} />
    </View>
    <Endpoint label="Zoom out" disabled={!available || zoom === 0} onPress={zoomOut} symbol="−" />
    <View ref={trackRef} testID="preview-zoom-track" style={styles.track} collapsable={false}
      accessible accessibilityRole="adjustable" accessibilityLabel="Camera zoom"
      accessibilityState={{ disabled: !available }}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(zoom * 100), text: `${Math.round(zoom * 100)} percent of camera zoom range` }}
      accessibilityActions={[{ name: 'increment', label: 'Increase zoom' }, { name: 'decrement', label: 'Decrease zoom' }]}
      onAccessibilityAction={onAccessibilityAction} {...trackHandlers}>
      <View style={styles.rail} pointerEvents="none" />
      <View testID="preview-zoom-thumb" pointerEvents="none" style={[styles.thumb, { left: zoom * Math.max(0, trackWidth - 20) }]} />
    </View>
    <Endpoint label="Zoom in" disabled={!available || zoom === 1} onPress={zoomIn} symbol="+" />
  </View>;
}

function Endpoint({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.endpoint, disabled && { opacity: 0.55 }]}>
    <View style={styles.horizontal} pointerEvents="none" />
    {symbol === '+' ? <View style={styles.vertical} pointerEvents="none" /> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 24, right: 24, bottom: 32, height: 48, flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.color.textPrimary, borderRadius: theme.radius.field, paddingLeft: 8 },
  magnifier: { width: 20, height: 20 },
  lens: { width: 12, height: 12, borderWidth: 2, borderColor: theme.color.canvas, borderRadius: 6 },
  handle: { position: 'absolute', width: 8, height: 2, backgroundColor: theme.color.canvas, left: 9, top: 12, transform: [{ rotate: '45deg' }] },
  endpoint: { minWidth: theme.minTouchTarget, minHeight: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  horizontal: { width: 14, height: 2, backgroundColor: theme.color.canvas },
  vertical: { position: 'absolute', width: 2, height: 14, backgroundColor: theme.color.canvas },
  track: { flex: 1, minWidth: 48, height: 48 },
  rail: { position: 'absolute', left: 10, right: 10, top: 22, height: 4, backgroundColor: theme.color.border, borderRadius: 2 },
  thumb: { position: 'absolute', top: 14, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.color.canvas },
});
