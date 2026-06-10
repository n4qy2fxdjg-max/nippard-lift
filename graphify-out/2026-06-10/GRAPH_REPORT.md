# Graph Report - /home/user/nippard-lift  (2026-06-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 389 nodes · 830 edges · 21 communities (16 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1af8e20e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `useWorkoutStore` - 29 edges
2. `useAppStore` - 24 edges
3. `CLAUDE.md Project Guide` - 22 edges
4. `compilerOptions` - 17 edges
5. `WorkoutLog` - 17 edges
6. `useSyncStore` - 17 edges
7. `compilerOptions` - 16 edges
8. `ActivityLog` - 13 edges
9. `useToastStore` - 13 edges
10. `getExerciseById` - 13 edges

## Surprising Connections (you probably didn't know these)
- `SVG Icon Sprite Sheet` --references--> `index.html App Shell`  [AMBIGUOUS]
  public/icons.svg → index.html
- `CLAUDE.md Project Guide` --references--> `Activities Static Data (activities.ts)`  [EXTRACTED]
  CLAUDE.md → src/data/activities.ts
- `CLAUDE.md Project Guide` --references--> `Exercises Static Data (exercises.ts)`  [EXTRACTED]
  CLAUDE.md → src/data/exercises.ts
- `CLAUDE.md Project Guide` --references--> `Muscle Volume Tracker (muscleVolume.ts)`  [EXTRACTED]
  CLAUDE.md → src/lib/muscleVolume.ts
- `CLAUDE.md Project Guide` --references--> `Featured Programs Static Data (programs.ts)`  [EXTRACTED]
  CLAUDE.md → src/data/programs.ts

## Import Cycles
- 2-file cycle: `src/store/useActivityStore.ts -> src/store/useSyncStore.ts -> src/store/useActivityStore.ts`
- 2-file cycle: `src/store/useBuilderStore.ts -> src/store/useSyncStore.ts -> src/store/useBuilderStore.ts`

## Communities (21 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (46): Builder, Props, Props, OverloadChart(), Props, chipStyle(), EditableItem, groupTabs (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (32): AnimatedRoutes, App, AutoSync, PageFade, SheetProps, btnStyle, Props, WeightStepper() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (33): ActivityDetailSheet(), Props, inputStyle, LogActivitySheet(), Props, Props, activityEmoji(), ActivityType (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (35): dependencies, date-fns, framer-motion, nanoid, react, react-dom, react-router-dom, vite-plugin-pwa (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (24): ActiveWorkout, COLORS, Props, Props, clearAllNotificationTimers(), clearRestTimer(), clearSetReminder(), requestNotificationPermission (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (31): Activities Static Data (activities.ts), Apple Touch Icon — iOS Home Screen App Logo, CLAUDE.md Project Guide, Epley e1RM Formula, Last-Write-Wins Sync with Tombstone Deletes, MEV-MRV Muscle Volume Targets, Progressive Overload Training Methodology, Progressive Web App (PWA) (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (20): Lift PWA Project, b64url(), b64urlStr(), corsHeaders(), err(), fetch(), hasStrId(), isAllowedOrigin() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (10): BuilderItem(), microBtnStyle, Props, BuilderItem, CustomPlan, pushSync(), autoSync(), BuilderStore (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (3): BottomNav, tabs, Layout

### Community 11 - "Community 11"
Cohesion: 0.61
Nodes (6): MUSCLE_TO_CATEGORY, MuscleTarget, STATUS_COLOR, trailingWeekSets, volumeStatus, MuscleVolumeTracker

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (4): ChartPoint, fmt(), LineChart(), Props

## Ambiguous Edges - Review These
- `index.html App Shell` → `SVG Icon Sprite Sheet`  [AMBIGUOUS]
  public/icons.svg · relation: references
- `ReminderScheduler` → `useSyncStore`  [AMBIGUOUS]
  src/worker.ts · relation: conceptually_related_to

## Knowledge Gaps
- **122 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `index.html App Shell` and `SVG Icon Sprite Sheet`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `ReminderScheduler` and `useSyncStore`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useSyncStore` connect `Community 2` to `Community 8`, `Community 1`, `Community 6`, `Community 0`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `useWorkoutStore` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `Community 1` to `Community 0`, `Community 8`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useWorkoutStore` (e.g. with `ActiveWorkout` and `Home`) actually correct?**
  _`useWorkoutStore` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `useAppStore` (e.g. with `Home` and `Onboarding`) actually correct?**
  _`useAppStore` has 3 INFERRED edges - model-reasoned connections that need verification._