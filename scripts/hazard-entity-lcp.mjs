/**
 * Hazard Entity LCP Import Handler
 *
 * Processes LCP files (ZIP archives) containing hazard entity data
 * and creates Foundry VTT journal entries with typed pages.
 *
 * LCP file structure:
 *   hazard_entities.json  (REQUIRED) - Array of entity objects
 *   hazard_tags.json      (OPTIONAL) - Tag definitions for resolving IDs
 *   entity_traits.json    (OPTIONAL) - Trait definitions for resolving IDs
 */

import { MODULE_ID } from "./constants.mjs";
import { ENTITY_CATEGORIES, RATING_LEVELS } from "./hazard-entity-data.mjs";

/**
 * Process an LCP file containing hazard entities
 * @param {File} file - The LCP/ZIP file to process
 * @returns {JournalEntry} The created journal entry
 */
export async function processHazardEntityLCP(file) {
  if (typeof JSZip === "undefined") {
    throw new Error("JSZip is required for LCP import. Please ensure it is loaded.");
  }

  const zip = new JSZip();
  const contents = await zip.loadAsync(file);

  // Read required hazard entities file
  const entitiesFile = contents.file("hazard_entities.json");
  if (!entitiesFile) {
    throw new Error("LCP does not contain hazard_entities.json");
  }

  const entitiesText = await entitiesFile.async("text");
  let entitiesData = JSON.parse(entitiesText);

  // Normalize: accept both array and {entities: [...]} wrapper
  if (!Array.isArray(entitiesData)) {
    if (Array.isArray(entitiesData.entities)) {
      entitiesData = entitiesData.entities;
    } else {
      throw new Error("hazard_entities.json must contain an array of entities or an object with an 'entities' array");
    }
  }

  // Read optional definition files for ID resolution
  let tagDefs = {};
  let traitDefs = {};

  const tagsFile = contents.file("hazard_tags.json");
  if (tagsFile) {
    try {
      const tagsText = await tagsFile.async("text");
      const tagsData = JSON.parse(tagsText);
      // Accept array or object-map
      if (Array.isArray(tagsData)) {
        for (const t of tagsData) tagDefs[t.id] = t;
      } else {
        tagDefs = tagsData;
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | Failed to parse hazard_tags.json:`, err);
    }
  }

  const traitsFile = contents.file("entity_traits.json");
  if (traitsFile) {
    try {
      const traitsText = await traitsFile.async("text");
      const traitsData = JSON.parse(traitsText);
      if (Array.isArray(traitsData)) {
        for (const t of traitsData) traitDefs[t.id] = t;
      } else {
        traitDefs = traitsData;
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | Failed to parse entity_traits.json:`, err);
    }
  }

  // Validate and flatten entities
  const flattenedEntities = [];
  for (const entity of entitiesData) {
    validateEntity(entity);
    flattenedEntities.push(flattenEntity(entity, tagDefs, traitDefs));
  }

  // Create journal entry with pages
  return createHazardEntityJournal(flattenedEntities, file.name);
}

/**
 * Validate a raw entity object from the LCP
 * @param {Object} entity
 * @throws {Error} if entity is invalid
 */
function validateEntity(entity) {
  if (!entity.name || typeof entity.name !== "string") {
    throw new Error("Each hazard entity must have a 'name' string");
  }

  if (entity.category && !ENTITY_CATEGORIES[entity.category]) {
    console.warn(`${MODULE_ID} | Entity '${entity.name}' has unknown category '${entity.category}', defaulting to 'tactical'`);
  }

  if (!Array.isArray(entity.hazards)) {
    throw new Error(`Entity '${entity.name}' must have a 'hazards' array`);
  }
}

/**
 * Flatten an entity for journal page storage
 * Resolves trait/tag IDs to display names using bundled definitions or inline data
 *
 * @param {Object} entity - Raw entity from LCP
 * @param {Object} tagDefs - Tag ID → definition map
 * @param {Object} traitDefs - Trait ID → definition map
 * @returns {Object} Flattened entity ready for page creation
 */
function flattenEntity(entity, tagDefs, traitDefs) {
  // Resolve traits
  const traits = (entity.traits || []).map(trait => {
    // If trait already has name/effect inline, use those
    if (trait.name) {
      return {
        traitId: trait.traitId || trait.id || "",
        name: trait.name,
        category: trait.category || "",
        effect: trait.effect || "",
        appliesTo: trait.appliesTo || "all"
      };
    }

    // Try to resolve from definitions
    const traitId = trait.traitId || trait.id || "";
    const def = traitDefs[traitId];
    return {
      traitId,
      name: def?.name || traitId,
      category: def?.category || trait.category || "",
      effect: def?.effect || trait.effect || "",
      appliesTo: trait.appliesTo || def?.appliesTo || "all"
    };
  });

  // Resolve hazards
  const hazards = entity.hazards.map(hazard => {
    // Resolve tags within hazard
    const tags = (hazard.tags || []).map(tag => {
      // If tag already has name inline, use it
      if (tag.name) {
        let effect = tag.effect || "";
        if (!effect && tag.effectTemplate && tag.value != null) {
          effect = tag.effectTemplate.replace("{value}", tag.value);
        }
        return {
          tagId: tag.tagId || tag.id || "",
          name: tag.name,
          value: tag.value ?? null,
          effect
        };
      }

      // Try to resolve from definitions
      const tagId = tag.tagId || tag.id || "";
      const def = tagDefs[tagId];
      let effect = tag.effect || "";
      if (!effect && def) {
        if (def.effectTemplate && tag.value != null) {
          effect = def.effectTemplate.replace("{value}", tag.value);
        } else {
          effect = def.effect || "";
        }
      }

      return {
        tagId,
        name: def?.name || tagId,
        value: tag.value ?? null,
        effect
      };
    });

    return {
      name: hazard.name || "Unnamed Hazard",
      category: hazard.category || "",
      rating: RATING_LEVELS[hazard.rating] ? hazard.rating : "standard",
      track: hazard.track || RATING_LEVELS[hazard.rating]?.trackDefault || 4,
      skills: Array.isArray(hazard.skills) ? hazard.skills : [],
      consequences: hazard.consequences || "",
      combatLink: hazard.combatLink || "",
      baseHazardId: hazard.baseHazardId || "",
      tags
    };
  });

  return {
    name: entity.name,
    entityId: entity.id || entity.entityId || `he_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category: ENTITY_CATEGORIES[entity.category] ? entity.category : "tactical",
    description: entity.description || "",
    traits,
    hazards
  };
}

/**
 * Create a JournalEntry with one hazard entity page per entity
 *
 * @param {Object[]} entities - Flattened entity objects
 * @param {string} filename - Source LCP filename
 * @returns {JournalEntry} The created journal entry
 */
async function createHazardEntityJournal(entities, filename) {
  const now = new Date().toISOString();

  // Build pages data
  const pages = entities.map((entity, idx) => {
    // Initialize track state for each hazard
    const hazardTrackState = entity.hazards.map(hazard => {
      const boxCount = hazard.track || 4;
      return {
        boxes: Array.from({ length: boxCount }, () => ({ marked: false, burned: false }))
      };
    });

    return {
      name: entity.name,
      type: `${MODULE_ID}.hazardEntity`,
      sort: (idx + 1) * 100000,
      system: {
        entityId: entity.entityId,
        category: entity.category,
        description: entity.description,
        traits: entity.traits,
        hazards: entity.hazards,
        hazardTrackState,
        source: "lcp",
        importedAt: now,
        lcpFilename: filename
      }
    };
  });

  // Create the journal entry
  const journalName = `Hazard Entities (${filename.replace(/\.(lcp|zip)$/i, "")})`;
  const journal = await JournalEntry.create({
    name: journalName,
    pages
  });

  return journal;
}

/**
 * Show the hazard entity LCP import dialog
 */
export function showHazardEntityImportDialog() {
  const content = `
    <form class="import-hazard-entity-form">
      <div class="form-group">
        <label>Select Hazard Entity LCP File:</label>
        <input type="file" name="lcpFile" accept=".lcp,.zip" />
      </div>
      <p class="hint" style="font-size: 0.85rem; color: #888; margin-top: 0.5rem;">
        LCP file must contain a <code>hazard_entities.json</code> file.<br>
        Optional: <code>hazard_tags.json</code>, <code>entity_traits.json</code> for ID resolution.
      </p>
    </form>
  `;

  new Dialog({
    title: "Import Hazard Entities",
    content,
    buttons: {
      import: {
        icon: '<i class="fas fa-file-import"></i>',
        label: "Import",
        callback: async (html) => {
          const fileInput = html.find('[name="lcpFile"]')[0];
          if (!fileInput.files.length) {
            ui.notifications.warn("Please select a file");
            return;
          }

          try {
            const journal = await processHazardEntityLCP(fileInput.files[0]);
            const pageCount = journal.pages.size;
            ui.notifications.info(
              `Imported ${pageCount} hazard ${pageCount === 1 ? "entity" : "entities"} into "${journal.name}"`
            );
            // Open the journal
            journal.sheet.render(true);
          } catch (err) {
            console.error(`${MODULE_ID} | Hazard entity LCP import failed:`, err);
            ui.notifications.error(`Import failed: ${err.message}`);
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "import"
  }).render(true);
}
