/**
 * LANCER Far Field Sheets Module
 * Adds Vessel and Character sheets for pilot actors in LANCER
 *
 * This module uses pilot actors with custom flags to store vessel/character data.
 * Using pilot actors enables LANCER's native reserves system for tracking limited-use resources.
 */

import { VesselSheet } from "./vessel-sheet.mjs";
import { CharacterSheet } from "./character-sheet.mjs";
import { VESSEL_QUALITIES } from "./vessel-qualities.mjs";
import { FAR_FIELD_SKILLS, FAR_FIELD_EDGES, getDefaultSkills } from "./character-data.mjs";
import { HazardEntityPageModel, ENTITY_CATEGORIES } from "./hazard-entity-data.mjs";
import { HazardEntityPageSheet } from "./hazard-entity-page-sheet.mjs";
import { showHazardEntityImportDialog } from "./hazard-entity-lcp.mjs";
import { VesselQualityPageModel } from "./vessel-quality-data.mjs";
import { VesselQualityPageSheet } from "./vessel-quality-page-sheet.mjs";
import {
  registerSquadPoolSettings,
  registerSquadPoolSocket,
  openSquadPools,
  getPools as getSquadPools
} from "./squad-pools-app.mjs";

// Module ID
export const MODULE_ID = "Far-Field-Foundry-Module-main";

// Flag keys
export const FLAGS = {
  isVessel: "isVessel",
  vessel: "vessel",
  isCharacter: "isCharacter",
  character: "character"
};

/**
 * Default vessel data structure
 * Stored in actor flags instead of system data
 */
export function getDefaultVesselData() {
  return {
    class: "ranger",
    description: "",
    qualities: [],
    crew: [],
    hull: { value: 6, max: 6 },
    supplies: { value: 4, max: 4 },
    systemsStatus: "operational",
    statusNotes: "",
    passengers: [],
    missionLog: [],
    sharedSupplies: []
  };
}

/**
 * Default character data structure
 * Stored in actor flags instead of system data
 */
export function getDefaultCharacterData() {
  return {
    edges: [],
    backgrounds: {
      origin: null,
      role: null,
      discipline: null
    },
    skills: getDefaultSkills(),
    aspects: [],
    resources: [],
    drives: [],
    burdens: [],
    milestones: [],
    progressionLog: []
  };
}

/**
 * Register the Far Field actor sheets for pilot actors.
 *
 * This is idempotent and called BOTH in `init` and again in `ready`. The LANCER
 * system rebuilds its own sheet registration during startup; depending on hook
 * ordering that can drop a module's pilot-sheet entries from
 * CONFIG.Actor.sheetClasses, which makes the sheets silently vanish from the
 * Sheet Configuration dropdown (the actor then falls back to the default sheet
 * with no error). Re-asserting after the system is fully ready guarantees our
 * entries are present regardless of load order.
 *
 * @returns {boolean} true if both sheets registered without throwing
 */
export function registerFarFieldSheets() {
  try {
    Actors.registerSheet(MODULE_ID, VesselSheet, {
      types: ["pilot"],
      makeDefault: false,
      label: "Ranger Vessel Sheet"
    });

    Actors.registerSheet(MODULE_ID, CharacterSheet, {
      types: ["pilot"],
      makeDefault: false,
      label: "Far Field Character Sheet"
    });

    const registered = Object.keys(CONFIG.Actor?.sheetClasses?.pilot ?? {})
      .filter(k => k.startsWith(MODULE_ID));
    console.log(`${MODULE_ID} | Registered pilot sheets:`, registered);
    return true;
  } catch (err) {
    console.error(`${MODULE_ID} | Failed to register Far Field sheets:`, err);
    ui.notifications?.error("Far Field: failed to register vessel/character sheets — see console (F12).");
    return false;
  }
}

/**
 * Hook: Initialize module
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing LANCER Far Field Sheets`);

  // Register the vessel and character sheets for pilot actors
  registerFarFieldSheets();

  // Register hazard entity journal page type
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${MODULE_ID}.hazardEntity`]: HazardEntityPageModel
  });

  // Register hazard entity page sheet
  DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, HazardEntityPageSheet, {
    types: [`${MODULE_ID}.hazardEntity`],
    makeDefault: true,
    label: "Hazard Entity Page"
  });

  // Register vessel quality journal page type
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${MODULE_ID}.vesselQuality`]: VesselQualityPageModel
  });

  // Register vessel quality page sheet
  DocumentSheetConfig.registerSheet(JournalEntryPage, MODULE_ID, VesselQualityPageSheet, {
    types: [`${MODULE_ID}.vesselQuality`],
    makeDefault: true,
    label: "Vessel Quality Page"
  });

  // Store data in module config for easy access
  game.modules.get(MODULE_ID).vesselQualities = VESSEL_QUALITIES;
  game.modules.get(MODULE_ID).farFieldSkills = FAR_FIELD_SKILLS;
  game.modules.get(MODULE_ID).farFieldEdges = FAR_FIELD_EDGES;
  game.modules.get(MODULE_ID).entityCategories = ENTITY_CATEGORIES;

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Register the world-scope setting for squad pools.
  registerSquadPoolSettings();

  console.log(`${MODULE_ID} | Sheets and journal page types registered`);
});

/**
 * Register all Handlebars helpers
 */
function registerHandlebarsHelpers() {
  // Vessel status class helper
  Handlebars.registerHelper("vesselStatusClass", function(status) {
    const classes = {
      operational: "status-operational",
      damaged: "status-damaged",
      critical: "status-critical",
      offline: "status-offline"
    };
    return classes[status] || "status-unknown";
  });

  // Vessel hull boxes helper
  Handlebars.registerHelper("vesselHullBoxes", function(hull, options) {
    if (!hull) return "";
    let html = "";
    for (let i = 1; i <= hull.max; i++) {
      const filled = i <= (hull.max - hull.value) ? "filled" : "";
      html += `<span class="hull-box ${filled}" data-index="${i}"></span>`;
    }
    return new Handlebars.SafeString(html);
  });

  // Vessel supply boxes helper
  Handlebars.registerHelper("vesselSupplyBoxes", function(supplies, options) {
    if (!supplies) return "";
    let html = "";
    for (let i = 1; i <= supplies.max; i++) {
      const filled = i <= (supplies.max - supplies.value) ? "filled" : "";
      html += `<span class="supply-box ${filled}" data-index="${i}"></span>`;
    }
    return new Handlebars.SafeString(html);
  });

  // Range helper for iterating numbers
  Handlebars.registerHelper("range", function(start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  // Comparison helpers
  Handlebars.registerHelper("lte", function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper("gte", function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper("gt", function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper("lt", function(a, b) {
    return a < b;
  });

  // Array includes helper
  Handlebars.registerHelper("includes", function(array, value) {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
  });

  // Subtract helper
  Handlebars.registerHelper("subtract", function(a, b) {
    return a - b;
  });

  // Add helper
  Handlebars.registerHelper("add", function(a, b) {
    return a + b;
  });

  // Join array helper
  Handlebars.registerHelper("join", function(array, separator) {
    if (!Array.isArray(array)) return "";
    return array.join(typeof separator === "string" ? separator : ", ");
  });
}

/**
 * Hook: Ready - Module fully loaded
 */
Hooks.once("ready", async () => {
  console.log(`${MODULE_ID} | LANCER Far Field Sheets ready`);

  // Re-assert sheet registration AFTER the LANCER system has finished its own
  // startup. If the system's sheet setup dropped our entries during init, this
  // puts them back so the sheets reappear in the Sheet Configuration dropdown.
  registerFarFieldSheets();

  // Self-heal: a system migration (e.g. the Comp/Con v3 update) can rewrite
  // pilot actors and wipe their `core.sheetClass` preference, which makes our
  // flagged vessels/characters silently open the default sheet. Re-point any of
  // OUR flagged actors back at the correct sheet. GM-only and guarded so it can
  // never throw during startup.
  if (game.user?.isGM) {
    for (const actor of game.actors) {
      try {
        const desired = isVessel(actor)
          ? `${MODULE_ID}.VesselSheet`
          : isCharacter(actor)
            ? `${MODULE_ID}.CharacterSheet`
            : null;
        if (!desired) continue;
        if (actor.getFlag("core", "sheetClass") !== desired) {
          await actor.setFlag("core", "sheetClass", desired);
          console.log(`${MODULE_ID} | Restored Far Field sheet on actor "${actor.name}"`);
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Could not restore sheet for "${actor?.name}":`, err);
      }
    }
  }

  // Make functions available globally for macros
  const mod = game.modules.get(MODULE_ID);
  mod.createVessel = createVessel;
  mod.createCharacter = createCharacter;
  mod.isVessel = isVessel;
  mod.isCharacter = isCharacter;
  mod.getVesselData = getVesselData;
  mod.getCharacterData = getCharacterData;
  mod.updateVesselData = updateVesselData;
  mod.updateCharacterData = updateCharacterData;
  mod.setFarFieldGear = setFarFieldGear;
  mod.getFarFieldGearData = getFarFieldGearData;
  mod.importHazardEntities = showHazardEntityImportDialog;
  mod.getAvailableVesselQualities = getAvailableVesselQualities;
  mod.openSquadPools = openSquadPools;
  mod.getSquadPools = getSquadPools;

  // Hook up the squad-pool socket handler (GM-side write proxy + all-client refresh)
  registerSquadPoolSocket();

  // Seed vessel qualities compendium if empty
  const packName = `${MODULE_ID}.vessel-qualities`;
  const pack = game.packs.get(packName);
  if (pack) {
    const index = await pack.getIndex();
    if (index.size === 0) {
      await seedVesselQualitiesPack(pack);
    }
  }
});

/**
 * Hook: Render Item Sheet
 * Inject Far Field gear toggle into reserve/pilot gear item sheets
 */
Hooks.on("renderItemSheet", (app, html, data) => {
  if (game.system.id !== "lancer") return;

  const item = app.item;
  if (!item) return;

  // Only add to reserve and pilot gear items
  const validTypes = ["reserve", "pilot_gear", "pilot_weapon", "pilot_armor"];
  if (!validTypes.includes(item.type)) return;

  // Check if Far Field toggle already exists
  if (html.find(".far-field-gear-toggle").length) return;

  // Get current Far Field gear state
  const isFarFieldGear = item.getFlag(MODULE_ID, "isFarFieldGear") || false;
  const track = item.getFlag(MODULE_ID, "track") || 4;

  // Create the Far Field gear section
  const farFieldSection = $(`
    <div class="far-field-gear-section" style="
      margin: 0.5rem 0;
      padding: 0.75rem;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: 4px;
    ">
      <div class="far-field-gear-toggle" style="display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="ff-gear-toggle-${item.id}"
          ${isFarFieldGear ? "checked" : ""}
          style="margin: 0;"
        />
        <label for="ff-gear-toggle-${item.id}" style="margin: 0; cursor: pointer;">
          <strong>Far Field Gear</strong>
        </label>
      </div>
      <p style="font-size: 0.85rem; color: #888; margin: 0.5rem 0 0 0;">
        Enable track-based usage with mark/burn mechanics
      </p>
      ${isFarFieldGear ? `
        <div class="far-field-track-config" style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <label for="ff-track-size-${item.id}" style="margin: 0;">Track Size:</label>
          <input type="number" id="ff-track-size-${item.id}"
            value="${track}" min="1" max="10"
            style="width: 60px; padding: 0.25rem;"
          />
        </div>
      ` : ""}
    </div>
  `);

  // Find a good place to insert - after the header or at the start of the form
  const header = html.find(".sheet-header");
  if (header.length) {
    header.after(farFieldSection);
  } else {
    html.find("form").prepend(farFieldSection);
  }

  // Add event listener for toggle
  farFieldSection.find(`#ff-gear-toggle-${item.id}`).on("change", async (event) => {
    const checked = event.currentTarget.checked;
    await item.setFlag(MODULE_ID, "isFarFieldGear", checked);
    if (checked) {
      // Initialize track data if enabling
      const currentTrack = item.getFlag(MODULE_ID, "track");
      if (!currentTrack) {
        await item.setFlag(MODULE_ID, "track", 4);
        await item.setFlag(MODULE_ID, "marked", 0);
        await item.setFlag(MODULE_ID, "burned", 0);
      }
    }
    app.render(); // Re-render to show/hide track config
  });

  // Add event listener for track size
  farFieldSection.find(`#ff-track-size-${item.id}`).on("change", async (event) => {
    const newTrack = parseInt(event.currentTarget.value) || 4;
    await item.setFlag(MODULE_ID, "track", Math.max(1, Math.min(10, newTrack)));
  });
});

/**
 * Set an item as Far Field gear with track configuration
 */
export async function setFarFieldGear(item, enabled, trackSize = 4) {
  if (!item) return null;

  await item.setFlag(MODULE_ID, "isFarFieldGear", enabled);
  if (enabled) {
    await item.setFlag(MODULE_ID, "track", trackSize);
    await item.setFlag(MODULE_ID, "marked", 0);
    await item.setFlag(MODULE_ID, "burned", 0);
  }
  return item;
}

/**
 * Get Far Field gear data from an item
 */
export function getFarFieldGearData(item) {
  if (!item) return null;

  const isFarFieldGear = item.getFlag(MODULE_ID, "isFarFieldGear") || false;
  if (!isFarFieldGear) return null;

  return {
    track: item.getFlag(MODULE_ID, "track") || 4,
    marked: item.getFlag(MODULE_ID, "marked") || 0,
    burned: item.getFlag(MODULE_ID, "burned") || 0
  };
}

/**
 * Hook: Render Actor Directory
 * Add "Create Vessel" and "Create Character" buttons to the actor directory
 */
Hooks.on("renderActorDirectory", (app, html, data) => {
  if (game.system.id !== "lancer") return;

  // Find the header actions area
  const headerActions = html.find(".header-actions");
  if (!headerActions.length) return;

  // Create the vessel button
  const vesselButton = $(`
    <button type="button" class="create-vessel-button" title="Create a new Ranger Vessel">
      <i class="fas fa-rocket"></i> New Vessel
    </button>
  `);

  // Create the character button
  const characterButton = $(`
    <button type="button" class="create-character-button" title="Create a new Far Field Character">
      <i class="fas fa-user"></i> New Character
    </button>
  `);

  // Add click handlers
  vesselButton.on("click", async (event) => {
    event.preventDefault();
    await createVessel();
  });

  characterButton.on("click", async (event) => {
    event.preventDefault();
    await createCharacter();
  });

  // Insert after the create button or at the start
  const createButton = headerActions.find(".create-document, .create-entry");
  if (createButton.length) {
    createButton.after(characterButton);
    characterButton.after(vesselButton);
  } else {
    headerActions.prepend(vesselButton);
    headerActions.prepend(characterButton);
  }
});

/**
 * Hook: Add a "Squad Pools" button to the scene controls so anyone can open
 * the pool window from anywhere in the world (without going through a sheet).
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const notes = controls.find(c => c.name === "notes");
  if (!notes) return;
  notes.tools.push({
    name: "far-field-squad-pools",
    title: "Far Field Squad Pools",
    icon: "fas fa-users",
    button: true,
    onClick: () => openSquadPools()
  });
});

/**
 * Hook: Render Journal Directory
 * Add "Import Hazard Entities" button to the journal directory
 */
Hooks.on("renderJournalDirectory", (app, html, data) => {
  if (game.system.id !== "lancer") return;

  const headerActions = html.find(".header-actions");
  if (!headerActions.length) return;

  const importButton = $(`
    <button type="button" class="import-hazard-entities-button" title="Import Hazard Entities from LCP">
      <i class="fas fa-biohazard"></i> Import Hazard Entities
    </button>
  `);

  importButton.on("click", (event) => {
    event.preventDefault();
    showHazardEntityImportDialog();
  });

  const qualityButton = $(`
    <button type="button" class="create-vessel-quality-button" title="Create a new Vessel Quality">
      <i class="fas fa-star"></i> New Vessel Quality
    </button>
  `);

  qualityButton.on("click", (event) => {
    event.preventDefault();
    createVesselQualityPage();
  });

  const createButton = headerActions.find(".create-document, .create-entry");
  if (createButton.length) {
    createButton.after(importButton);
    importButton.after(qualityButton);
  } else {
    headerActions.prepend(qualityButton);
    headerActions.prepend(importButton);
  }
});

/**
 * Get all available vessel qualities from world journals and compendium
 * @returns {Promise<Array<{id: string, name: string, description: string}>>}
 */
export async function getAvailableVesselQualities() {
  const qualities = [];
  const seen = new Set();

  // World journal pages of type vesselQuality
  for (const journal of game.journal) {
    for (const page of journal.pages) {
      if (page.type === `${MODULE_ID}.vesselQuality`) {
        if (!seen.has(page.id)) {
          seen.add(page.id);
          qualities.push({ id: page.id, name: page.name, description: page.system.description });
        }
      }
    }
  }

  // Compendium pack
  const packName = `${MODULE_ID}.vessel-qualities`;
  const pack = game.packs.get(packName);
  if (pack) {
    const documents = await pack.getDocuments();
    for (const journal of documents) {
      for (const page of journal.pages) {
        if (page.type === `${MODULE_ID}.vesselQuality` && !seen.has(page.id)) {
          seen.add(page.id);
          qualities.push({ id: page.id, name: page.name, description: page.system.description });
        }
      }
    }
  }

  return qualities;
}

/**
 * Seed the vessel qualities compendium pack with predefined qualities
 */
async function seedVesselQualitiesPack(pack) {
  const journalData = {
    name: "Vessel Qualities",
    pages: VESSEL_QUALITIES.map(q => ({
      name: q.name,
      type: `${MODULE_ID}.vesselQuality`,
      system: {
        description: q.description,
        source: "compendium"
      }
    }))
  };

  await pack.configure({ locked: false });
  const cls = pack.documentClass;
  await cls.create(journalData, { pack: pack.collection });
  await pack.configure({ locked: true });

  console.log(`${MODULE_ID} | Seeded vessel qualities compendium with ${VESSEL_QUALITIES.length} qualities`);
}

/**
 * Create a new vessel quality journal page
 */
async function createVesselQualityPage() {
  const content = `<form>
    <div class="form-group">
      <label>Quality Name:</label>
      <input type="text" name="name" value="New Vessel Quality" autofocus/>
    </div>
    <div class="form-group">
      <label>Description:</label>
      <textarea name="description" rows="4"></textarea>
    </div>
  </form>`;

  new Dialog({
    title: "Create Vessel Quality",
    content,
    buttons: {
      create: {
        icon: '<i class="fas fa-star"></i>',
        label: "Create",
        callback: async (html) => {
          const qualityName = html.find('[name="name"]').val()?.trim() || "New Vessel Quality";
          const description = html.find('[name="description"]').val()?.trim() || "";
          const journal = await JournalEntry.create({
            name: qualityName,
            pages: [{
              name: qualityName,
              type: `${MODULE_ID}.vesselQuality`,
              system: { description, source: "custom" }
            }]
          });
          if (journal) {
            journal.sheet.render(true);
            ui.notifications.info(`Created vessel quality: ${qualityName}`);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "create"
  }).render(true);
}

/**
 * Create a new vessel actor
 * Creates a deployable with vessel flags
 */
async function createVessel(name = "New Vessel") {
  const dialogContent = `
    <form>
      <div class="form-group">
        <label>Vessel Name:</label>
        <input type="text" name="name" value="${name}" autofocus/>
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: "Create New Vessel",
      content: dialogContent,
      buttons: {
        create: {
          icon: '<i class="fas fa-rocket"></i>',
          label: "Create",
          callback: async (html) => {
            const vesselName = html.find('[name="name"]').val() || name;

            const actor = await Actor.create({
              name: vesselName,
              type: "pilot",
              img: "modules/Far-Field-Foundry-Module-main/assets/vessel-icon.svg",
              flags: {
                [MODULE_ID]: {
                  [FLAGS.isVessel]: true,
                  [FLAGS.vessel]: getDefaultVesselData()
                }
              }
            });

            if (actor) {
              actor.sheet.render(true);
              ui.notifications.info(`Created vessel: ${vesselName}`);
            }

            resolve(actor);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "create"
    }).render(true);
  });
}

/**
 * Create a new character actor
 * Creates a deployable with character flags
 */
async function createCharacter(name = "New Character") {
  const dialogContent = `
    <form>
      <div class="form-group">
        <label>Character Name:</label>
        <input type="text" name="name" value="${name}" autofocus/>
      </div>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: "Create New Far Field Character",
      content: dialogContent,
      buttons: {
        create: {
          icon: '<i class="fas fa-user"></i>',
          label: "Create",
          callback: async (html) => {
            const characterName = html.find('[name="name"]').val() || name;

            const actor = await Actor.create({
              name: characterName,
              type: "pilot",
              img: "modules/Far-Field-Foundry-Module-main/assets/character-icon.svg",
              flags: {
                [MODULE_ID]: {
                  [FLAGS.isCharacter]: true,
                  [FLAGS.character]: getDefaultCharacterData()
                }
              }
            });

            if (actor) {
              actor.sheet.render(true);
              ui.notifications.info(`Created character: ${characterName}`);
            }

            resolve(actor);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "create"
    }).render(true);
  });
}

/**
 * Hook: Pre-create Actor
 * Set default icon for vessels and characters
 */
Hooks.on("preCreateActor", (actor, data, options, userId) => {
  const actorIsVessel = actor.getFlag(MODULE_ID, FLAGS.isVessel);
  const actorIsCharacter = actor.getFlag(MODULE_ID, FLAGS.isCharacter);

  if (actorIsVessel && !data.img) {
    actor.updateSource({
      img: "modules/Far-Field-Foundry-Module-main/assets/vessel-icon.svg"
    });
  }

  if (actorIsCharacter && !data.img) {
    actor.updateSource({
      img: "modules/Far-Field-Foundry-Module-main/assets/character-icon.svg"
    });
  }
});

/**
 * Utility: Check if an actor is a vessel
 */
export function isVessel(actor) {
  return actor?.type === "pilot" && actor.getFlag(MODULE_ID, FLAGS.isVessel);
}

/**
 * Utility: Check if an actor is a character
 */
export function isCharacter(actor) {
  return actor?.type === "pilot" && actor.getFlag(MODULE_ID, FLAGS.isCharacter);
}

/**
 * Utility: Get vessel data from an actor
 */
export function getVesselData(actor) {
  if (!isVessel(actor)) return null;
  return actor.getFlag(MODULE_ID, FLAGS.vessel) || getDefaultVesselData();
}

/**
 * Utility: Get character data from an actor
 */
export function getCharacterData(actor) {
  if (!isCharacter(actor)) return null;
  return actor.getFlag(MODULE_ID, FLAGS.character) || getDefaultCharacterData();
}

/**
 * Utility: Update vessel data on an actor
 */
export async function updateVesselData(actor, data) {
  if (!isVessel(actor)) return null;
  const currentData = getVesselData(actor);
  const newData = foundry.utils.mergeObject(currentData, data);
  return actor.setFlag(MODULE_ID, FLAGS.vessel, newData);
}

/**
 * Utility: Update character data on an actor
 */
export async function updateCharacterData(actor, data) {
  if (!isCharacter(actor)) return null;
  const currentData = getCharacterData(actor);
  const newData = foundry.utils.mergeObject(currentData, data);
  return actor.setFlag(MODULE_ID, FLAGS.character, newData);
}

/**
 * Import character data from web app JSON export
 * Converts Vue app format to Foundry module format with null/blank handling
 */
export function importCharacterData(jsonData) {
  // Parse if string
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

  // Validate file type
  if (data.type && data.type !== 'far-field-character') {
    throw new Error('Invalid file type. Expected a Far Field character export.');
  }

  // Convert skills from array format to object format
  // Vue: [{ id, name, rank, markedBoxes }]
  // Foundry: { skillId: { rank, failures: [] } }
  const skills = {};
  if (Array.isArray(data.skills)) {
    for (const skill of data.skills) {
      if (skill?.id && typeof skill?.rank === 'number' && skill.rank > 0) {
        // Convert markedBoxes (number) to failures (array of box indices)
        const failures = [];
        const markedBoxes = skill.markedBoxes || 0;
        for (let i = 1; i <= markedBoxes; i++) {
          failures.push(i);
        }
        skills[skill.id] = { rank: skill.rank, failures };
      }
    }
  } else if (data.skills && typeof data.skills === 'object') {
    // Already in object format (re-importing from Foundry export)
    Object.assign(skills, data.skills);
  }

  // Convert aspects — normalize markedBoxes/burnedBoxes to marked/burned
  const aspects = Array.isArray(data.aspects) ? data.aspects.filter(a => a).map(a => ({
    ...a,
    marked: a.marked ?? a.markedBoxes ?? 0,
    burned: a.burned ?? a.burnedBoxes ?? 0
  })) : [];
  // Clean up web app field names
  for (const a of aspects) {
    delete a.markedBoxes;
    delete a.burnedBoxes;
  }

  // Convert resources — same markedBoxes/burnedBoxes normalization
  const resources = Array.isArray(data.resources) ? data.resources.filter(r => r).map(r => ({
    ...r,
    marked: r.marked ?? r.markedBoxes ?? 0,
    burned: r.burned ?? r.burnedBoxes ?? 0
  })) : [];
  for (const r of resources) {
    delete r.markedBoxes;
    delete r.burnedBoxes;
  }

  // Convert burdens — same normalization
  const burdens = Array.isArray(data.burdens) ? data.burdens.filter(b => b).map(b => ({
    ...b,
    marked: b.marked ?? b.markedBoxes ?? 0,
    burned: b.burned ?? b.burnedBoxes ?? 0
  })) : [];
  for (const b of burdens) {
    delete b.markedBoxes;
    delete b.burnedBoxes;
  }

  // Build Foundry-compatible character data with safe defaults
  // Web app stores edges as objects ({id, name, description}); Foundry expects ID strings.
  return {
    name: data.name || null,
    edges: Array.isArray(data.edges)
      ? data.edges.map(e => typeof e === 'string' ? e : e?.id).filter(Boolean)
      : [],
    backgrounds: {
      origin: data.backgrounds?.origin || null,
      role: data.backgrounds?.role || null,
      discipline: data.backgrounds?.discipline || null
    },
    skills,
    aspects,
    resources,
    drives: Array.isArray(data.drives) ? data.drives.filter(d => d) : [],
    burdens,
    milestones: Array.isArray(data.milestones) ? data.milestones.filter(m => m) : [],
    progressionLog: Array.isArray(data.progressionLog) ? data.progressionLog : []
  };
}

// Export for external use
export { createVessel, createCharacter };
