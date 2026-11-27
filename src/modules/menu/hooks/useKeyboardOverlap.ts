// src/modules/menu/hooks/useKeyboardOverlap.ts
//
// How many pixels of a view the on-screen keyboard covers — measured once per
// keyboard show/hide, with no layout animation and no feedback loop.
//
// Replaces KeyboardAvoidingView for the item form sheet. Inside an (edge-to-edge)
// Modal the Android window doesn't resize for the keyboard, so KAV
// behavior="height" kept re-deriving the container height from its own layout
// and the keyboard, animating every change globally with LayoutAnimation. The
// sheet's height was a percentage of that container, so every keyboard event
// (focus, switching between the text and number keyboards, an alert stealing
// focus, closing after save) resized AND moved the whole sheet — the
// "screen shaking / jumping" vendors saw while adding an item.
//
// Works whether or not the window resizes: if it does, the view already ends
// above the keyboard and the overlap is simply 0.

import { useEffect, useState, type RefObject } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

export function useKeyboardOverlap(rootRef: RefObject<View | null>, active: boolean): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (!active) {
      setOverlap(0);
      return;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, e => {
      const keyboardTop = e.endCoordinates.screenY;
      const node = rootRef.current;
      if (!node) return;
      node.measureInWindow((_x, y, _w, h) => {
        const next = Math.max(0, Math.round(y + h - keyboardTop));
        setOverlap(prev => (prev === next ? prev : next));
      });
    });
    const hide = Keyboard.addListener(hideEvt, () => setOverlap(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, [rootRef, active]);

  return overlap;
}
