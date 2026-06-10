# Graph Report - .  (2026-06-10)

## Corpus Check
- Corpus is ~46,821 words - fits in a single context window. You may not need a graph.

## Summary
- 401 nodes · 805 edges · 24 communities (16 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Exercise UI & Library|Exercise UI & Library]]
- [[_COMMUNITY_App Shell & Routing|App Shell & Routing]]
- [[_COMMUNITY_Activity Logging & PWA|Activity Logging & PWA]]
- [[_COMMUNITY_Dependencies & Config|Dependencies & Config]]
- [[_COMMUNITY_PR Celebration & Rest Timer|PR Celebration & Rest Timer]]
- [[_COMMUNITY_Cloudflare Worker & Sync API|Cloudflare Worker & Sync API]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_Builder & Volume Tracker|Builder & Volume Tracker]]
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_State Sync Stores|State Sync Stores]]
- [[_COMMUNITY_Sheet System & Page Transitions|Sheet System & Page Transitions]]
- [[_COMMUNITY_Bottom Navigation|Bottom Navigation]]
- [[_COMMUNITY_App Icons & HTML Shell|App Icons & HTML Shell]]
- [[_COMMUNITY_Line Chart|Line Chart]]
- [[_COMMUNITY_Heatmap Grid|Heatmap Grid]]
- [[_COMMUNITY_Claude Launch Config|Claude Launch Config]]
- [[_COMMUNITY_Claude Hooks Config|Claude Hooks Config]]
- [[_COMMUNITY_TypeScript Root Config|TypeScript Root Config]]
- [[_COMMUNITY_Push Notifications & README|Push Notifications & README]]
- [[_COMMUNITY_Activity Static Data|Activity Static Data]]
- [[_COMMUNITY_CI Deploy Workflow|CI Deploy Workflow]]

## God Nodes (most connected - your core abstractions)
1. `useWorkoutStore` - 32 edges
2. `useAppStore` - 28 edges
3. `useSyncStore` - 19 edges
4. `WorkoutLog` - 17 edges
5. `compilerOptions` - 17 edges
6. `compilerOptions` - 16 edges
7. `useLibraryStore` - 15 edges
8. `useToastStore` - 14 edges
9. `ActivityLog` - 13 edges
10. `getExerciseById()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Lift PWA Project` --references--> `MUSCLE_TARGETS`  [EXTRACTED]
  /home/user/nippard-lift/CLAUDE.md → src/lib/muscleVolume.ts
- `Lift PWA Project` --references--> `useSyncStore`  [EXTRACTED]
  /home/user/nippard-lift/CLAUDE.md → src/store/useSyncStore.ts
- `Toaster` --calls--> `useToastStore`  [INFERRED]
  /home/user/nippard-lift/src/components/Toaster.tsx → src/store/useToastStore.ts
- `Lift PWA Project` --references--> `useWorkoutStore`  [EXTRACTED]
  /home/user/nippard-lift/CLAUDE.md → src/store/useWorkoutStore.ts
- `WorkoutCard` --references--> `WorkoutLog`  [INFERRED]
  /home/user/nippard-lift/src/components/WorkoutCard.tsx → src/types/index.ts

## Import Cycles
- 2-file cycle: `src/store/useActivityStore.ts -> src/store/useSyncStore.ts -> src/store/useActivityStore.ts`
- 2-file cycle: `src/store/useBuilderStore.ts -> src/store/useSyncStore.ts -> src/store/useBuilderStore.ts`

## Communities (24 total, 8 thin omitted)

### Community 0 - "Exercise UI & Library"
Cohesion: 0.07
Nodes (48): ExerciseDetailSheet(), Props, Props, OverloadChart(), Props, chipStyle(), EditableItem, groupTabs (+40 more)

### Community 1 - "App Shell & Routing"
Cohesion: 0.05
Nodes (36): ActiveWorkout, AnimatedRoutes, App, AutoSync, BottomNav, Builder, btnStyle, Props (+28 more)

### Community 2 - "Activity Logging & PWA"
Cohesion: 0.08
Nodes (33): ActivityDetailSheet(), Props, inputStyle, LogActivitySheet(), Props, Props, Toaster(), ACTIVITY_TYPES (+25 more)

### Community 3 - "Dependencies & Config"
Cohesion: 0.06
Nodes (35): dependencies, date-fns, framer-motion, nanoid, react, react-dom, react-router-dom, vite-plugin-pwa (+27 more)

### Community 4 - "PR Celebration & Rest Timer"
Cohesion: 0.11
Nodes (24): COLORS, Props, Props, clearAllNotificationTimers(), clearRestTimer(), clearSetReminder(), requestNotificationPermission, scheduleRestDoneNotification() (+16 more)

### Community 5 - "Cloudflare Worker & Sync API"
Cohesion: 0.13
Nodes (25): Lift PWA Project, b64url(), b64urlStr(), corsHeaders(), Env, err(), fetch(), generateCode() (+17 more)

### Community 6 - "TypeScript App Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 7 - "Builder & Volume Tracker"
Cohesion: 0.17
Nodes (16): BuilderItem(), microBtnStyle, Props, MuscleVolumeTracker(), getExerciseById(), getExerciseById, MUSCLE_TARGETS, MUSCLE_TO_CATEGORY (+8 more)

### Community 8 - "TypeScript Node Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 9 - "State Sync Stores"
Cohesion: 0.23
Nodes (7): pushSync(), autoSync(), BuilderStore, useBuilderStore, SyncStore, BuilderItem, CustomPlan

### Community 10 - "Sheet System & Page Transitions"
Cohesion: 0.23
Nodes (7): PageFade, SheetProps, anim, colors, font, radius, z

### Community 12 - "App Icons & HTML Shell"
Cohesion: 0.29
Nodes (8): Apple Touch Icon — iOS Home Screen App Logo, Favicon Dumbbell SVG Icon, SVG Icon Sprite Sheet, index.html App Shell, React App Main Entry (main.tsx), PWA App Icon 192px, PWA App Icon 512px, PWA Maskable App Icon 512px

### Community 13 - "Line Chart"
Cohesion: 0.50
Nodes (4): ChartPoint, fmt(), LineChart(), Props

## Ambiguous Edges - Review These
- `useSyncStore` → `ReminderScheduler`  [AMBIGUOUS]
  /home/user/nippard-lift/src/worker.ts · relation: conceptually_related_to
- `index.html App Shell` → `SVG Icon Sprite Sheet`  [AMBIGUOUS]
  /home/user/nippard-lift/public/icons.svg · relation: references

## Knowledge Gaps
- **131 isolated node(s):** `version`, `configurations`, `PreToolUse`, `name`, `private` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `useSyncStore` and `ReminderScheduler`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `index.html App Shell` and `SVG Icon Sprite Sheet`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `useSyncStore` connect `App Shell & Routing` to `Exercise UI & Library`, `State Sync Stores`, `Activity Logging & PWA`, `Cloudflare Worker & Sync API`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `ReminderScheduler` connect `Cloudflare Worker & Sync API` to `App Shell & Routing`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `useWorkoutStore` connect `Exercise UI & Library` to `App Shell & Routing`, `Activity Logging & PWA`, `PR Celebration & Rest Timer`, `Cloudflare Worker & Sync API`, `Builder & Volume Tracker`, `State Sync Stores`, `Bottom Navigation`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useWorkoutStore` (e.g. with `ActiveWorkout` and `Home`) actually correct?**
  _`useWorkoutStore` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `useAppStore` (e.g. with `Home` and `Onboarding`) actually correct?**
  _`useAppStore` has 3 INFERRED edges - model-reasoned connections that need verification._