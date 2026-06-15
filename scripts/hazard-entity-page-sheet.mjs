/**
 * Hazard Entity Page Sheet
 *
 * Renders hazard entity journal pages with interactive track boxes
 * and chat posting functionality.
 */

import { MODULE_ID } from "./constants.mjs";
import { ENTITY_CATEGORIES, RATING_LEVELS } from "./hazard-entity-data.mjs";

// Extend a placeholder at import time; the real JournalPageSheet base is bound
// during `init` (see reparentFarFieldSheetBases() in main.mjs). Referencing the
// base at import time can throw "class extends undefined" and abort the module.
class _FarFieldJournalPageBase {}

export class HazardEntityPageSheet extends _FarFieldJournalPageBase {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "journal-sheet", "hazard-entity-page"],
      template: `modules/${MODULE_ID}/templates/hazard-entity-page.hbs`,
      width: 600,
      height: "auto",
      submitOnChange: false
    });
  }

  /** @override */
  get template() {
    return `modules/${MODULE_ID}/templates/hazard-entity-page.hbs`;
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.document.system;

    // Category label
    const categoryInfo = ENTITY_CATEGORIES[system.category];
    const categoryLabel = categoryInfo ? categoryInfo.name : system.category;

    // Build track state, ensuring proper sizing
    const trackState = system.resolvedTrackState;

    // Prepare hazard data with index and track state merged
    const hazardData = system.hazards.map((hazard, idx) => {
      const state = trackState[idx] || { boxes: [] };
      const markedCount = state.boxes.filter(b => b.marked && !b.burned).length;
      const burnedCount = state.boxes.filter(b => b.burned).length;

      return {
        ...hazard,
        index: idx,
        trackState: state,
        markedCount,
        burnedCount,
        tags: hazard.tags || [],
        skills: hazard.skills || []
      };
    });

    context.entity = system;
    context.categoryLabel = categoryLabel;
    context.hazardData = hazardData;
    context.ENTITY_CATEGORIES = ENTITY_CATEGORIES;
    context.RATING_LEVELS = RATING_LEVELS;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Track box click handlers
    html.find(".track-box").on("click", this._onMarkTrackBox.bind(this));
    html.find(".track-box").on("contextmenu", this._onBurnTrackBox.bind(this));

    // Chat buttons
    html.find(".chat-entity-btn").on("click", this._onChatHazardEntity.bind(this));
    html.find(".chat-hazard-btn").on("click", this._onChatSingleHazard.bind(this));
  }

  /**
   * Left-click: toggle mark on a track box
   */
  async _onMarkTrackBox(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const hazardIdx = parseInt(el.dataset.hazardIndex);
    const boxIdx = parseInt(el.dataset.boxIndex);

    const system = this.document.system;
    const trackState = foundry.utils.deepClone(system.resolvedTrackState);
    const box = trackState[hazardIdx]?.boxes?.[boxIdx];
    if (!box) return;

    // If burned, do nothing on left-click
    if (box.burned) return;

    // Toggle marked
    box.marked = !box.marked;

    await this.document.update({ "system.hazardTrackState": trackState });
  }

  /**
   * Right-click: toggle burn on a track box
   */
  async _onBurnTrackBox(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const hazardIdx = parseInt(el.dataset.hazardIndex);
    const boxIdx = parseInt(el.dataset.boxIndex);

    const system = this.document.system;
    const trackState = foundry.utils.deepClone(system.resolvedTrackState);
    const box = trackState[hazardIdx]?.boxes?.[boxIdx];
    if (!box) return;

    // Toggle burned
    box.burned = !box.burned;
    // If burning, also mark
    if (box.burned) box.marked = true;

    await this.document.update({ "system.hazardTrackState": trackState });
  }

  /**
   * Post full entity statblock to chat
   */
  async _onChatHazardEntity(event) {
    event.preventDefault();
    const system = this.document.system;
    const trackState = system.resolvedTrackState;
    const categoryInfo = ENTITY_CATEGORIES[system.category];

    let content = `<div class="hazard-entity-chat">`;
    content += `<h3>${this.document.name}</h3>`;
    content += `<div class="he-chat-category">${categoryInfo?.name || system.category}</div>`;

    if (system.description) {
      content += `<div class="he-chat-description"><em>${system.description}</em></div>`;
    }

    // Traits
    if (system.traits.length) {
      content += `<div class="he-chat-section"><strong>ENTITY TRAITS</strong></div>`;
      for (const trait of system.traits) {
        content += `<div class="he-chat-trait"><strong>${trait.name}</strong>`;
        if (trait.effect) content += ` — ${trait.effect}`;
        content += `</div>`;
      }
    }

    // Hazards
    if (system.hazards.length) {
      content += `<div class="he-chat-section"><strong>CONTAINED HAZARDS</strong></div>`;
      for (let i = 0; i < system.hazards.length; i++) {
        const hazard = system.hazards[i];
        const state = trackState[i] || { boxes: [] };
        content += this._buildHazardChatBlock(hazard, state);
      }
    }

    content += `</div>`;

    await ChatMessage.create({
      content,
      speaker: { alias: "Far Field" }
    });
  }

  /**
   * Post a single hazard to chat
   */
  async _onChatSingleHazard(event) {
    event.preventDefault();
    const hazardIdx = parseInt(event.currentTarget.dataset.hazardIndex);
    const system = this.document.system;
    const hazard = system.hazards[hazardIdx];
    if (!hazard) return;

    const trackState = system.resolvedTrackState;
    const state = trackState[hazardIdx] || { boxes: [] };

    let content = `<div class="hazard-entity-chat">`;
    content += `<h4>${this.document.name}</h4>`;
    content += this._buildHazardChatBlock(hazard, state);
    content += `</div>`;

    await ChatMessage.create({
      content,
      speaker: { alias: "Far Field" }
    });
  }

  /**
   * Build HTML for a single hazard's chat display
   */
  _buildHazardChatBlock(hazard, state) {
    let html = `<div class="he-chat-hazard">`;
    html += `<div><strong>${hazard.name || "Unnamed Hazard"}</strong>`;
    html += ` <span class="he-chat-rating rating-${hazard.rating || "standard"}">${hazard.rating || "standard"}</span>`;
    if (hazard.category) html += ` <span class="he-chat-cat">${hazard.category}</span>`;
    html += `</div>`;

    // Track boxes
    if (hazard.track && state.boxes.length) {
      html += `<div class="he-chat-track">Track: `;
      for (const box of state.boxes) {
        const cls = box.burned ? "ff-chat-box burned" : box.marked ? "ff-chat-box marked" : "ff-chat-box";
        html += `<span class="${cls}"></span>`;
      }
      html += `</div>`;
    }

    // Tags
    if (hazard.tags?.length) {
      html += `<div class="he-chat-tags">`;
      for (const tag of hazard.tags) {
        const label = tag.name + (tag.value ? ` ${tag.value}` : "");
        html += `<span class="he-chat-tag">${label}</span> `;
      }
      html += `</div>`;
    }

    // Skills
    if (hazard.skills?.length) {
      html += `<div><strong>Skills:</strong> ${hazard.skills.join(", ")}</div>`;
    }

    // Consequences
    if (hazard.consequences) {
      html += `<div><strong>Consequences:</strong> ${hazard.consequences}</div>`;
    }

    // Combat Link
    if (hazard.combatLink) {
      html += `<div><strong>Combat Link:</strong> ${hazard.combatLink}</div>`;
    }

    html += `</div>`;
    return html;
  }
}
