/**
 * Shared module constants — this file imports NOTHING on purpose.
 *
 * MODULE_ID and FLAGS live here instead of in main.mjs to break a circular-import
 * trap that was killing the whole module at load time.
 *
 * The cycle: main.mjs (the entry esmodule) imports the sheet/app modules, and
 * several of those modules read MODULE_ID at module-evaluation (top) level — most
 * importantly squad-pools-app.mjs, which builds its socket channel name as
 * `module.${MODULE_ID}` as a top-level `const`. Because main.mjs is the entry
 * point, its body (where `const MODULE_ID` used to be declared) runs LAST, after
 * every dependency. So when a circularly-imported module's body ran and read
 * MODULE_ID, the const was still in its temporal dead zone, throwing:
 *   "Cannot access 'MODULE_ID' before initialization"
 * which aborted main.mjs entirely — no init hook, no sheet registration, sheets
 * absent from the Sheet Configuration dropdown.
 *
 * A dependency-free constants module has no cycle, so it is always fully
 * evaluated before any importer's body runs. These reads are therefore safe
 * regardless of module evaluation order. Keep this file import-free.
 */

// Module ID — must match the directory/manifest id and the modules/<id>/ asset paths.
export const MODULE_ID = "Far-Field-Foundry-Module-main";

// Flag keys used to tag pilot actors as Far Field vessels/characters and to store their data.
export const FLAGS = {
  isVessel: "isVessel",
  vessel: "vessel",
  isCharacter: "isCharacter",
  character: "character"
};
