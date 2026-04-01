`shared/context` currently owns provider composition, Firebase hydration, and the app-facing hooks layered on top of the app-wide Zustand store.

Short term:
- `AppContext` remains the main app-facing API (`useApp`) while the underlying state now lives in Zustand.
- `AuthContext`, `HRContext`, and `ToastContext` remain shared providers.

Medium term:
- If the app-facing hooks shrink further, this folder can evolve toward a thinner `shared/state` or `shared/store` boundary.
- Firebase sync and store logic should stay clearly separated during that migration.
