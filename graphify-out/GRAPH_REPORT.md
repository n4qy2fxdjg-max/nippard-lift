# Graph Report - /home/user/nippard-lift  (2026-06-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 383 nodes · 748 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2504465`
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

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 22 edges
2. `CLAUDE.md Project Guide` - 22 edges
3. `useWorkoutStore` - 18 edges
4. `compilerOptions` - 17 edges
5. `compilerOptions` - 16 edges
6. `useToastStore` - 13 edges
7. `getExerciseById()` - 12 edges
8. `useActivityStore` - 10 edges
9. `WorkoutLog` - 10 edges
10. `ActivityLog` - 10 edges

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

## Communities (17 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (51): BuilderItem(), microBtnStyle, Props, ExerciseDetailSheet(), Props, Props, OverloadChart(), Props (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (33): ActivityDetailSheet(), Props, inputStyle, LogActivitySheet(), Props, Props, Toaster(), activityEmoji() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (24): btnStyle, Props, WeightStepper(), formatDuration(), Props, WorkoutDetailSheet(), toWestern(), Onboarding() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (30): COLORS, Props, Props, SheetProps, clearAllNotificationTimers(), clearRestTimer(), clearSetReminder(), requestNotificationPermission (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): dependencies, date-fns, framer-motion, nanoid, react, react-dom, react-router-dom, vite-plugin-pwa (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (31): Activities Static Data (activities.ts), Apple Touch Icon — iOS Home Screen App Logo, CLAUDE.md Project Guide, Epley e1RM Formula, Last-Write-Wins Sync with Tombstone Deletes, MEV-MRV Muscle Volume Targets, Progressive Overload Training Methodology, Progressive Web App (PWA) (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (18): b64url(), b64urlStr(), corsHeaders(), Env, err(), fetch(), generateCode(), handleApi() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (9): BottomNav(), tabs, MuscleVolumeTracker(), MUSCLE_TO_CATEGORY, MuscleTarget, STATUS_COLOR, trailingWeekSets(), VolumeStatus (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (4): ChartPoint, fmt(), LineChart(), Props

## Ambiguous Edges - Review These
- `index.html App Shell` → `SVG Icon Sprite Sheet`  [AMBIGUOUS]
  public/icons.svg · relation: references

## Knowledge Gaps
- **123 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+118 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `index.html App Shell` and `SVG Icon Sprite Sheet`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `useAppStore` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useWorkoutStore` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `getExerciseById()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CLAUDE.md Project Guide` (e.g. with `Deploy CI/CD Workflow` and `README Project Overview`) actually correct?**
  _`CLAUDE.md Project Guide` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _123 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06298904538341157 - nodes in this community are weakly interconnected._