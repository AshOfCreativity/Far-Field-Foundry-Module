/**
 * Vessel Quality Data Model
 *
 * Defines the TypeDataModel for vessel quality journal pages.
 * Each journal page stores a single vessel quality with a name
 * (on the page itself) and a description.
 */

export class VesselQualityPageModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Quality description — rich text
      description: new fields.HTMLField({ required: false, initial: "" }),

      // Provenance tracking: "compendium" for shipped qualities, "custom" for GM-created
      source: new fields.StringField({ required: false, initial: "custom" })
    };
  }
}
