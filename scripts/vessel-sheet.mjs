/**
 * Vessel Actor Sheet for LANCER
 * Party/Ship sheet similar to PF2e Party Sheet
 *
 * Uses pilot actors with flags to store vessel data.
 * Reserves can be dragged onto the Cargo tab and marked as Far Field gear for track/burn mechanics.
 */

import { MODULE_ID, FLAGS } from "./constants.mjs";
import { getDefaultVesselData, getAvailableVesselQualities } from "./main.mjs";
import { postFeatureToChat } from "./chat.mjs";

// The core sheet base classes are not guaranteed to exist at the instant this
// module is first imported. Referencing one in an `extends` clause at import time
// is exactly what throws "Class extends value undefined is not a constructor" and
// aborts the WHOLE module (removing the directory buttons AND every sheet at once,
// with no popup). So we extend a trivial placeholder now and swap in the real
// ActorSheet base during `init` — see reparentFarFieldSheetBases() in main.mjs.
class _FarFieldSheetBase {}

export class VesselSheet extends _FarFieldSheetBase {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "vessel-sheet"],
      template: "modules/Far-Field-Foundry-Module-main/templates/vessel-sheet.hbs",
      width: 800,
      height: 700,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "overview"
        }
      ],
      scrollY: [".sheet-body"]
    });
  }

  /** @override */
  get template() {
    return "modules/Far-Field-Foundry-Module-main/templates/vessel-sheet.hbs";
  }

  /**
   * Get vessel data from flags
   */
  get vesselData() {
    return this.actor.getFlag(MODULE_ID, FLAGS.vessel) || getDefaultVesselData();
  }

  /**
   * Update vessel data in flags
   */
  async updateVesselData(data) {
    const currentData = this.vesselData;
    const newData = foundry.utils.mergeObject(currentData, data, { inplace: false });
    return this.actor.setFlag(MODULE_ID, FLAGS.vessel, newData);
  }

  /**
   * Prepare derived vessel data
   */
  _prepareDerivedData(vesselData) {
    const data = foundry.utils.deepClone(vesselData);

    // Calculate hull percentage for status display
    data.hullPercent = Math.round((data.hull.value / data.hull.max) * 100);
    data.suppliesPercent = Math.round((data.supplies.value / data.supplies.max) * 100);

    // Determine overall status
    if (data.hull.value === 0 || data.systemsStatus === "offline") {
      data.overallStatus = "critical";
    } else if (data.hull.value <= 2 || data.systemsStatus === "critical") {
      data.overallStatus = "warning";
    } else if (data.systemsStatus === "damaged") {
      data.overallStatus = "caution";
    } else {
      data.overallStatus = "nominal";
    }

    return data;
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const actorData = this.actor.toObject(false);

    // Get vessel data from flags
    const rawVesselData = this.vesselData;
    const vesselData = this._prepareDerivedData(rawVesselData);

    // Add vessel data to context
    context.vessel = vesselData;
    context.flags = actorData.flags;

    // Add vessel qualities list for selection (from journal pages + compendium)
    const allQualities = await getAvailableVesselQualities();
    context.availableQualities = allQualities.filter(q =>
      !vesselData.qualities.some(sq => sq.id === q.id)
    );
    context.allQualities = allQualities;

    // Get linked pilots for crew
    context.pilots = this._getAvailablePilots();

    // Prepare crew with linked pilot data
    context.crew = (vesselData.crew || []).map((member, index) => {
      const pilot = member.pilotId ? game.actors.get(member.pilotId) : null;
      return {
        ...member,
        index,
        pilot: pilot ? {
          name: pilot.name,
          img: pilot.img,
          id: pilot.id
        } : null
      };
    });

    // Prepare passengers with linked pilot data
    context.passengers = (vesselData.passengers || []).map((member, index) => {
      const pilot = member.pilotId ? game.actors.get(member.pilotId) : null;
      return {
        ...member,
        index,
        pilot: pilot ? {
          name: pilot.name,
          img: pilot.img,
          id: pilot.id
        } : null
      };
    });

    // Status display
    context.statusOptions = [
      { value: "operational", label: game.i18n.localize("VESSEL.Status.Operational") },
      { value: "damaged", label: game.i18n.localize("VESSEL.Status.Damaged") },
      { value: "critical", label: game.i18n.localize("VESSEL.Status.Critical") },
      { value: "offline", label: game.i18n.localize("VESSEL.Status.Offline") }
    ];

    // Ship class options
    context.classOptions = [
      { value: "ranger", label: "Ranger" },
      { value: "corvette", label: "Corvette" },
      { value: "frigate", label: "Frigate" },
      { value: "cruiser", label: "Cruiser" },
      { value: "custom", label: "Custom" }
    ];

    // Mission log sorted by timestamp (newest first)
    context.missionLog = [...(vesselData.missionLog || [])].sort((a, b) => b.timestamp - a.timestamp);

    // Shared supplies for party management
    context.sharedSupplies = (vesselData.sharedSupplies || []).map(supply => ({
      ...supply,
      available: supply.track - supply.burned
    }));

    // Get actor's items - specifically reserves (LANCER native items)
    // Filter for reserve-type items that can be used/tracked
    context.reserves = this.actor.items.filter(i =>
      i.type === "reserve" ||
      i.type === "pilot_gear" ||
      i.type === "pilot_weapon" ||
      i.type === "pilot_armor"
    ).map(i => {
      // Check for Far Field gear flags
      const isFarFieldGear = i.getFlag("Far-Field-Foundry-Module-main", "isFarFieldGear") || false;
      const ffTrack = i.getFlag("Far-Field-Foundry-Module-main", "track") || 4;
      const ffMarked = i.getFlag("Far-Field-Foundry-Module-main", "marked") || 0;
      const ffBurned = i.getFlag("Far-Field-Foundry-Module-main", "burned") || 0;

      return {
        id: i.id,
        name: i.name,
        type: i.type,
        img: i.img,
        system: i.system,
        // Check if reserve is used (LANCER stores this in system.used)
        used: i.system?.used ?? false,
        // Far Field gear data
        isFarFieldGear,
        ffTrack,
        ffMarked,
        ffBurned,
        // Compute available boxes (track - burned)
        ffAvailable: ffTrack - ffBurned
      };
    });

    // Editable state
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;

    return context;
  }

  /**
   * Get available pilot actors to link to crew
   * @returns {Array} Array of pilot actor data
   */
  _getAvailablePilots() {
    return game.actors
      .filter(a => a.type === "pilot" && a.isOwner)
      .map(a => ({
        id: a.id,
        name: a.name,
        img: a.img
      }));
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Chat feature buttons work for all viewers
    html.find(".chat-feature").click(this._onChatFeature.bind(this));

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Use LANCER's drop handling system (standard Foundry dragDrop is disabled by LANCER)
    this._setupDropHandlers(html);

    // Hull box clicks
    html.find(".hull-box").click(this._onHullBoxClick.bind(this));

    // Supply box clicks
    html.find(".supply-box").click(this._onSupplyBoxClick.bind(this));

    // Add crew member
    html.find(".add-crew").click(this._onAddCrew.bind(this));

    // Remove crew member
    html.find(".remove-crew").click(this._onRemoveCrew.bind(this));

    // Link pilot to crew
    html.find(".link-pilot").change(this._onLinkPilot.bind(this));

    // Open linked pilot sheet
    html.find(".open-pilot").click(this._onOpenPilot.bind(this));

    // Passenger management
    html.find(".add-passenger").click(this._onAddPassenger.bind(this));
    html.find(".remove-passenger").click(this._onRemovePassenger.bind(this));
    html.find(".link-passenger-pilot").change(this._onLinkPassengerPilot.bind(this));
    html.find(".open-passenger-pilot").click(this._onOpenPilot.bind(this));
    html.find('input[name^="passenger."]').change(this._onPassengerFieldChange.bind(this));
    html.find('textarea[name^="passenger."]').change(this._onPassengerFieldChange.bind(this));

    // Add quality
    html.find(".add-quality").click(this._onAddQuality.bind(this));

    // Create custom quality
    html.find(".create-custom-quality").click(this._onCreateCustomQuality.bind(this));

    // Remove quality
    html.find(".remove-quality").click(this._onRemoveQuality.bind(this));

    // Add log entry
    html.find(".add-log-entry").click(this._onAddLogEntry.bind(this));

    // Remove log entry
    html.find(".remove-log-entry").click(this._onRemoveLogEntry.bind(this));

    // Quality selector
    html.find(".quality-option").click(this._onSelectQuality.bind(this));

    // Form field changes for vessel data
    html.find('select[name^="vessel."], input[name^="vessel."]').change(this._onVesselFieldChange.bind(this));

    // Crew field changes
    html.find('input[name^="crew."]').change(this._onCrewFieldChange.bind(this));
    html.find('textarea[name^="crew."]').change(this._onCrewFieldChange.bind(this));

    // Reserve/item management
    html.find(".reserve-toggle-used").click(this._onToggleReserveUsed.bind(this));
    html.find(".reserve-delete").click(this._onDeleteReserve.bind(this));
    html.find(".reserve-open").click(this._onOpenReserve.bind(this));
    html.find(".reserve-item").dblclick(this._onOpenReserve.bind(this));

    // Far Field gear track management
    html.find(".ff-track-box").click(this._onMarkFarFieldBox.bind(this));
    html.find(".ff-track-box").contextmenu(this._onBurnFarFieldBox.bind(this));

    // Shared supply management
    html.find(".add-shared-supply").click(this._onAddSharedSupply.bind(this));
    html.find(".remove-shared-supply").click(this._onRemoveSharedSupply.bind(this));
    html.find(".shared-supply-track-box").click(this._onMarkSharedSupplyBox.bind(this));
    html.find(".shared-supply-track-box").contextmenu(this._onBurnSharedSupplyBox.bind(this));
    html.find(".reset-shared-supply").click(this._onResetSharedSupply.bind(this));
  }

  /**
   * Handle vessel field changes
   */
  async _onVesselFieldChange(event) {
    event.preventDefault();
    const field = event.currentTarget;
    const name = field.name.replace("vessel.", "");
    let value = field.type === "number" ? Number(field.value) : field.value;

    // Handle nested paths like hull.value
    const path = name.split(".");
    if (path.length === 1) {
      await this.updateVesselData({ [name]: value });
    } else {
      const data = {};
      let current = data;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      await this.updateVesselData(data);
    }
  }

  /**
   * Handle crew field changes
   */
  async _onCrewFieldChange(event) {
    event.preventDefault();
    const field = event.currentTarget;
    // Parse crew.0.name format
    const match = field.name.match(/crew\.(\d+)\.(\w+)/);
    if (!match) return;

    const index = parseInt(match[1]);
    const fieldName = match[2];
    const value = field.value;

    const crew = [...this.vesselData.crew];
    if (crew[index]) {
      crew[index][fieldName] = value;
      await this.updateVesselData({ crew });
    }
  }

  /**
   * Handle hull box click
   */
  async _onHullBoxClick(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const hull = this.vesselData.hull;
    const damaged = hull.max - hull.value;

    let newValue;
    if (index <= damaged) {
      // Clicking on a filled (damaged) box - repair
      newValue = hull.max - (index - 1);
    } else {
      // Clicking on an empty box - damage
      newValue = hull.max - index;
    }

    await this.updateVesselData({
      hull: { value: Math.max(0, Math.min(hull.max, newValue)), max: hull.max }
    });
  }

  /**
   * Handle supply box click
   */
  async _onSupplyBoxClick(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const supplies = this.vesselData.supplies;
    const used = supplies.max - supplies.value;

    let newValue;
    if (index <= used) {
      // Clicking on a filled (used) box - restore
      newValue = supplies.max - (index - 1);
    } else {
      // Clicking on an empty box - use
      newValue = supplies.max - index;
    }

    await this.updateVesselData({
      supplies: { value: Math.max(0, Math.min(supplies.max, newValue)), max: supplies.max }
    });
  }

  /**
   * Add a new crew member
   */
  async _onAddCrew(event) {
    event.preventDefault();
    const crew = [...this.vesselData.crew];
    crew.push({
      name: "",
      role: "",
      pilotId: null,
      notes: ""
    });
    await this.updateVesselData({ crew });
  }

  /**
   * Remove a crew member
   */
  async _onRemoveCrew(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.closest(".crew-item").dataset.index);
    const crew = [...this.vesselData.crew];
    crew.splice(index, 1);
    await this.updateVesselData({ crew });
  }

  /**
   * Link a pilot to a crew member
   */
  async _onLinkPilot(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.closest(".crew-item").dataset.index);
    const pilotId = event.currentTarget.value || null;
    const crew = [...this.vesselData.crew];
    crew[index].pilotId = pilotId;

    // If linking a pilot, also set the name if empty
    if (pilotId && !crew[index].name) {
      const pilot = game.actors.get(pilotId);
      if (pilot) {
        crew[index].name = pilot.name;
      }
    }

    await this.updateVesselData({ crew });
  }

  /**
   * Open linked pilot's sheet
   */
  _onOpenPilot(event) {
    event.preventDefault();
    const pilotId = event.currentTarget.dataset.pilotId;
    const pilot = game.actors.get(pilotId);
    if (pilot) {
      pilot.sheet.render(true);
    }
  }

  /**
   * Add a new passenger
   */
  async _onAddPassenger(event) {
    event.preventDefault();
    const passengers = [...(this.vesselData.passengers || [])];
    passengers.push({
      name: "",
      role: "",
      pilotId: null,
      notes: ""
    });
    await this.updateVesselData({ passengers });
  }

  /**
   * Remove a passenger
   */
  async _onRemovePassenger(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.closest(".passenger-item").dataset.index);
    const passengers = [...(this.vesselData.passengers || [])];
    passengers.splice(index, 1);
    await this.updateVesselData({ passengers });
  }

  /**
   * Link a pilot to a passenger
   */
  async _onLinkPassengerPilot(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.closest(".passenger-item").dataset.index);
    const pilotId = event.currentTarget.value || null;
    const passengers = [...(this.vesselData.passengers || [])];
    passengers[index].pilotId = pilotId;

    if (pilotId && !passengers[index].name) {
      const pilot = game.actors.get(pilotId);
      if (pilot) {
        passengers[index].name = pilot.name;
      }
    }

    await this.updateVesselData({ passengers });
  }

  /**
   * Handle passenger field changes
   */
  async _onPassengerFieldChange(event) {
    event.preventDefault();
    const field = event.currentTarget;
    const match = field.name.match(/passenger\.(\d+)\.(\w+)/);
    if (!match) return;

    const index = parseInt(match[1]);
    const fieldName = match[2];
    const value = field.value;

    const passengers = [...(this.vesselData.passengers || [])];
    if (passengers[index]) {
      passengers[index][fieldName] = value;
      await this.updateVesselData({ passengers });
    }
  }

  /**
   * Show quality selector
   */
  async _onAddQuality(event) {
    event.preventDefault();

    const currentQualities = this.vesselData.qualities || [];
    const allQualities = await getAvailableVesselQualities();

    const availableQualities = allQualities.filter(q =>
      !currentQualities.some(cq => cq.id === q.id)
    );

    if (availableQualities.length === 0) {
      ui.notifications.warn("All available qualities have been added. Use 'Create Custom Quality' for more.");
      return;
    }

    // Create selection dialog
    const content = `
      <form>
        <div class="form-group">
          <label>Select a Vessel Quality:</label>
          <select name="quality" style="width: 100%;">
            ${availableQualities.map(q => `<option value="${q.id}">${q.name}</option>`).join("")}
          </select>
        </div>
        <div class="quality-preview" style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;">
          <p id="quality-desc">${availableQualities[0]?.description || ""}</p>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Vessel Quality",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const qualityId = html.find('[name="quality"]').val();
            const quality = allQualities.find(q => q.id === qualityId);
            if (quality) {
              const qualities = [...this.vesselData.qualities, quality];
              await this.updateVesselData({ qualities });
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add",
      render: (html) => {
        html.find('[name="quality"]').change((event) => {
          const qualityId = event.currentTarget.value;
          const quality = allQualities.find(q => q.id === qualityId);
          html.find("#quality-desc").text(quality?.description || "");
        });
      }
    }).render(true);
  }

  /**
   * Create a custom quality
   */
  async _onCreateCustomQuality(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Quality Name:</label>
          <input type="text" name="name" placeholder="e.g., Experimental Drive"/>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea name="description" rows="4" placeholder="What does this quality do?"></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Create Custom Quality",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Create",
          callback: async (html) => {
            const name = html.find('[name="name"]').val()?.trim();
            const description = html.find('[name="description"]').val()?.trim();

            if (!name) {
              ui.notifications.warn("Please enter a quality name.");
              return;
            }

            const qualities = [...(this.vesselData.qualities || [])];
            qualities.push({
              id: `custom_${foundry.utils.randomID()}`,
              name,
              description: description || '',
              custom: true
            });

            await this.updateVesselData({ qualities });
            ui.notifications.info(`Added custom quality: ${name}`);
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
   * Remove a quality
   */
  async _onRemoveQuality(event) {
    event.preventDefault();
    const qualityId = event.currentTarget.dataset.qualityId;
    const qualities = this.vesselData.qualities.filter(q => q.id !== qualityId);
    await this.updateVesselData({ qualities });
  }

  /**
   * Select a quality from the list
   */
  async _onSelectQuality(event) {
    event.preventDefault();
    const qualityId = event.currentTarget.dataset.qualityId;
    const allQualities = await getAvailableVesselQualities();
    const quality = allQualities.find(q => q.id === qualityId);

    if (!quality) return;

    const currentQualities = this.vesselData.qualities || [];

    if (currentQualities.some(q => q.id === qualityId)) {
      ui.notifications.warn("This quality is already selected.");
      return;
    }

    const qualities = [...currentQualities, quality];
    await this.updateVesselData({ qualities });
  }

  /**
   * Add a log entry
   */
  async _onAddLogEntry(event) {
    event.preventDefault();
    const textarea = this.element.find(".new-log-content");
    const content = textarea.val()?.trim();

    if (!content) {
      ui.notifications.warn("Please enter log content.");
      return;
    }

    const missionLog = [...(this.vesselData.missionLog || [])];
    missionLog.push({
      date: new Date().toLocaleDateString(),
      content,
      timestamp: Date.now()
    });

    await this.updateVesselData({ missionLog });
    textarea.val("");
  }

  /**
   * Remove a log entry
   */
  async _onRemoveLogEntry(event) {
    event.preventDefault();
    const timestamp = parseInt(event.currentTarget.dataset.timestamp);
    const missionLog = this.vesselData.missionLog.filter(e => e.timestamp !== timestamp);
    await this.updateVesselData({ missionLog });
  }

  /**
   * Set up native HTML5 drag-drop handlers for reserves and crew
   * (LANCER disables Foundry's standard dragDrop system)
   */
  _setupDropHandlers(html) {
    const reservesList = html.find(".reserves-list")[0];
    const crewList = html.find(".crew-list")[0];

    // Handle item drops on reserves list
    if (reservesList) {
      reservesList.addEventListener("dragover", (ev) => ev.preventDefault());
      reservesList.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        const data = JSON.parse(ev.dataTransfer.getData("text/plain") || "{}");
        if (data.type === "Item" && data.uuid) {
          const item = await fromUuid(data.uuid);
          if (item) {
            await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
          }
        }
      });
    }

    // Handle actor drops on crew list
    if (crewList) {
      crewList.addEventListener("dragover", (ev) => ev.preventDefault());
      crewList.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        const data = JSON.parse(ev.dataTransfer.getData("text/plain") || "{}");
        if (data.type === "Actor" && data.uuid) {
          const actor = await fromUuid(data.uuid);
          if (actor?.type === "pilot") {
            const crew = [...this.vesselData.crew];
            if (crew.some(c => c.pilotId === actor.id)) {
              ui.notifications.warn(`${actor.name} is already in the crew roster.`);
              return;
            }
            crew.push({
              name: actor.name,
              role: "",
              pilotId: actor.id,
              notes: ""
            });
            await this.updateVesselData({ crew });
            ui.notifications.info(`Added ${actor.name} to the crew roster.`);
          }
        }
      });
    }

    // Handle actor drops on passenger list
    const passengerList = html.find(".passenger-list")[0];
    if (passengerList) {
      passengerList.addEventListener("dragover", (ev) => ev.preventDefault());
      passengerList.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        const data = JSON.parse(ev.dataTransfer.getData("text/plain") || "{}");
        if (data.type === "Actor" && data.uuid) {
          const actor = await fromUuid(data.uuid);
          if (actor?.type === "pilot") {
            const passengers = [...(this.vesselData.passengers || [])];
            if (passengers.some(p => p.pilotId === actor.id)) {
              ui.notifications.warn(`${actor.name} is already in the passenger manifest.`);
              return;
            }
            passengers.push({
              name: actor.name,
              role: "",
              pilotId: actor.id,
              notes: ""
            });
            await this.updateVesselData({ passengers });
            ui.notifications.info(`Added ${actor.name} to the passenger manifest.`);
          }
        }
      });
    }
  }

  /**
   * Handle chat feature button click
   */
  async _onChatFeature(event) {
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    const type = el.dataset.featureType;
    const id = el.dataset.featureId;
    const vesselData = this.vesselData;

    let data;
    switch (type) {
      case "quality": {
        const quality = (vesselData.qualities || []).find(q => q.id === id);
        if (!quality) return;
        data = { title: quality.name, subtitle: "Vessel Quality", description: quality.description };
        break;
      }
      case "shared-supply": {
        const supply = (vesselData.sharedSupplies || []).find(s => s.id === id);
        if (!supply) return;
        data = {
          title: supply.name, subtitle: "Shared Supply",
          description: supply.description || "",
          tags: [supply.type].filter(Boolean),
          track: { total: supply.track, marked: supply.marked, burned: supply.burned }
        };
        break;
      }
      case "reserve": {
        const item = this.actor.items.get(id);
        if (!item) return;
        const isFarFieldGear = item.getFlag("Far-Field-Foundry-Module-main", "isFarFieldGear") || false;
        const tags = [item.type];
        if (isFarFieldGear) tags.push("Far Field Gear");
        if (item.system?.used) tags.push("Used");
        let track = null;
        if (isFarFieldGear) {
          track = {
            total: item.getFlag("Far-Field-Foundry-Module-main", "track") || 4,
            marked: item.getFlag("Far-Field-Foundry-Module-main", "marked") || 0,
            burned: item.getFlag("Far-Field-Foundry-Module-main", "burned") || 0
          };
        }
        data = {
          title: item.name, subtitle: "Reserve",
          description: item.system?.description || "",
          tags, track
        };
        break;
      }
      default:
        return;
    }

    await postFeatureToChat(this.actor, data);
  }

  /**
   * Toggle a reserve's used state
   */
  async _onToggleReserveUsed(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".reserve-item")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Toggle the used state
    const currentUsed = item.system?.used ?? false;
    await item.update({ "system.used": !currentUsed });
  }

  /**
   * Delete a reserve item
   */
  async _onDeleteReserve(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".reserve-item")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const confirmed = await Dialog.confirm({
      title: "Delete Reserve",
      content: `<p>Are you sure you want to delete "${item.name}"?</p>`,
      yes: () => true,
      no: () => false
    });

    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * Open a reserve item's sheet
   */
  _onOpenReserve(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".reserve-item")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle marking a Far Field gear track box (left-click)
   */
  async _onMarkFarFieldBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const itemId = box.closest(".reserve-item")?.dataset.itemId;
    const boxIndex = parseInt(box.dataset.box);

    if (!itemId || isNaN(boxIndex)) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const currentMarked = item.getFlag("Far-Field-Foundry-Module-main", "marked") || 0;
    const burned = item.getFlag("Far-Field-Foundry-Module-main", "burned") || 0;

    // Can't mark burned boxes
    if (boxIndex <= burned) return;

    // Toggle: if clicking at or below current mark, reduce; otherwise increase
    let newMarked;
    if (boxIndex <= currentMarked) {
      newMarked = boxIndex - 1;
    } else {
      newMarked = boxIndex;
    }

    // Ensure marked is at least equal to burned
    newMarked = Math.max(newMarked, burned);

    await item.setFlag("Far-Field-Foundry-Module-main", "marked", newMarked);
  }

  /**
   * Handle burning a Far Field gear track box (right-click)
   */
  async _onBurnFarFieldBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const itemId = box.closest(".reserve-item")?.dataset.itemId;
    const boxIndex = parseInt(box.dataset.box);

    if (!itemId || isNaN(boxIndex)) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const currentBurned = item.getFlag("Far-Field-Foundry-Module-main", "burned") || 0;
    const track = item.getFlag("Far-Field-Foundry-Module-main", "track") || 4;

    // Toggle: if clicking at or below current burn, reduce; otherwise increase
    let newBurned;
    if (boxIndex <= currentBurned) {
      newBurned = boxIndex - 1;
    } else {
      newBurned = boxIndex;
    }

    // Clamp to valid range
    newBurned = Math.max(0, Math.min(newBurned, track));

    // Update burned and ensure marked is at least burned
    await item.setFlag("Far-Field-Foundry-Module-main", "burned", newBurned);

    const currentMarked = item.getFlag("Far-Field-Foundry-Module-main", "marked") || 0;
    if (currentMarked < newBurned) {
      await item.setFlag("Far-Field-Foundry-Module-main", "marked", newBurned);
    }
  }

  /**
   * Add a new shared supply
   */
  async _onAddSharedSupply(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Supply Name:</label>
          <input type="text" name="name" placeholder="e.g., Emergency Rations"/>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select name="type">
            <option value="Supply">Supply</option>
            <option value="Equipment">Equipment</option>
            <option value="Consumable">Consumable</option>
          </select>
        </div>
        <div class="form-group">
          <label>Track Size:</label>
          <input type="number" name="track" value="4" min="1" max="10"/>
        </div>
        <div class="form-group">
          <label>Description (optional):</label>
          <textarea name="description" rows="2" placeholder="Notes about this supply..."></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Shared Supply",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const name = html.find('[name="name"]').val()?.trim();
            const type = html.find('[name="type"]').val();
            const track = parseInt(html.find('[name="track"]').val()) || 4;
            const description = html.find('[name="description"]').val()?.trim();

            if (!name) {
              ui.notifications.warn("Please enter a supply name.");
              return;
            }

            const sharedSupplies = [...(this.vesselData.sharedSupplies || [])];
            sharedSupplies.push({
              id: foundry.utils.randomID(),
              name,
              type,
              track: Math.max(1, Math.min(10, track)),
              marked: 0,
              burned: 0,
              description: description || ""
            });

            await this.updateVesselData({ sharedSupplies });
            ui.notifications.info(`Added shared supply: ${name}`);
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
   * Remove a shared supply
   */
  async _onRemoveSharedSupply(event) {
    event.preventDefault();
    const supplyId = event.currentTarget.dataset.supplyId;

    const supply = this.vesselData.sharedSupplies.find(s => s.id === supplyId);
    if (!supply) return;

    const confirmed = await Dialog.confirm({
      title: "Remove Shared Supply",
      content: `<p>Are you sure you want to remove "${supply.name}"?</p>`,
      yes: () => true,
      no: () => false
    });

    if (confirmed) {
      const sharedSupplies = this.vesselData.sharedSupplies.filter(s => s.id !== supplyId);
      await this.updateVesselData({ sharedSupplies });
    }
  }

  /**
   * Mark a shared supply track box (left-click)
   */
  async _onMarkSharedSupplyBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const supplyId = box.closest(".shared-supply-item")?.dataset.supplyId;
    const boxIndex = parseInt(box.dataset.box);

    if (!supplyId || isNaN(boxIndex)) return;

    const sharedSupplies = [...(this.vesselData.sharedSupplies || [])];
    const supply = sharedSupplies.find(s => s.id === supplyId);
    if (!supply) return;

    // Can't mark burned boxes
    if (boxIndex <= supply.burned) return;

    // Toggle: if clicking at or below current mark, reduce; otherwise increase
    if (boxIndex <= supply.marked) {
      supply.marked = boxIndex - 1;
    } else {
      supply.marked = boxIndex;
    }

    // Ensure marked is at least equal to burned
    supply.marked = Math.max(supply.marked, supply.burned);

    await this.updateVesselData({ sharedSupplies });
  }

  /**
   * Burn a shared supply track box (right-click)
   */
  async _onBurnSharedSupplyBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const supplyId = box.closest(".shared-supply-item")?.dataset.supplyId;
    const boxIndex = parseInt(box.dataset.box);

    if (!supplyId || isNaN(boxIndex)) return;

    const sharedSupplies = [...(this.vesselData.sharedSupplies || [])];
    const supply = sharedSupplies.find(s => s.id === supplyId);
    if (!supply) return;

    // Toggle: if clicking at or below current burn, reduce; otherwise increase
    if (boxIndex <= supply.burned) {
      supply.burned = boxIndex - 1;
    } else {
      supply.burned = boxIndex;
    }

    // Clamp to valid range
    supply.burned = Math.max(0, Math.min(supply.burned, supply.track));

    // Ensure marked is at least equal to burned
    if (supply.marked < supply.burned) {
      supply.marked = supply.burned;
    }

    await this.updateVesselData({ sharedSupplies });
  }

  /**
   * Reset a shared supply (clear all marks, keep burns)
   */
  async _onResetSharedSupply(event) {
    event.preventDefault();
    const supplyId = event.currentTarget.dataset.supplyId;

    const sharedSupplies = [...(this.vesselData.sharedSupplies || [])];
    const supply = sharedSupplies.find(s => s.id === supplyId);
    if (!supply) return;

    // Reset marked to equal burned (clear temporary uses)
    supply.marked = supply.burned;

    await this.updateVesselData({ sharedSupplies });
    ui.notifications.info(`Reset ${supply.name}`);
  }
}
