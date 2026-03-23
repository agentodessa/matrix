# NativeWind v5 — Best Practices & Reference

## Overview

NativeWind v5 (`5.0.0-preview.3`) brings Tailwind CSS v4 to React Native via `react-native-css`. It replaces the JSX transform (v4's `jsxImportSource`) with an import rewrite system — no Babel plugin needed.

## Installation

```bash
npx expo install nativewind@preview react-native-css
npx expo install --dev tailwindcss @tailwindcss/postcss postcss
```

**Pin lightningcss** in `package.json` to avoid deserialization errors:
```json
{
  "overrides": {
    "lightningcss": "1.30.1"
  }
}
```

## Required Peer Versions

| Package | Minimum |
|---------|---------|
| `tailwindcss` | > 4.1.11 |
| `react-native-css` | ^3.0.1 |
| `react` | >= 19 |
| `react-native` | >= 0.81 |
| `@expo/metro-config` | >= 54 |
| `react-native-reanimated` | >= 4 |

## Configuration

### `global.css`
```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@import "nativewind/theme";

@source './app';
@source './src';

/* Your custom tokens here */
```

### `metro.config.js`
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config);
```
No options needed — v5 auto-detects `global.css`.

### `postcss.config.mjs` (NEW — required)
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### `babel.config.js` (SIMPLIFIED)
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // NO nativewind/babel or jsxImportSource needed in v5
  };
};
```

### TypeScript — `nativewind-env.d.ts`
```typescript
/// <reference types="react-native-css/types" />
```
File name must NOT match any folder or `node_modules` directory name.

## Dark Mode (Verified Working Pattern)

### Prerequisites
Set `"userInterfaceStyle": "automatic"` in `app.json`.

### Step 1: Define tokens in `global.css`

Light values go in `@theme`, dark overrides in `@media (prefers-color-scheme: dark)`:

```css
/* Light defaults — registers Tailwind utilities (bg-bg, text-heading, etc.) */
@theme {
  --color-bg: #f7f9fb;
  --color-heading: #2a3439;
}

/* Dark overrides — applied by system/Appearance.setColorScheme() */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0b0f10;
    --color-heading: #e0e4e6;
  }
}
```

**Why this works:** `@theme` registers tokens AND sets light defaults. `@media (prefers-color-scheme: dark)` with `:root` overrides them when dark mode is active. NativeWind intercepts the media query and applies the dark values when `Appearance.colorScheme === "dark"`.

**What does NOT work:**
- `@variant dark` inside `@layer theme` — NativeWind v5 doesn't recognize `light` variant, and `dark` variant alone doesn't reliably switch CSS custom properties
- `@theme inline` with `var()` references — vars are resolved at build time, not runtime
- Bare CSS custom properties inside `@layer theme` without a selector — syntax error

### Step 2: Create runtime theme objects in `theme.ts`

For components that need theme values in JS (e.g., `placeholderTextColor`), use `vars()`:

```typescript
import { vars } from "nativewind";

export const lightTheme = vars({
  "--color-bg": "#f7f9fb",
  "--color-heading": "#2a3439",
});

export const darkTheme = vars({
  "--color-bg": "#0b0f10",
  "--color-heading": "#e0e4e6",
});
```

**Values must match `global.css` exactly.** Both files are the source of truth.

### Step 3: Apply theme vars at root layout

```typescript
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "../src/lib/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeVars = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, themeVars]}>
      <View className="flex-1 bg-bg" style={themeVars}>
        {/* app content */}
      </View>
    </GestureHandlerRootView>
  );
}
```

### Step 4: Toggle theme programmatically

```typescript
import { Appearance } from "react-native";

// Switch to dark
Appearance.setColorScheme("dark");

// Switch to light
Appearance.setColorScheme("light");
```

This triggers both the CSS `@media` overrides AND React re-render (via `useColorScheme()`).

## className Rules

### Supported Components
All RN core components: `View`, `Text`, `Image`, `ScrollView`, `TextInput`, `Pressable`, `SafeAreaView`, `Modal`, `FlatList`, `SectionList`, `KeyboardAvoidingView`, `ActivityIndicator`, `Switch`.

### Special Bindings
| Component | Prop |
|-----------|------|
| `ScrollView` | `contentContainerClassName` |
| `FlatList` | `contentContainerClassName`, `columnWrapperClassName` |
| `TextInput` | `placeholderClassName` (v5 replaces `placeholderTextColorClassName`) |

### Key Rules
1. **Styles do NOT inherit** — apply `text-*` to `<Text>`, not parent `<View>`
2. **All class names must be static** — use ternary, NOT `bg-${color}-500`
3. **`style` overrides `className`** for overlapping properties
4. **No `className="flex-1"` on ScrollView** — breaks rendering
5. **`dark:` variant works** for dark mode classes
6. **`active:` variant works** for press states on Pressable
7. **`ios:` / `android:` / `native:` / `web:` platform variants** work

## Breaking Changes from Uniwind / v4

| Uniwind | NativeWind v5 |
|---------|---------------|
| `withUniwindConfig` | `withNativewind` (no args) |
| `@import 'tailwindcss'` + `@import 'uniwind'` | 4 explicit imports |
| `jsxImportSource: "nativewind"` in babel | Not needed |
| `withUniwind(Component)` HOC | Not needed — import rewriting |
| `useCSSVariable()` | `vars()` from nativewind or CSS variables |
| `Uniwind.setTheme()` | `Appearance.setColorScheme()` from react-native |
| `useUniwind()` | `useColorScheme()` from react-native |

## Troubleshooting

- **`lightningcss` deserialization error**: Pin to `1.30.1` in `overrides`
- **Styles not applying**: Run `npx expo start --clear` after config changes
- **TypeScript errors on className**: Add `nativewind-env.d.ts` reference
- **Variables not switching in dark mode**: Ensure both `@variant light` and `@variant dark` define the same set of `--color-*` variables
