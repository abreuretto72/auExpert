# auExpert Responsiveness Codemap

**Last Updated:** 2026-03-31
**Status:** Complete system implemented (rs, fs, wp, hp)

---

## Rule #1: NEVER Hardcode Pixels

**This is non-negotiable.**

```typescript
// ❌ NEVER EVER DO THIS
const styles = StyleSheet.create({
  container: { width: 390, padding: 16, fontSize: 14 },
  button: { height: 56, borderRadius: 12 },
});

// ✅ ALWAYS DO THIS
import { rs, fs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  container: { width: '100%', padding: rs(16), fontSize: fs(14) },
  button: { height: rs(56), borderRadius: rs(12) },
});
```

**Why?**

The app runs on devices from iPhone SE (320px) to iPad Mini (744px). Fixed pixels:
- iPhone SE: button with `height: 56` looks massive
- iPad Mini: button with `height: 56` looks tiny
- Users on different devices get broken experience

Responsive scaling fixes this automatically.

---

## Design Base

**iPhone 14:** 390px wide (reference device)

| Device | Width | Scale |
|--------|-------|-------|
| iPhone SE / Android compact | 320px | **0.82x** |
| iPhone 14 / Android standard | 390px | **1.0x** (base) |
| iPhone Pro Max | 428px | **1.10x** |
| iPad Mini | 744px | **1.91x** |

**Calculation:**
```
Device width: 320px
Base width: 390px
Scale: 320 / 390 = 0.82

rs(100) on SE: 100 × 0.82 = 82px
rs(100) on 14: 100 × 1.0 = 100px
rs(100) on Pro Max: 100 × 1.10 = 110px
rs(100) on iPad: 100 × 1.91 = 191px
```

---

## Functions in `hooks/useResponsive.ts`

### `rs(size)` — Responsive Size

**Scales all dimensions proportionally.**

Used for:
- `width`, `height`, `padding`, `margin`, `gap`, `borderRadius`
- Icon sizes (`<Icon size={rs(24)} />`)
- Line heights, shadows

```typescript
import { rs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: rs(16),         // 16 * scale
    marginBottom: rs(24),    // 24 * scale
    borderRadius: rs(12),    // 12 * scale
  },
  button: {
    height: rs(56),          // 56 * scale
    paddingHorizontal: rs(20),
  },
  icon: {
    width: rs(28),
    height: rs(28),
  },
  text: {
    lineHeight: rs(24),      // spacing between lines
  },
  shadow: {
    shadowOffset: { width: 0, height: rs(4) },  // shadow depth scales
    shadowRadius: rs(12),
  },
});
```

### `fs(size)` — Font Size

**Scales text with accessibility limits.**

Used for:
- `fontSize` ONLY
- Includes min/max bounds (12px–22px)
- Respects system font scale setting

```typescript
import { fs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  title: {
    fontSize: fs(22),        // 22 * scale, clamped to [12, 22]
    fontWeight: '700',
  },
  body: {
    fontSize: fs(14),        // 14 * scale, clamped to [12, 22]
  },
  caption: {
    fontSize: fs(11),        // 11 * scale, clamped to [12, 22]
    // Note: will clamp to 12px min for accessibility
  },
});
```

**Accessibility note:** Font scale respects iOS/Android system settings. Users with accessibility needs can enlarge text without breaking layout.

### `wp(percentage)` — Width Percentage

**Percentage-based width (alternative to flexbox).**

Used for:
- Width based on screen percentage
- More intuitive for designers than flex

```typescript
import { wp } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  card: {
    width: wp(90),           // 90% of screen width
    marginHorizontal: 'auto',
  },
  column: {
    width: wp(48),           // 48% of screen (2-column grid)
    marginHorizontal: rs(8),
  },
  wideButton: {
    width: wp(100),          // full width
  },
});
```

### `hp(percentage)` — Height Percentage

**Percentage-based height.**

Used for:
- Height based on screen percentage
- Useful for modals, full-screen sections

```typescript
import { hp } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  modal: {
    height: hp(80),          // 80% of screen height
  },
  header: {
    height: hp(25),          // 25% of screen height
  },
  footer: {
    height: hp(15),
  },
});
```

---

## Layout Helpers in `lib/responsive.ts`

### `useContentWidth()`

**Max content width with horizontal padding.**

Returns safe content width for all screen sizes.

```typescript
import { useContentWidth } from '../lib/responsive';

export default function MyScreen() {
  const contentWidth = useContentWidth();

  return (
    <ScrollView>
      <View style={{ width: contentWidth, alignSelf: 'center' }}>
        {/* Content auto-centered, never too wide */}
      </View>
    </ScrollView>
  );
}
```

**Usage:** Detail screens, form layouts, content cards.

### `useCalendarCellWidth()`

**Width of each calendar cell in grid.**

For calendar views, heat maps, matrices.

```typescript
import { useCalendarCellWidth } from '../lib/responsive';

export default function CalendarScreen() {
  const cellWidth = useCalendarCellWidth(7);  // 7 columns

  const days = Array.from({ length: 42 }, (_, i) => (
    <View key={i} style={{ width: cellWidth, aspectRatio: 1 }}>
      <Text>{i % 7}</Text>
    </View>
  ));

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {days}
    </View>
  );
}
```

### `useGridColumnWidth(columnCount)`

**Width for grid items.**

For dynamic grid layouts.

```typescript
import { useGridColumnWidth } from '../lib/responsive';

export default function GalleryScreen() {
  const columnWidth = useGridColumnWidth(3);  // 3 columns

  return (
    <FlatList
      numColumns={3}
      data={photos}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item.url }}
          style={{ width: columnWidth, height: columnWidth }}
        />
      )}
    />
  );
}
```

### `useSafeBottom()`

**Safe area bottom (home indicator clearance on iPhone).**

```typescript
import { useSafeBottom } from '../lib/responsive';

export default function ScreenWithFooter() {
  const safeBottom = useSafeBottom();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView>
        <Text>Content</Text>
      </ScrollView>

      {/* Footer with home indicator clearance */}
      <View style={{ paddingBottom: safeBottom }}>
        <Button title="Submit" />
      </View>
    </View>
  );
}
```

**Alternative:** Use `SafeAreaView` from `react-native-safe-area-context` (simpler, recommended).

### `useFontScale()`

**Gets the system font scale multiplier.**

For custom text sizing logic.

```typescript
import { useFontScale } from '../lib/responsive';

export default function CustomText() {
  const fontScale = useFontScale();

  // fontScale = 1.0 (normal)
  // fontScale = 1.25 (large text, accessibility)
  // fontScale = 1.5 (extra large)

  return (
    <Text style={{ fontSize: 14 * fontScale }}>
      Respects accessibility settings
    </Text>
  );
}
```

---

## Real-World Examples

### Example 1: Card Layout

```typescript
import { StyleSheet } from 'react-native';
import { rs, fs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: rs(16),        // scales with device
    padding: rs(16),             // scales
    marginHorizontal: rs(12),    // scales
    shadowOffset: { width: 0, height: rs(4) },  // shadow scales
    shadowRadius: rs(12),        // shadow scales
  },
  cardTitle: {
    fontSize: fs(16),            // scales with device
    fontWeight: '700',
    marginBottom: rs(8),
  },
  cardBody: {
    fontSize: fs(13),            // scales
    lineHeight: rs(20),          // line height scales
    color: colors.textSec,
  },
});

export default function PetCard({ pet }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{pet.name}</Text>
      <Text style={styles.cardBody}>Cão • 5 anos • 25 kg</Text>
    </View>
  );
}
```

**iPhone SE (0.82x):**
- cardTitle: 13.1px
- padding: 13.1px
- borderRadius: 13.1px

**iPhone 14 (1.0x):**
- cardTitle: 16px
- padding: 16px
- borderRadius: 16px

**iPad (1.91x):**
- cardTitle: 30.6px
- padding: 30.6px
- borderRadius: 30.6px

---

### Example 2: Bottom Navigation

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rs } from '../hooks/useResponsive';

export default function PetBottomNav() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection: 'row',
      height: rs(60) + insets.bottom,  // nav height + home indicator
      paddingBottom: insets.bottom,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    }}>
      {/* tabs */}
    </View>
  );
}
```

**iPhone SE:**
- height: 49px (60 * 0.82) + 0

**iPhone 14:**
- height: 60px (60 * 1.0) + 0

**iPhone 14 Pro:**
- height: 60px + 34px (home indicator) = 94px

---

### Example 3: Two-Column Grid

```typescript
import { wp } from '../hooks/useResponsive';

export default function TwoColumnLayout({ items }) {
  return (
    <View style={{ flexDirection: 'row', gap: rs(12), flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <View key={i} style={{ width: wp(48) - rs(6) }}>
          <Card item={item} />
        </View>
      ))}
    </View>
  );
}
```

**Logic:**
- Each column: 48% of screen
- Gap between: 12px (responsive)
- Subtract half gap: `wp(48) - rs(6)`

**Layout:**
```
┌─────────────────────────────────────────┐
│  [Col 1: 48%]  gap  [Col 2: 48%]        │
│         -6px       -6px                   │
└─────────────────────────────────────────┘
```

---

### Example 4: Input Field (Always Uses rs)

```typescript
import { rs, fs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: rs(14),        // responsive
    paddingHorizontal: rs(16),   // responsive
    paddingVertical: rs(12),     // responsive
    height: rs(56),              // responsive
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  icon: {
    marginRight: rs(10),         // responsive
    width: rs(20),
    height: rs(20),
  },
  input: {
    flex: 1,
    fontSize: fs(15),            // responsive + accessibility
    color: colors.text,
    paddingVertical: 0,
  },
});
```

---

## Common Mistakes

### ❌ Mistake 1: Hardcoding in StyleSheet

```typescript
// WRONG
const styles = StyleSheet.create({
  button: { height: 56, padding: 16, fontSize: 14 },
});

// CORRECT
import { rs, fs } from '../hooks/useResponsive';

const styles = StyleSheet.create({
  button: { height: rs(56), padding: rs(16), fontSize: fs(14) },
});
```

### ❌ Mistake 2: Using `Dimensions.get()` (not reactive)

```typescript
// WRONG — doesn't re-render on rotation
const screenWidth = Dimensions.get('window').width;
const styles = StyleSheet.create({
  card: { width: screenWidth * 0.9 },
});

// CORRECT — reacts to rotation
import { useWindowDimensions } from 'react-native';

export default function MyComponent() {
  const { width } = useWindowDimensions();  // reactive!

  return (
    <View style={{ width: width * 0.9 }}>
      {/* Automatically re-renders on rotation */}
    </View>
  );
}
```

### ❌ Mistake 3: Mixing Fixed and Responsive

```typescript
// WRONG — inconsistent
const styles = StyleSheet.create({
  card: {
    padding: 16,              // fixed ❌
    marginBottom: rs(24),     // responsive ✅
    borderRadius: rs(12),     // responsive ✅
  },
});

// CORRECT — all responsive
const styles = StyleSheet.create({
  card: {
    padding: rs(16),          // responsive ✅
    marginBottom: rs(24),     // responsive ✅
    borderRadius: rs(12),     // responsive ✅
  },
});
```

### ❌ Mistake 4: Not Accounting for Safe Area

```typescript
// WRONG — content goes under home indicator on iPhone
<View style={{ height: rs(60) }}>
  <Button title="Submit" />
</View>

// CORRECT — home indicator clearance
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Footer() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: rs(60) + insets.bottom, paddingBottom: insets.bottom }}>
      <Button title="Submit" />
    </View>
  );
}
```

---

## Safe Area Insets (for iPhone notches + home indicator)

**The correct way:**

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeComponent() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,        // notch clearance
        paddingBottom: insets.bottom,  // home indicator
        paddingLeft: insets.left,      // dynamic island on ultra
        paddingRight: insets.right,    // dynamic island on ultra
      }}
    >
      Content is safe from notch/home indicator
    </View>
  );
}
```

**Or use the convenience component:**

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafeComponent() {
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
      Content is automatically safe
    </SafeAreaView>
  );
}
```

---

## Implementation Checklist

Before committing, verify:

- [ ] **No hardcoded pixels in StyleSheet**
  - Search for `{ \d+` in your code (regex to find numbers in style objects)
  - All sizes use `rs()`, `fs()`, `wp()`, or `hp()`

- [ ] **Icons scale responsively**
  - `<Icon size={rs(24)} />` not `<Icon size={24} />`

- [ ] **Shadows scale responsively**
  - `shadowRadius: rs(12)` not `shadowRadius: 12`

- [ ] **Safe area insets used**
  - Bottom nav uses `useSafeAreaInsets()`
  - Full-screen modals account for notch

- [ ] **Works on all devices**
  - Test on iPhone SE simulator (smallest)
  - Test on iPad simulator (largest)
  - Test in portrait and landscape

---

## Debugging Responsiveness

### Check Device Scale

```typescript
import { useWindowDimensions } from 'react-native';
import { getResponsiveScale } from '../lib/responsive';

export default function DebugScreen() {
  const { width } = useWindowDimensions();
  const scale = getResponsiveScale();

  return (
    <View>
      <Text>Screen width: {width}px</Text>
      <Text>Scale factor: {scale}x</Text>
      <Text>Calculated rs(100): {100 * scale}px</Text>
    </View>
  );
}
```

### Log Responsive Values

```typescript
import { rs, fs, wp, hp } from '../hooks/useResponsive';

console.log({
  rs_100: rs(100),
  fs_14: fs(14),
  wp_50: wp(50),
  hp_50: hp(50),
});

// Output on iPhone SE (0.82x):
// { rs_100: 82, fs_14: 11.48, wp_50: 160, hp_50: 330 }

// Output on iPad (1.91x):
// { rs_100: 191, fs_14: 26.74, wp_50: 372, hp_50: 759 }
```

---

**Related Docs:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
- [CLAUDE.md](../CLAUDE.md) — Spec section 10.1
- [README.md](../../README.md) — Setup
