- Your proposal is solid. Sequencing one focused card per stage with a clear progress header and dedicated reasoning panel is a cleaner mental model and reduces cognitive load. Re-using the same space for Structure → Weekly Structure → Daily Workouts avoids the “infinitely long page” trap and aligns with step-by-step and automatic modes.

## **Why weekly structure didn’t appear**
  - The weekly structure request succeeds, but the UI never shows it because the handler only invalidates queries and doesn’t update the active display state or local data.
    - In `handleWeeklyStructureGeneration`, we call `workoutService.generateWeeklyStructure(...)` and then only `invalidateQueries(['workoutPlans'])`. There’s no immediate state update to show a weekly structure card nor a stage switch.
    - The “reasoning” panel updates, but the main card stays at the previous stage. This is a state/display flow issue, not a generation failure.

## **Recommended display flow (works for both step-by-step and automatic)**
  - **Introduce a simple stage flag**: `activeStage: 'structure' | 'weekly' | 'daily'`.
  - **On structure success**:
    - Set `activeStage = 'structure'` and render the structure card.
    - If automatic mode, immediately call weekly structure and set `activeStage = 'weekly'` once the request begins.
  - **On weekly structure success**:
    - Store the returned weekly structure locally (or merge it into `chunkingState.structure` or a `chunkingState.mesocycles[n].weeklyStructure` field).
    - Set `activeStage = 'weekly'` and render a dedicated Weekly Structure card.
    - If automatic mode, immediately call daily workouts; in step-by-step, show the “Generate Daily Workouts” button on the weekly card.
  - **On daily workouts success**:
    - Store daily workouts, then set `activeStage = 'daily'` and render the workouts card.
  - **Reasoning panel always shows** the current stage; clear it when stage changes.

## **Minimal implementation deltas**
  - **Single state switch**:
    - Add `activeStage` to `chunkingState`, with updates at each transition.
  - **Wire API results into UI**:
    - In `handleWeeklyStructureGeneration`, capture the returned payload and set it to state immediately. Do not rely solely on `invalidateQueries` to refresh the display.
    - Optionally still invalidate queries in the background to reconcile server truth.
  - **Conditional card rendering**:
    - Render exactly one of: StructureCard, WeeklyStructureCard, DailyWorkoutsCard based on `activeStage`.
    - Hide prior-stage cards when moving forward.
  - **Automatic mode**:
    - After `structure_complete` → auto-run weekly; after weekly → auto-run daily; keep the progress card visible with stage-specific messaging.
  - **Reasoning log**:
    - Reset entries per stage so it’s always relevant to the current job.
  - **Scroll/Focus**:
    - On stage switch, scroll to the progress card and move keyboard focus to that card’s heading for accessibility.

## **UX improvements worth adding**
  - Loading placeholders per stage to avoid blank flashes on switches.
  - “Back to previous stage” link that only affects display (doesn’t undo data).
  - Sticky progress header that shows stage and percentage.
  - Persist `activeStage` in memory and re-derive from `getGenerationStatus` when the page reloads, so the UI recovers the same stage.

## **Risks and mitigations**
  - Race conditions in automatic mode when users click manual buttons: disable stage actions during an active request.
  - Query invalidation vs local optimistic state: always render from local state first, then reconcile via fresh fetch.

## **Bottom line**
  - Your staged, single-card display is beneficial for UX and simplifies display logic. Implementing `activeStage` with immediate local state updates for weekly structure and daily workouts will resolve the missing-display issue and produce the smoother flow you described.