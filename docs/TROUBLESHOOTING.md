# Troubleshooting & Architectural Prevention Rules

This document records the exact root causes of recurring blank screen issues on React Native / Expo Web and the mandatory rules to prevent them.

---

### Root Causes Identified:

1. **Experimental Native-Only Wrappers at Root Level**:
   * **Root Cause**: `@expo/ui` `<Host>` and `expo-router/unstable-native-tabs` are native-only iOS/Android SwiftUI/Jetpack Compose wrappers. When mounted on React Native Web, they fail to provide height/layout to children, causing the entire DOM tree to collapse to `0px` height (a blank screen).
   * **Prevention Rule**: Never wrap `RootLayout` in `@expo/ui` `<Host>`. Use standard `SafeAreaProvider`, `GestureHandlerRootView`, and universal `Tabs` from `expo-router`.

2. **Unsafe Native Glass Imports**:
   * **Root Cause**: Importing `expo-glass-effect` directly without platform checks can throw native module resolution errors on Web during initial screen mounting.
   * **Prevention Rule**: Always wrap native-only module imports in graceful runtime fallbacks (`require('expo-glass-effect')` inside `try/catch`, falling back to standard `View` with CSS `backdrop-filter: blur(...)`).

3. **Indefinite Auth Loading Locks**:
   * **Root Cause**: When `loading` state depends on remote Firestore snapshots, any delayed network connection or missing document causes the root layout to display an empty view forever.
   * **Prevention Rule**: Always provide immediate fallback profile defaults upon login and enforce a fast-release timeout (`setTimeout`) so `loading: false` is released within 800ms.

4. **Web `KeyboardAvoidingView` Height Squishing**:
   * **Root Cause**: `KeyboardAvoidingView` with `behavior="height"` on Web measures window innerHeight and collapses child views.
   * **Prevention Rule**: Only enable `behavior="padding"` on `Platform.OS === 'ios'`, using `undefined` on Web and Android.
