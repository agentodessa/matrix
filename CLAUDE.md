# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator (`expo run:ios`) |
| `npm run web` | Start web dev server |
| `npm run web:build` | Export web to `dist/` |
| `npm run tauri:dev` | Start Tauri macOS app (wraps web build) |
| `npm run tauri:build` | Build Tauri production binary |
| `npx expo export --platform ios` | Bundle iOS for testing compilation |
| `npx expo start --clear` | Start with cleared Metro cache (required after config changes) |
| `npx expo prebuild --platform ios --clean` | Regenerate iOS native project + reinstall pods |
| `cargo install tauri-cli` | Install Tauri CLI (prerequisite for tauri commands) |

No linting or test commands — neither ESLint/Prettier nor a test framework are configured.

## Architecture

**"The Executive"** — Eisenhower Matrix task manager for iOS (Expo) and macOS (Tauri).

### Multi-Platform Strategy
- **iOS**: Expo React Native (native build)
- **macOS**: Tauri v2 wraps Expo's web export (`dist/`)
- **Shared UI**: One React Native codebase, Expo builds both iOS and web
- **Tab layout**: `NativeTabs` (liquid glass tab bar) on iOS, `WebSidebar` on web — switched in `app/(tabs)/_layout.tsx`

### Routing
Expo Router with file-based routing. `app/` directory maps directly to screens:
- `app/(tabs)/` — 5-tab layout: Focus, Tasks, Add, Calendar, Settings
- `app/quadrant/[id].tsx` — dynamic route for quadrant detail
- `app/auth/` — sign-in, sign-up, OAuth callback
- `app/projects.tsx`, `app/paywall.tsx`, `app/profile.tsx` — standalone screens

### Data Model
Tasks have `urgency` (urgent/routine) × `importance` (high/casual) → mapped to 4 Eisenhower quadrants via `getQuadrant()` in `src/types/task.ts`.

### State Management — Dual-Mode Stores
Stores in `src/lib/` use a dual-mode pattern — **not** Redux/Context:
- **Free users**: Local AsyncStorage with closure-based global state + listener pattern
- **Pro users**: Supabase + React Query with optimistic updates

`useTasks()` and `useProjects()` automatically switch based on `useProStatus()`. Both return the same API shape regardless of mode.

React Query config in `src/lib/query-client.tsx`: 30s stale time, 1h GC, cache persisted to AsyncStorage (`@executive_query_cache`).

### Auth & Real-time
- `useAuth()` hook (`src/lib/auth-store.ts`) — Supabase auth with Google OAuth
- `useRealtimeSync()` (`src/lib/realtime-sync.ts`) — Postgres changes subscription for tasks & projects (Pro only), debounced 500ms invalidation

### Pro/Free Feature Gating
- `src/lib/features.ts` — Pro-gated features: `calendarFullView`, `cloudSync`, `unlimitedProjects`
- Free limit: 2 projects (`FREE_PROJECT_LIMIT`)
- `ProGate` component wraps Pro-only UI with upgrade prompt
- `useProStatus()` / `getProUserIdSync()` for checking Pro status
- Payment via `src/lib/mock-payment.ts` — **TODO: replace with real Stripe/Apple Pay**

### Theming
- Design tokens defined in `global.css` using OKLch color space with `@variant light/dark`
- Runtime theme objects in `src/lib/theme.ts` using nativewind `vars()`, applied via `style` on root View
- Theme persisted to AsyncStorage (`@executive_theme`)
- `saveTheme()` / `useThemePersistence()` in `src/lib/theme-store.ts`
- Quadrant colors: Q1 red `#ac0b18`, Q2 blue `#0051d5`, Q3 amber `#874200`, Q4 gray `#737686`
- Fonts: **Manrope** (display/headings), **Inter** (body) — loaded at runtime via `@expo-google-fonts`

### Liquid Glass
`GlassCard` component wraps `expo-glass-effect`'s `GlassView` on iOS 26+, falls back to plain `View` with background on older versions. Detection cached via `isGlassAvailable()`.

### Database
Supabase is the primary backend. Migrations in `supabase/migrations/` define: `subscriptions`, `tasks`, `projects` tables with RLS and realtime enabled. `@neondatabase/serverless` is installed but not yet connected — when wiring up Neon, use the SDK directly (no ORM).

---

## Design Philosophy

See `docs/best-practices/DESIGN.md` for full spec. Key rules:

- **"No-Line" Rule**: Borders are prohibited for sectioning — use background color shifts instead
- **Surface hierarchy**: Base → container-low → container-high → bright (stacked material metaphor)
- **No pure white in dark mode** — use `on-surface` (#e5e2e1)
- **No divider lines between list items** — use spacing (2rem gap)
- **Shadows must be subtle** — tinted with 4% on-surface, never pure black
- **Ghost borders only** — if a border is required for accessibility, use `outline-variant` at 15% opacity

---

## Uniwind (Tailwind CSS v4 for React Native)

### Setup
- `withUniwindConfig` MUST be the outermost wrapper in `metro.config.js`
- Import `global.css` in root layout, NOT in `index.ts`
- Metro config changes require `npx expo start --clear`
- No Babel preset needed

### className Rules

**Supported on all RN core components:** View, Text, Image, ScrollView, TextInput, Pressable, SafeAreaView, Modal, FlatList, SectionList, KeyboardAvoidingView, ActivityIndicator, Switch.

**Special className bindings:**
| Component | Extra Props |
|-----------|-------------|
| ScrollView | `contentContainerClassName` |
| FlatList | `contentContainerClassName`, `columnWrapperClassName`, `ListHeaderComponentClassName`, `ListFooterComponentClassName` |
| TextInput | `placeholderTextColorClassName` (requires `accent-` prefix) |
| Image | `colorClassName` (tint, requires `accent-` prefix) |
| ActivityIndicator | `colorClassName` (requires `accent-` prefix) |
| Switch | `thumbColorClassName`, `trackColorClassName` (requires `accent-` prefix) |
| Modal | `backdropColorClassName` |

### Known Bugs
- **Do NOT use `className="flex-1"` on ScrollView** — breaks rendering. Omit it; ScrollView fills its flex-1 parent automatically.

### What Doesn't Work (Web-Only)
`hover:`, `before:`, `after:`, `group-*`, CSS Grid, `float-*`, `columns-*`, CSS cascade/inheritance.

### What Does Work
`active:`, `disabled:`, `focus:`, `dark:`, `ios:`/`android:`/`web:`/`native:`, `data-[prop=value]:`, responsive breakpoints (`sm:`/`md:`/`lg:`/`xl:`), `gap-*`, `aspect-*`.

### Critical Rules
1. **Styles do NOT inherit** — apply `text-*` directly to `<Text>`, not parent `<View>`
2. **All class names must be visible at build time** — use ternary with full strings, NOT `bg-${color}-500`
3. **`style` overrides `className`** for overlapping properties — use `style` for dynamic runtime values
4. **`withUniwind(Component)` must be at module level** — never inside a render function
5. **CSS functions** (`hairlineWidth()`, `fontScale()`, `pixelRatio()`) must be defined as `@utility` first
6. **CSS variables in JS** via `useCSSVariable()` — variable must be used in a className or defined in `@theme static`
7. **className changes are NOT animated** — use Reanimated `withTiming`/`withSpring` via `style` for transitions
8. **Color props require `accent-` prefix**: `placeholderTextColorClassName="accent-gray-400"`

---

## HeroUI Native

### Provider
```tsx
<GestureHandlerRootView className="flex-1">
  <HeroUINativeProvider>{/* app */}</HeroUINativeProvider>
</GestureHandlerRootView>
```

### Imports
Use granular imports consistently — do NOT mix with main `heroui-native` import:
```tsx
import { Button } from "heroui-native/button";
import { Switch } from "heroui-native/switch";
```

### Component API Quick Reference

**Button** — `variant`, NOT `color`. No `radius` prop.
```tsx
<Button variant="danger" size="md" onPress={handler}>Label</Button>
```
Variants: `"primary"`, `"secondary"`, `"tertiary"`, `"outline"`, `"ghost"`, `"danger"`, `"danger-soft"`. Sizes: `"sm"`, `"md"`, `"lg"`.

**Switch** — `isSelected` + `onSelectedChange`. `<Switch.Thumb />` is REQUIRED.
```tsx
<Switch isSelected={val} onSelectedChange={setVal}><Switch.Thumb /></Switch>
```

**Checkbox** — same selection pattern, compound children required.
```tsx
<Checkbox isSelected={val} onSelectedChange={setVal}>
  <Checkbox.Indicator><Checkbox.IndicatorThumb /></Checkbox.Indicator>
</Checkbox>
```

**TextField + Input/TextArea** — use `onChangeText`, NOT `onChange` (silently fails).
```tsx
<TextField>
  <Label>Email</Label>
  <Input placeholder="..." value={val} onChangeText={setVal} />
  <Description>Helper</Description>
  <FieldError>Error</FieldError>
</TextField>
```

**Card**: `<Card variant="solid"><Card.Body>...</Card.Body></Card>`

**Dialog**: `Dialog` > `Dialog.Trigger` + `Dialog.Portal` > `Dialog.Overlay` + `Dialog.Content` > `Dialog.Close` + `Dialog.Title` + `Dialog.Description`

**BottomSheet**: Same portal pattern as Dialog. Requires `@gorhom/bottom-sheet`.

**Tabs**: `Tabs` > `Tabs.List` > `Tabs.ScrollView` > `Tabs.Indicator` + `Tabs.Trigger` > `Tabs.Label`. Content: `Tabs.Content`.

**Select**: `Select` > `Select.Trigger` + `Select.Portal` > `Select.Content` > `Select.Item`.

**Toast**: `const toast = useToast(); toast.show({ title, description, status, duration })`

**Alert**: `Alert` > `Alert.Indicator` + `Alert.Content` > `Alert.Title` + `Alert.Description`. Status: `"default"`, `"accent"`, `"success"`, `"warning"`, `"danger"`.

### Common Gotchas
1. `Switch.Thumb` is required — without it, nothing renders
2. `Checkbox.Indicator` + `Checkbox.IndicatorThumb` are required
3. Use `onChangeText` for Input/TextArea, NOT `onChange`
4. Use `isSelected`/`onSelectedChange` for Switch/Checkbox, NOT `value`/`onChange`
5. Use `isDisabled` (not `disabled`)
6. Use `onPress` (not `onClick`)
7. `Separator` (not Divider), `ControlField` (not FormField) — renamed in Beta 13
8. All HeroUI components accept `className` for Uniwind styling
9. `feedbackVariant` controls press animation: `"scale-highlight"`, `"scale-ripple"`, `"scale"`, `"none"`
10. Slot-based styling via `styles` prop for multi-part components
