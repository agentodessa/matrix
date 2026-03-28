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
| `npm run i18n:extract` | Extract translation keys from source into locale JSONs |
| `npx expo export --platform ios` | Bundle iOS for testing compilation |
| `npx expo start --clear` | Start with cleared Metro cache (required after config changes) |
| `npx expo prebuild --platform ios --clean` | Regenerate iOS native project + reinstall pods |
| `cargo install tauri-cli` | Install Tauri CLI (prerequisite for tauri commands) |

No linting or test commands — neither ESLint/Prettier nor a test framework are configured.

## Code Conventions

### Path Aliases
All imports referencing `src/` must use the `@/` alias, never relative `../../src/` paths:
```tsx
// ✅ Correct
import { useTasks } from "@/lib/store";
import { Header } from "@/components/Header";

// ❌ Wrong
import { useTasks } from "../../src/lib/store";
```
Configured in `tsconfig.json`: `@/*` → `src/*`. Expo resolves this natively (no babel plugin needed).

### Arrow Functions Over Function Declarations
Use `const` with arrow functions for all exports — components, hooks, utilities:
```tsx
// ✅ Correct
export const useAuth = () => { ... };
export const ProfileScreen = () => { ... };
export const formatDate = (date: Date) => { ... };

// ❌ Wrong
export function useAuth() { ... }
export default function ProfileScreen() { ... }
```
Exception: `export default` requires a declaration in Expo Router files (`app/` directory) — use `export default function` there since `export default const` is not valid syntax.

### i18n — Translation Keys
- Use natural English as the key: `t("What needs to be done?")` not `t("add.placeholder.title")`
- Never use dynamic keys like `t(variable)` — the extractor can't find them. Use static keys with a lookup (see `useQuadrantT` pattern)
- Use `{{interpolation}}` for variables: `t("Quadrant {{number}}", { number: "01" })`
- Casing is styling, not content: store `"Best"` not `"BEST"`, apply `uppercase` via className
- Run `npm run i18n:extract` after adding new `t()` calls, then translate empty values in locale files
- Month/weekday names use `toLocaleString(i18n.language)` — not translation keys

---

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
- `asyncRoutes: "production"` enabled for web bundle splitting

### Data Model
Tasks have `urgency` (urgent/routine) × `importance` (high/casual) → mapped to 4 Eisenhower quadrants via `getQuadrant()` in `@/types/task.ts`.

### State Management — Dual-Mode Stores
Stores in `@/lib/` use a dual-mode pattern — **not** Redux/Context:
- **Free users**: Local AsyncStorage with closure-based global state + listener pattern
- **Pro users**: Supabase + React Query with optimistic updates

`useTasks()` and `useProjects()` automatically switch based on `useProStatus()`. Both return the same API shape regardless of mode.

React Query config in `@/lib/query-client.tsx`: 30s stale time, 1h GC, cache persisted to AsyncStorage (`@executive_query_cache`).

### Auth & Real-time
- `useAuth()` hook (`@/lib/auth-store.ts`) — Supabase auth with Google OAuth
- `useRealtimeSync()` (`@/lib/realtime-sync.ts`) — Postgres changes subscription for tasks & projects (Pro only), debounced 500ms invalidation

### Pro/Free Feature Gating
- `@/lib/features.ts` — Pro-gated features: `calendarFullView`, `cloudSync`, `unlimitedProjects`
- Free limit: 2 projects (`FREE_PROJECT_LIMIT`)
- `ProGate` component wraps Pro-only UI with upgrade prompt
- `useProStatus()` / `getProUserIdSync()` for checking Pro status
- Payment via `@/lib/mock-payment.ts` — **TODO: replace with real Stripe/Apple Pay**

### Theming
- Design tokens defined in `global.css` using OKLch color space with `@variant light/dark`
- Runtime theme objects in `@/lib/theme.ts` using nativewind `vars()`, applied via `style` on root View
- Theme + language use optimistic updates — UI changes immediately, AsyncStorage persists in background
- `saveTheme()` / `useThemePersistence()` in `@/lib/theme-store.ts`
- Quadrant colors: Q1 red `#ac0b18`, Q2 blue `#0051d5`, Q3 amber `#874200`, Q4 gray `#737686`
- Fonts: **Manrope** (display/headings), **Inter** (body) — loaded at runtime via `@expo-google-fonts`

### i18n
- `i18next` + `react-i18next` with 4 locales: EN, ES, FR, RU
- Init in `@/lib/i18n.ts`, side-effect imported in root layout
- Locale files: `@/locales/{en,es,fr,ru}.json` — flat structure, natural English keys
- Device locale auto-detected via `expo-localization`, manual override in Settings
- Language picker in `AppearanceSection` component
- Quadrant text translated via `useQuadrantT()` hook (`@/lib/use-quadrant-t.ts`) — memoized Record with static `t()` keys
- `i18next-cli` for extraction: `npm run i18n:extract` → config in `i18next.config.ts`

### Lazy Loading
- `DraggableMatrix` — lazy-loaded via `React.lazy()`, only fetched when Matrix view is selected
- `DateTimePicker` — lazy-loaded, only fetched when date picker is shown
- Web routes split automatically via `asyncRoutes: "production"` in Expo Router config

### Liquid Glass
`GlassCard` component wraps `expo-glass-effect`'s `GlassView` on iOS 26+, falls back to plain `View` with background on older versions. Detection cached via `isGlassAvailable()`.

### Database
Supabase is the primary backend. Migrations in `supabase/migrations/` define: `subscriptions`, `tasks`, `projects` tables with RLS and realtime enabled. `@neondatabase/serverless` is installed but not yet connected — when wiring up Neon, use the SDK directly (no ORM).

### Settings Screen
`app/(tabs)/system.tsx` composes isolated section components from `@/components/settings/`:
- `AccountSection` — user info, auth status
- `SubscriptionSection` — Pro/Free plan
- `AppearanceSection` — dark mode toggle + language picker (owns its own state)
- `OrganizationSection` — projects link
- `DataSection` — cloud sync status
- `AboutSection` — app info

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

