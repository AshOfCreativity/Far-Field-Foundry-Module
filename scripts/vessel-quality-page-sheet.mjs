/**
 * Vessel Quality Page Sheet
 *
 * Renders vessel quality journal pages with view/edit mode
 * and chat posting functionality.
 */

import { MODULE_ID } from "./constants.mjs";

// JournalPageSheet is a Foundry global available at import time.
export class VesselQualityPageSheet extends JournalPageSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "journal-sheet", "vessel-quality-page"],
      template: `modules/${MODULE_ID}/templates/vessel-quality-page.hbs`,
      width: 500,
      height: "auto",
      submitOnChange: true
    });
  }

  /** @override */
  get template() {
    return `modules/${MODULE_ID}/templates/vessel-quality-page.hbs`;
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.document.system;

    context.quality = {
      name: this.document.name,
      description: system.description,
      source: system.source
    };
    context.editable = this.isEditable;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".chat-quality-btn").on("click", this._onPostToChat.bind(this));
  }

  /**
   * Post quality details to chat
   */
  async _onPostToChat(event) {
    event.preventDefault();
    const system = this.document.system;

    const content = `<div class="ff-chat-card">
      <div class="ff-chat-header">
        <span class="ff-chat-title">${this.document.name}</span>
        <span class="ff-chat-subtitle">Vessel Quality</span>
      </div>
      <div class="ff-chat-description">${system.description}</div>
    </div>`;

    await ChatMessage.create({
      content,
      speaker: { alias: "Far Field" }
    });
  }
}
