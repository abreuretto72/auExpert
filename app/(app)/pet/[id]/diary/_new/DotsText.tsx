/**
 * DotsText — animated trailing dots for the overlay title, extracted verbatim
 * from app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same props, same effect, same render —
 * imported back into new.tsx via `import { DotsText } from './_new/DotsText'`.
 */
import React from 'react';
import { Text, Animated } from 'react-native';

export function DotsText({
  baseText,
  dotsAnim,
  style,
}: {
  baseText: string;
  dotsAnim: Animated.Value;
  style?: object;
}) {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const id = dotsAnim.addListener(({ value }) => {
      setDots('.'.repeat(Math.round(value)));
    });
    return () => dotsAnim.removeListener(id);
  }, [dotsAnim]);

  return <Text style={style}>{baseText}{dots}</Text>;
}
