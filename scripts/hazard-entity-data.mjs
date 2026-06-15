/**
 * Hazard Entity Data Model
 *
 * Defines the TypeDataModel for hazard entity journal pages.
 * Each journal page stores a single flattened hazard entity with
 * pre-resolved trait/tag names for portability between worlds.
 */

import { MODULE_ID } from "./constants.mjs";

/**
 * Entity categories matching the Vue app's data model
 */
export const ENTITY_CATEGORIES = {
  personnel: { id: "personnel", name: "Personnel", description: "People-based threats" },
  installation: { id: "installation", name: "Installation", description: "Structure-based threats" },
  environment: { id: "environment", name: "Environment", description: "Natural or environmental threats" },
  tactical: { id: "tactical", name: "Tactical", description: "Strategic or combat threats" },
  anomaly: { id: "anomaly", name: "Anomaly", description: "Unknown or anomalous threats" }
};

/**
 * Hazard rating levels
 */
export const RATING_LEVELS = {
  minor: { id: "minor", name: "Minor", trackDefault: 2 },
  standard: { id: "standard", name: "Standard", trackDefault: 4 },
  severe: { id: "severe", name: "Severe", trackDefault: 5 },
  critical: { id: "critical", name: "Critical", trackDefault: 6 }
};

/**
 * TypeDataModel for hazard entity journal pages
 * Registered as CONFIG.JournalEntryPage.dataModels[`${MODULE_ID}.hazardEntity`]
 */
export class HazardEntityPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Core identification
      entityId: new fields.StringField({ required: true, blank: false, initial: "" }),
      category: new fields.StringField({
        required: true,
        blank: false,
        initial: "tactical",
        choices: Object.keys(ENTITY_CATEGORIES)
      }),
      description: new fields.StringField({ required: false, initial: "" }),

      // Entity traits — flattened with resolved names/effects
      traits: new fields.ArrayField(new fields.SchemaField({
        traitId: new fields.StringField({ required: true, initial: "" }),
        name: new fields.StringField({ required: true, initial: "" }),
        category: new fields.StringField({ required: false, initial: "" }),
        effect: new fields.StringField({ required: false, initial: "" }),
        appliesTo: new fields.StringField({ required: false, initial: "all" })
      })),

      // Contained hazards
      hazards: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ required: true, initial: "Unnamed Hazard" }),
        category: new fields.StringField({ required: false, initial: "" }),
        rating: new fields.StringField({
          required: false,
          initial: "standard",
          choices: Object.keys(RATING_LEVELS)
        }),
        track: new fields.NumberField({ required: false, initial: 4, min: 1, max: 10, integer: true }),
        skills: new fields.ArrayField(new fields.StringField()),
        consequences: new fields.StringField({ required: false, initial: "" }),
        combatLink: new fields.StringField({ required: false, initial: "" }),
        baseHazardId: new fields.StringField({ required: false, initial: "" }),
        // Tags — flattened with resolved names/effects
        tags: new fields.ArrayField(new fields.SchemaField({
          tagId: new fields.StringField({ required: true, initial: "" }),
          name: new fields.StringField({ required: false, initial: "" }),
          value: new fields.NumberField({ required: false, nullable: true, initial: null }),
          effect: new fields.StringField({ required: false, initial: "" })
        }))
      })),

      // Track state — parallel array to hazards, stores mark/burn per box
      hazardTrackState: new fields.ArrayField(new fields.SchemaField({
        boxes: new fields.ArrayField(new fields.SchemaField({
          marked: new fields.BooleanField({ initial: false }),
          burned: new fields.BooleanField({ initial: false })
        }))
      })),

      // Import metadata
      source: new fields.StringField({ required: false, initial: "lcp" }),
      importedAt: new fields.StringField({ required: false, initial: "" }),
      lcpFilename: new fields.StringField({ required: false, initial: "" })
    };
  }

  /**
   * Initialize track state when first created or when hazards change
   */
  initializeTrackState() {
    const trackState = this.hazards.map(hazard => {
      const boxCount = hazard.track || 4;
      return {
        boxes: Array.from({ length: boxCount }, () => ({ marked: false, burned: false }))
      };
    });
    return trackState;
  }

  /**
   * Ensure track state array is properly sized for current hazards
   */
  get resolvedTrackState() {
    const current = this.hazardTrackState || [];
    return this.hazards.map((hazard, idx) => {
      const existing = current[idx];
      const boxCount = hazard.track || 4;
      if (existing?.boxes?.length === boxCount) return existing;
      // Resize: keep existing box states, pad with defaults
      const boxes = Array.from({ length: boxCount }, (_, i) => {
        if (existing?.boxes?.[i]) return existing.boxes[i];
        return { marked: false, burned: false };
      });
      return { boxes };
    });
  }

  /**
   * Get category display info
   */
  get categoryInfo() {
    return ENTITY_CATEGORIES[this.category] || { id: this.category, name: this.category };
  }
}
