import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { C } from '@/lib/theme';

type Callbacks = { onStart: () => void; onMove: (dy: number) => void; onEnd: (dy: number) => void };

// The grip at the left of a row. Press it and slide up or down to move the row.
export function DragHandle(props: Callbacks) {
  // The gesture outlives many re-renders, so it always reads the newest callbacks from here.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // The handlers only read the ref later, when a finger moves, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep hold of the finger even if the list underneath would like to scroll.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => latest.current.onStart(),
      onPanResponderMove: (_e, g) => latest.current.onMove(g.dy),
      onPanResponderRelease: (_e, g) => latest.current.onEnd(g.dy),
      onPanResponderTerminate: (_e, g) => latest.current.onEnd(g.dy),
    })
  );

  return (
    <View {...responder.panHandlers} style={[styles.handle, WEB_NO_SCROLL]} accessibilityLabel="Drag to reorder">
      <Icon name="drag" size={22} color={C.faint} />
    </View>
  );
}

// On the web version this stops the page from scrolling while the grip is being dragged.
const WEB_NO_SCROLL = { touchAction: 'none', userSelect: 'none', cursor: 'grab' } as unknown as ViewStyle;

const styles = StyleSheet.create({
  handle: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
