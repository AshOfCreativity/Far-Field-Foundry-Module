# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Foundry VTT module (`id: Far-Field-Foundry-Module-main`, title "LANCER Far Field Sheets") that adds Far Field
character sheets, Ranger-class vessel sheets, squad progression pools, and a hazard-entity LCP importer on top of the
**LANCER system** (`relationships.systems: lancer >= 2.0.0`). Foundry compatibility: minimum 11, verified 12.

Vanilla ES modules + Handlebars + one hand-written CSS file. **There is no build step, no bundler, no linter, no test
suite, and no `package.json`** — the files in the repo are exactly what Foundry loads.

The `-main` suffix on the module id is deliberate: it must equal the folder name GitHub produces when you download the
repo zip (`<repo>-main`). Nearly every template and asset path in the code is hardcoded as
`modules/Far-Field-Foundry-Module-main/...`, so renaming the id or the installed folder silently breaks template and
image lookups.

## Development workflow

- **Install for dev:** copy or symlink this repo into Foundry's data dir as `Data/modules/Far-Field-Foundry-Module-main`
  (Windows `%localappdata%/FoundryVTT/Data/modules/`, macOS `~/Library/Application Support/FoundryVTT/Data/modules/`,
  Linux `~/.local/share/FoundryVTT/Data/modules/`). The folder name must match the module id.
- **Iterate:** edit a `.mjs` / `.hbs` / `.css`, then reload the Foundry world (F5). Handlebars templates and the
  stylesheet are cached per-session, so a reload is required for every change — there is no hot reload.
- **Verify:** the module logs everything with a `Far-Field-Foundry-Module-main | ` prefix to the browser console (F12).
  Look for `Init complete`, `Registered pilot sheets: [...]`, and per-feature error lines.
- **Manual smoke test** after touching registration or load order: open the Actors sidebar (New Vessel / New Character
  buttons appear), create one of each, and confirm "Ranger Vessel Sheet" / "Far Field Character Sheet" are present in
  right-click → Configure Sheet.
- **Macro/console API:** `game.modules.get("Far-Field-Foundry-Module-main")` carries `createVessel`, `createCharacter`,
  `isVessel`, `isCharacter`, `getVesselData`, `getCharacterData`, `updateVesselData`, `updateCharacterData`,
  `setFarFieldGear`, `importHazardEntities`, `getAvailableVesselQualities`, `openSquadPools`, `getSquadPools`, plus the
  static data tables. Attached in the `ready` hook.
- **Releasing:** bump `version` in `module.json` and push `main`. `manifest`/`download` point at
  `raw.githubusercontent.com/.../main/module.json` and the GitHub zip of `main`, so `main` *is* the release channel.

## Load order and hook flow (the part that historically breaks)

`module.json` declares `esmodules: ["scripts/main.mjs"]` and `scripts: ["scripts/lib/jszip.min.js"]` (JSZip loads as a
plain global and is referenced as bare `JSZip` by the LCP importer only).

- **`scripts/constants.mjs` must stay import-free.** `MODULE_ID` and `FLAGS` live there specifically to break a
  circular-import temporal-dead-zone crash: `squad-pools-app.mjs` reads `MODULE_ID` at module-evaluation time to build
  its socket channel name, and when those constants lived in the entry module (`main.mjs`, whose body runs *last*) the
  read threw `Cannot access 'MODULE_ID' before initialization` and aborted the whole module. `main.mjs` re-exports them
  for back-compat. Do not move them back, and do not add imports to `constants.mjs`.
- **`init`** calls `registerFarFieldSheets()` first and alone; every other feature (Handlebars helpers, journal page
  data models + sheets, module-object data, squad-pool settings) sits in its own `try/catch` so an optional failure can
  never prevent the sheets from registering.
- **`ready`** calls `registerFarFieldSheets()` **again** — this is intentional, not redundant. LANCER rebuilds its own
  sheet registration during startup and can drop the module's `pilot` entries from `CONFIG.Actor.sheetClasses`, which
  makes the sheets vanish from Configure Sheet with no error. `ready` also runs a GM-only self-heal loop that re-points
  `core.sheetClass` on flagged actors (system migrations wipe it), registers the squad-pool socket, and seeds the
  vessel-qualities compendium if empty.
- **Sheet classes extend the Foundry globals (`ActorSheet`, `JournalPageSheet`, `Application`) directly at import
  time.** This is the resolution of a run of failed fixes (git history: "resolve every sheet base at import safely",
  "Bind sheet bases at init, not import time", "Restore Far Field sheets: extend base classes directly"). Do not
  reintroduce lazy/deferred base binding.
- **UI hooks** (all in `main.mjs`, all guarded by `game.system.id !== "lancer"` where they touch the system):
  `renderActorDirectory` (New Vessel / New Character buttons), `renderJournalDirectory` (Import Hazard Entities / New
  Vessel Quality), `renderItemSheet` (injects the Far Field gear toggle into `reserve` / `pilot_gear` / `pilot_weapon` /
  `pilot_armor` sheets), `getSceneControlButtons` (Squad Pools tool under the `notes` control), `preCreateActor`
  (default icons). These use **Foundry v12 APIs** — jQuery `html.find(...)` and the array-shaped `controls` argument —
  both of which change in v13.

## Data model: everything lives in actor/item flags

Foundry does not let a module add new actor types to an existing system, so both sheets attach to LANCER **`pilot`**
actors and store all Far Field state in flags. Pilot (rather than deployable) was chosen so LANCER's native reserves
system works on the Cargo tab. *(README.md still says "deployable actors" — stale.)*

| Where | Flag | Shape |
| --- | --- | --- |
| Actor | `flags[MODULE_ID].isVessel` / `.vessel` | `getDefaultVesselData()` in `main.mjs` — class, qualities, crew, passengers, hull/supplies tracks, systemsStatus, missionLog, sharedSupplies |
| Actor | `flags[MODULE_ID].isCharacter` / `.character` | `getDefaultCharacterData()` — edges (id strings), backgrounds, skills map, aspects, resources, drives, burdens, milestones, progressionLog |
| Item | `flags[MODULE_ID].isFarFieldGear` / `.track` / `.marked` / `.burned` | set by the `renderItemSheet` toggle and the Cargo tab |

There is **no DataModel or schema validation on actor flags** — shape is enforced only by the `getDefault*Data()`
factories and the sheets. Always read through the sheet's `vesselData` / `characterData` getter and write through
`updateVesselData` / `updateCharacterData` (deep-merge, then a single `setFlag` of the whole object). Avoid partial
`setFlag("...", "vessel.crew.0.name", x)` paths.

**Journal pages, by contrast, are typed.** `CONFIG.JournalEntryPage.dataModels` gets `${MODULE_ID}.hazardEntity`
(`HazardEntityPageModel`) and `${MODULE_ID}.vesselQuality` (`VesselQualityPageModel`); page `type` strings must always
be MODULE_ID-namespaced. `DocumentSheetConfig` is resolved defensively as
`foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig` for v12/v13.

## Sheet architecture

`VesselSheet` (7 tabs: overview/qualities/crew/passengers/status/cargo/log) and `CharacterSheet` (8 tabs:
overview/edges/backgrounds/skills/aspects/resources/drives/progression) both extend `ActorSheet` and register with
`types: ["pilot"], makeDefault: false`.

They are fully hand-rolled: `getData()` builds the entire render context, `activateListeners()` wires one jQuery handler
per CSS class, and **all Far Field state is written by explicit `_on*` handlers, not by the form-submit pipeline**
(there is no `_updateObject` override; only actor-level `name`/`img` inputs ride the standard `DocumentSheet` submit).

Conventions to follow when adding features:

- **Field-name prefixes dispatch handlers:** inputs named `vessel.*`, `crew.<i>.<field>`, `passenger.*`, `drive.*` are
  bound by prefix selector in `activateListeners`.
- **Track boxes are universal:** aspects, resources, burdens, shared supplies, Far Field gear, and hazard tracks all use
  left-click = **mark**, right-click (`contextmenu`) = **burn**. Each is a "clicked box N" toggle — clicking at or below
  the current level sets it to `N-1`, above sets it to `N` — with the invariant `marked >= burned` restored after every
  write. Copy this pattern rather than inventing a new one.
- **LANCER disables Foundry's standard dragDrop**, so `VesselSheet._setupDropHandlers` attaches raw HTML5
  `dragover`/`drop` listeners to `.reserves-list`, `.crew-list`, `.passenger-list` and parses the `text/plain` JSON
  payload itself.
- **Cross-actor writes:** `CharacterSheet` renders the shared supplies of any vessel that lists it as crew and writes
  *directly to that vessel actor's flags*, so the clicking user must own the vessel actor (no socket fallback here,
  unlike squad pools). It also registers an `updateActor` hook in `_render` (unregistered in `close`) to live-refresh
  when a crewed vessel changes, and repairs legacy web-app imports that stored edges as objects instead of id strings.
- **Chat cards** all go through `postFeatureToChat` in `chat.mjs`; `.chat-feature` handlers are bound *before* the
  `isEditable` early-return so non-owners can still post.
- `SquadPoolsApp` is a plain `Application` singleton opened via `openSquadPools()`.

## Templates, helpers, styles

- **No `loadTemplates()` and no partials.** Each sheet hardcodes its full template path in both
  `defaultOptions.template` and the `template` getter; the `.hbs` files are monolithic.
- **All Handlebars helpers are registered in one place**, `main.mjs::registerHandlebarsHelpers()`: `eq`, `lte`, `gte`,
  `gt`, `lt`, `add`, `subtract`, `range`, `includes`, `join`, `vesselStatusClass`, `vesselHullBoxes`,
  `vesselSupplyBoxes`. Foundry v12 ships no built-in `eq`/`gt`, so these are load-bearing — new helpers go in that
  function.
- `styles/far-field.css` is a single ~4000-line file sectioned with `/* ===== */` banners, scoped by top-level class
  (`.vessel-sheet`, `.far-field-character`, `.squad-pools-app`, `.ff-chat-card`) with per-scope CSS custom properties
  (`--vessel-bg`, `--vessel-accent`, …). No preprocessor.

## Static game data

`scripts/character-data.mjs` and `scripts/vessel-qualities.mjs` are pure data tables (14 skills, 7 edges, 7 origins /
7 roles / 14 disciplines, `ASPECTS_BY_BACKGROUND`, `STANDARD_SUPPLIES`, `PROGRESSION_OPTIONS`, 15 vessel qualities).
They are transcribed from the Far Field supplement — change content only when the source material or a rules fix
requires it, and note that ids (`steel`, `curious`, …) are persisted into actor flags, so **renaming an id orphans
existing saved characters**.

## LCP import and the vessel-qualities pack

- `hazard-entity-lcp.mjs` treats an `.lcp` as a ZIP: `hazard_entities.json` is required; `hazard_tags.json` and
  `entity_traits.json` are optional id→definition maps. `flattenEntity()` resolves trait/tag ids to names and effect
  text **at import time** so the resulting pages are portable between worlds, then creates one `JournalEntry` with one
  typed page per entity plus a `hazardTrackState` array kept parallel to `hazards`.
- `packs/vessel-qualities/` ships **empty** (only `.gitkeep`). It is seeded at `ready` from `VESSEL_QUALITIES` when
  `index.size === 0` (unlock → create → relock). TODO.md records that this seeding currently throws
  `DataModelValidationError` for the `vesselQuality` page type, so treat the pack as possibly empty and always go
  through `getAvailableVesselQualities()`, which unions world journal pages with pack contents.

## Squad pools (the only multi-client shared state)

World-scope setting `squadPools` (`config: false`, `Array`). GMs write it directly with `game.settings.set`; non-GMs
emit `{type: "saveRequest"}` on socket channel `module.Far-Field-Foundry-Module-main`, await a `saveAck` with a 5s
timeout, and every save broadcasts `poolsUpdated` so open windows re-render. `"socket": true` in `module.json` is
required for this. Claims are applied client-side by the claiming player (`applyTargetToCharacter`) because only that
player owns their own actor. Pool cost = `PROGRESSION_OPTIONS[type].perPlayerCost × squad size`.

## Localization

`lang/en.json` exists with `VESSEL` / `CHARACTER` / `FARFIELD` trees but is **almost entirely unused**: templates
contain zero `{{localize}}` calls, and the only `game.i18n` calls in the codebase are the four vessel status labels in
`vessel-sheet.mjs`. New UI strings in this codebase are hardcoded in `.hbs`/JS to match the existing style; localizing
something means adding both the key and the call.

## Known stale references

- `templates/vessel-sheet.hbs` lines 53 and 399 pass `target="flags.lancer-far-field.vessel.description"` /
  `...statusNotes` to `{{editor}}`. `lancer-far-field` is an **old module id** — those rich-text editors write to a dead
  flag namespace while the sheet reads from `flags["Far-Field-Foundry-Module-main"]`. Fix the target if you touch that
  code.
- `README.md` documents the old id `lancer-vessel-sheet` and "deployable actors"; both are wrong now.
- `MODULE_ID` is hardcoded as a bare string literal in ~25 places (notably the gear-flag handlers in
  `vessel-sheet.mjs` and the asset paths in `main.mjs`) even where the constant is already imported.

## Roadmap constraint

Per `TODO.md`, hazard NPC actors, the canvas-rendered scene track widget, and proper `vesselQuality` documents are all
blocked by the LANCER system rejecting module-defined document sub-types; the intended unblock is forking the LANCER
system. Do not attempt to register custom actor or item types from this module.
