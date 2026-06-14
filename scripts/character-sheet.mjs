/**
 * Far Field Character Sheet for LANCER
 * Character sheet for tracking Far Field rangers with edges, backgrounds, skills, aspects, and progression
 */

import { MODULE_ID, FLAGS, getDefaultCharacterData, importCharacterData, isVessel, getVesselData } from "./main.mjs";
import { postFeatureToChat } from "./chat.mjs";
import {
  FAR_FIELD_SKILLS,
  FAR_FIELD_EDGES,
  ORIGIN_OPTIONS,
  ROLE_OPTIONS,
  DISCIPLINE_OPTIONS,
  ASPECTS_BY_BACKGROUND,
  STANDARD_SUPPLIES,
  PROGRESSION_OPTIONS,
  getAvailableAspects,
  getDefaultSkills
} from "./character-data.mjs";

// Extend a placeholder at import time; the real ActorSheet base is bound during
// `init` (see reparentFarFieldSheetBases() in main.mjs and vessel-sheet.mjs).
class _FarFieldSheetBase {}

export class CharacterSheet extends _FarFieldSheetBase {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "character-sheet", "far-field-character"],
      template: "modules/Far-Field-Foundry-Module-main/templates/character-sheet.hbs",
      width: 850,
      height: 750,
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
    return "modules/Far-Field-Foundry-Module-main/templates/character-sheet.hbs";
  }

  /** @override */
  async _render(force, options) {
    // Repair legacy imports: web app used to store edges as objects, Foundry expects ID strings.
    // Without this, the click handler can't match IDs and edges appear frozen at 3/3.
    if (this.isEditable) {
      const raw = this.actor.getFlag(MODULE_ID, FLAGS.character);
      if (Array.isArray(raw?.edges) && raw.edges.some(e => typeof e !== 'string')) {
        const cleanEdges = raw.edges.map(e => typeof e === 'string' ? e : e?.id).filter(Boolean);
        await this.actor.setFlag(MODULE_ID, FLAGS.character, { ...raw, edges: cleanEdges });
      }
    }

    await super._render(force, options);

    // Register hook to listen for vessel updates (only once)
    if (!this._vesselUpdateHook) {
      this._vesselUpdateHook = Hooks.on("updateActor", this._onVesselUpdate.bind(this));
    }
  }

  /** @override */
  async close(options) {
    // Clean up hook when sheet closes
    if (this._vesselUpdateHook) {
      Hooks.off("updateActor", this._vesselUpdateHook);
      this._vesselUpdateHook = null;
    }
    return super.close(options);
  }

  /**
   * Re-render when a linked vessel updates
   */
  _onVesselUpdate(actor, changes, options, userId) {
    if (actor.id === this.actor.id) return;
    if (!isVessel(actor)) return;

    // Check if we're crew on this vessel
    const vesselData = getVesselData(actor);
    const isInCrew = vesselData?.crew?.some(c => c.pilotId === this.actor.id);
    if (isInCrew) {
      this.render(false); // Soft re-render
    }
  }

  /**
   * Get character data from flags.
   * Edges must be ID strings; coerce here so any malformed flag data (e.g. legacy
   * web-app imports that stored full edge objects) can never freeze the click handler.
   */
  get characterData() {
    const data = this.actor.getFlag(MODULE_ID, FLAGS.character) || getDefaultCharacterData();
    if (Array.isArray(data.edges) && data.edges.some(e => typeof e !== 'string')) {
      return {
        ...data,
        edges: data.edges.map(e => typeof e === 'string' ? e : e?.id).filter(Boolean)
      };
    }
    return data;
  }

  /**
   * Update character data in flags
   */
  async updateCharacterData(data) {
    const currentData = this.characterData;
    const newData = foundry.utils.mergeObject(currentData, data, { inplace: false });
    return this.actor.setFlag(MODULE_ID, FLAGS.character, newData);
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const actorData = this.actor.toObject(false);
    const charData = this.characterData;

    // Add character data to context
    context.character = charData;
    context.flags = actorData.flags;

    // Edge data
    context.allEdges = FAR_FIELD_EDGES;
    context.selectedEdgeIds = charData.edges || [];
    context.selectedEdgeCount = context.selectedEdgeIds.length;

    // Background options
    context.originOptions = ORIGIN_OPTIONS;
    context.roleOptions = ROLE_OPTIONS;
    context.disciplineOptions = DISCIPLINE_OPTIONS;

    // Current background selections with full data
    context.selectedOrigin = charData.backgrounds?.origin
      ? ORIGIN_OPTIONS.find(o => o.id === charData.backgrounds.origin.id)
      : null;
    context.selectedRole = charData.backgrounds?.role
      ? ROLE_OPTIONS.find(r => r.id === charData.backgrounds.role.id)
      : null;
    context.selectedDiscipline = charData.backgrounds?.discipline
      ? DISCIPLINE_OPTIONS.find(d => d.id === charData.backgrounds.discipline.id)
      : null;

    // Skills with full data
    context.skills = FAR_FIELD_SKILLS.map(skill => {
      const skillData = charData.skills?.[skill.id] || { rank: 0, failures: [] };
      return {
        ...skill,
        rank: skillData.rank,
        failures: skillData.failures || [],
        maxRank: 3,
        failureTrack: skillData.rank > 0 ? skillData.rank : 1 // Failure track size = rank (min 1)
      };
    });

    // Aspects - combine character aspects with available background aspects
    context.aspects = charData.aspects || [];
    context.availableAspects = getAvailableAspects(charData.backgrounds || {});

    // Filter available aspects to show which haven't been added yet
    const addedAspectIds = context.aspects.map(a => a.id);
    context.unaddedAspects = context.availableAspects.filter(a => !addedAspectIds.includes(a.id));

    // Group aspects by source
    context.aspectsBySource = {
      origin: context.aspects.filter(a => a.source === 'origin'),
      role: context.aspects.filter(a => a.source === 'role'),
      discipline: context.aspects.filter(a => a.source === 'discipline'),
      custom: context.aspects.filter(a => a.source === 'custom')
    };

    // Resources
    context.resources = charData.resources || [];
    context.standardSupplies = STANDARD_SUPPLIES;

    // Drives
    context.drives = charData.drives || [];

    // Burdens
    context.burdens = charData.burdens || [];

    // Milestones and Progression
    context.milestones = charData.milestones || [];
    context.unspentMilestones = context.milestones.filter(m => !m.spent);
    context.availableMilestoneCount = context.unspentMilestones.length;
    context.progressionOptions = PROGRESSION_OPTIONS;
    context.progressionLog = charData.progressionLog || [];

    // Find vessels this character is assigned to
    context.assignedVessels = this._findAssignedVessels();

    // Editable state
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;

    return context;
  }


  /**
   * Find all vessels where this character is listed as crew
   * @returns {Array} Array of vessel data with shared supplies
   */
  _findAssignedVessels() {
    const vessels = [];
    const myActorId = this.actor.id;

    // Search all actors for vessels that have this character in crew
    for (const actor of game.actors) {
      if (!isVessel(actor)) continue;

      const vesselData = getVesselData(actor);
      if (!vesselData?.crew) continue;

      // Check if this character is in the crew
      const crewMember = vesselData.crew.find(c => c.pilotId === myActorId);
      if (!crewMember) continue;

      // Found a vessel - add it with relevant data
      vessels.push({
        id: actor.id,
        name: actor.name,
        img: actor.img,
        role: crewMember.role || "Crew",
        class: vesselData.class || "ranger",
        hull: vesselData.hull,
        supplies: vesselData.supplies,
        systemsStatus: vesselData.systemsStatus,
        sharedSupplies: (vesselData.sharedSupplies || []).map(supply => ({
          ...supply,
          available: supply.track - supply.burned
        }))
      });
    }

    return vessels;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Chat feature buttons work for all viewers
    html.find(".chat-feature").click(this._onChatFeature.bind(this));

    if (!this.isEditable) return;

    // Edge selection
    html.find(".edge-card").click(this._onEdgeClick.bind(this));

    // Background dropdowns
    html.find('select[name="background.origin"]').change(this._onOriginChange.bind(this));
    html.find('select[name="background.role"]').change(this._onRoleChange.bind(this));
    html.find('select[name="background.discipline"]').change(this._onDisciplineChange.bind(this));

    // Skill rank pips
    html.find(".skill-rank-pip").click(this._onSkillRankClick.bind(this));

    // Skill failure boxes
    html.find(".skill-failure-box").click(this._onSkillFailureClick.bind(this));

    // Aspect track boxes
    html.find(".aspect-track-box").click(this._onAspectBoxClick.bind(this));
    html.find(".aspect-track-box").contextmenu(this._onAspectBoxBurn.bind(this));

    // Add aspect from background
    html.find(".add-aspect").click(this._onAddAspect.bind(this));

    // Create custom aspect
    html.find(".create-custom-aspect").click(this._onCreateCustomAspect.bind(this));

    // Add aspect from any background
    html.find(".add-any-aspect").click(this._onAddAnyAspect.bind(this));

    // Remove aspect
    html.find(".remove-aspect").click(this._onRemoveAspect.bind(this));

    // Resource management
    html.find(".add-resource").click(this._onAddResource.bind(this));
    html.find(".remove-resource").click(this._onRemoveResource.bind(this));
    html.find(".resource-track-box").click(this._onResourceBoxClick.bind(this));
    html.find(".resource-track-box").contextmenu(this._onResourceBoxBurn.bind(this));

    // Drive management
    html.find(".add-drive").click(this._onAddDrive.bind(this));
    html.find(".remove-drive").click(this._onRemoveDrive.bind(this));
    html.find('input[name^="drive."]').change(this._onDriveFieldChange.bind(this));

    // Burden management
    html.find(".add-burden").click(this._onAddBurden.bind(this));
    html.find(".remove-burden").click(this._onRemoveBurden.bind(this));
    html.find(".burden-track-box").click(this._onBurdenBoxClick.bind(this));
    html.find(".burden-track-box").contextmenu(this._onBurdenBoxBurn.bind(this));

    // Milestone management
    html.find(".add-milestone").click(this._onAddMilestone.bind(this));
    html.find(".remove-milestone").click(this._onRemoveMilestone.bind(this));

    // Open the standalone Squad Pools window
    html.find(".open-squad-pools").click(this._onOpenSquadPools.bind(this));

    // Import character
    html.find(".import-character").click(this._onImportCharacter.bind(this));

    // Vessel interactions
    html.find(".open-vessel").click(this._onOpenVessel.bind(this));
    html.find(".vessel-shared-supply-box").click(this._onMarkVesselSupplyBox.bind(this));
    html.find(".vessel-shared-supply-box").contextmenu(this._onBurnVesselSupplyBox.bind(this));
  }

  /**
   * Handle edge card click — always toggles, no cap. The "3 edges" guideline
   * is shown in the UI but not enforced here, so the click handler never has
   * a return-without-write path that would feel like a frozen sheet.
   */
  async _onEdgeClick(event) {
    event.preventDefault();
    const edgeId = event.currentTarget.dataset.edgeId;
    const edges = [...(this.characterData.edges || [])];
    const index = edges.indexOf(edgeId);

    if (index >= 0) edges.splice(index, 1);
    else            edges.push(edgeId);

    await this.updateCharacterData({ edges });
  }

  /**
   * Handle origin selection change
   */
  async _onOriginChange(event) {
    event.preventDefault();
    const originId = event.currentTarget.value;
    const origin = originId ? ORIGIN_OPTIONS.find(o => o.id === originId) : null;

    const backgrounds = { ...this.characterData.backgrounds };
    backgrounds.origin = origin ? { id: origin.id, name: origin.name } : null;

    await this.updateCharacterData({ backgrounds });
  }

  /**
   * Handle role selection change
   */
  async _onRoleChange(event) {
    event.preventDefault();
    const roleId = event.currentTarget.value;
    const role = roleId ? ROLE_OPTIONS.find(r => r.id === roleId) : null;

    const backgrounds = { ...this.characterData.backgrounds };
    backgrounds.role = role ? { id: role.id, name: role.name } : null;

    await this.updateCharacterData({ backgrounds });
  }

  /**
   * Handle discipline selection change
   */
  async _onDisciplineChange(event) {
    event.preventDefault();
    const disciplineId = event.currentTarget.value;
    const discipline = disciplineId ? DISCIPLINE_OPTIONS.find(d => d.id === disciplineId) : null;

    const backgrounds = { ...this.characterData.backgrounds };
    backgrounds.discipline = discipline ? { id: discipline.id, name: discipline.name } : null;

    await this.updateCharacterData({ backgrounds });
  }

  /**
   * Handle skill rank pip click
   */
  async _onSkillRankClick(event) {
    event.preventDefault();
    const skillId = event.currentTarget.dataset.skillId;
    const targetRank = parseInt(event.currentTarget.dataset.rank);

    const skills = { ...this.characterData.skills };
    if (!skills[skillId]) {
      skills[skillId] = { rank: 0, failures: [] };
    }

    // Toggle: if clicking current rank, decrease; otherwise set to target
    if (skills[skillId].rank === targetRank) {
      skills[skillId].rank = targetRank - 1;
    } else {
      skills[skillId].rank = targetRank;
    }

    await this.updateCharacterData({ skills });
  }

  /**
   * Handle skill failure box click
   */
  async _onSkillFailureClick(event) {
    event.preventDefault();
    const skillId = event.currentTarget.dataset.skillId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const skills = { ...this.characterData.skills };
    if (!skills[skillId]) {
      skills[skillId] = { rank: 0, failures: [] };
    }

    const failures = [...(skills[skillId].failures || [])];
    const failureIndex = failures.indexOf(boxIndex);

    if (failureIndex >= 0) {
      failures.splice(failureIndex, 1);
    } else {
      failures.push(boxIndex);
    }

    skills[skillId].failures = failures;
    await this.updateCharacterData({ skills });
  }

  /**
   * Handle aspect track box click (mark)
   */
  async _onAspectBoxClick(event) {
    event.preventDefault();
    const aspectId = event.currentTarget.dataset.aspectId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const aspects = [...this.characterData.aspects];
    const aspect = aspects.find(a => a.id === aspectId);
    if (!aspect) return;

    // Toggle mark
    if (aspect.marked >= boxIndex) {
      aspect.marked = boxIndex - 1;
    } else {
      aspect.marked = boxIndex;
    }

    await this.updateCharacterData({ aspects });
  }

  /**
   * Handle aspect track box right-click (burn)
   */
  async _onAspectBoxBurn(event) {
    event.preventDefault();
    const aspectId = event.currentTarget.dataset.aspectId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const aspects = [...this.characterData.aspects];
    const aspect = aspects.find(a => a.id === aspectId);
    if (!aspect) return;

    // Toggle burn
    if (aspect.burned >= boxIndex) {
      aspect.burned = boxIndex - 1;
      aspect.marked = Math.min(aspect.marked, aspect.track);
    } else {
      aspect.burned = boxIndex;
      aspect.marked = Math.max(aspect.marked, boxIndex);
    }

    await this.updateCharacterData({ aspects });
  }

  /**
   * Handle add aspect button
   */
  async _onAddAspect(event) {
    event.preventDefault();
    const aspectId = event.currentTarget.dataset.aspectId;

    // Find the aspect in available aspects
    const availableAspects = getAvailableAspects(this.characterData.backgrounds || {});
    const aspectToAdd = availableAspects.find(a => a.id === aspectId);

    if (!aspectToAdd) {
      ui.notifications.error("Aspect not found.");
      return;
    }

    const aspects = [...(this.characterData.aspects || [])];

    // Check if already added
    if (aspects.some(a => a.id === aspectId)) {
      ui.notifications.warn("This aspect is already added.");
      return;
    }

    aspects.push({
      id: aspectToAdd.id,
      name: aspectToAdd.name,
      type: aspectToAdd.type,
      source: aspectToAdd.source,
      sourceName: aspectToAdd.sourceName,
      track: aspectToAdd.track,
      marked: 0,
      burned: 0,
      description: aspectToAdd.description
    });

    await this.updateCharacterData({ aspects });
  }

  /**
   * Handle create custom aspect button
   */
  async _onCreateCustomAspect(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Aspect Name:</label>
          <input type="text" name="name" placeholder="e.g., Lucky Charm"/>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select name="type">
            <option value="Expertise">Expertise</option>
            <option value="Equipment">Equipment</option>
            <option value="Consumable">Consumable</option>
          </select>
        </div>
        <div class="form-group">
          <label>Track Size:</label>
          <input type="number" name="track" value="3" min="1" max="10"/>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea name="description" rows="3" placeholder="What does this aspect represent?"></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Create Custom Aspect",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Create",
          callback: async (html) => {
            const name = html.find('[name="name"]').val();
            const type = html.find('[name="type"]').val();
            const track = parseInt(html.find('[name="track"]').val()) || 3;
            const description = html.find('[name="description"]').val();

            if (!name) {
              ui.notifications.warn("Please enter an aspect name.");
              return;
            }

            const aspects = [...(this.characterData.aspects || [])];
            aspects.push({
              id: foundry.utils.randomID(),
              name,
              type,
              source: 'custom',
              sourceName: 'Custom',
              track,
              marked: 0,
              burned: 0,
              description: description || ''
            });

            await this.updateCharacterData({ aspects });
            ui.notifications.info(`Added custom aspect: ${name}`);
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
   * Handle add aspect from any background
   */
  async _onAddAnyAspect(event) {
    event.preventDefault();

    // Gather ALL aspects from ALL backgrounds
    const allAspects = [];
    const addedAspectIds = (this.characterData.aspects || []).map(a => a.id);

    for (const [category, backgrounds] of Object.entries(ASPECTS_BY_BACKGROUND)) {
      for (const [bgId, aspects] of Object.entries(backgrounds)) {
        // Get the background name
        let bgName = bgId;
        let categoryName = category;

        if (category === 'origins') {
          const origin = ORIGIN_OPTIONS.find(o => o.id === bgId);
          bgName = origin?.name || bgId;
          categoryName = 'Origin';
        } else if (category === 'roles') {
          const role = ROLE_OPTIONS.find(r => r.id === bgId);
          bgName = role?.name || bgId;
          categoryName = 'Role';
        } else if (category === 'disciplines') {
          const discipline = DISCIPLINE_OPTIONS.find(d => d.id === bgId);
          bgName = discipline?.name || bgId;
          categoryName = 'Discipline';
        }

        for (const aspect of aspects) {
          // Skip already added aspects
          if (addedAspectIds.includes(aspect.id)) continue;

          allAspects.push({
            ...aspect,
            source: category.replace(/s$/, ''), // origins -> origin
            sourceName: bgName,
            categoryName
          });
        }
      }
    }

    if (allAspects.length === 0) {
      ui.notifications.warn("All aspects have already been added.");
      return;
    }

    // Group by category for the dropdown
    const groupedOptions = {};
    for (const aspect of allAspects) {
      const key = `${aspect.categoryName}: ${aspect.sourceName}`;
      if (!groupedOptions[key]) groupedOptions[key] = [];
      groupedOptions[key].push(aspect);
    }

    // Build the select options with optgroups
    let optionsHtml = '';
    for (const [groupName, aspects] of Object.entries(groupedOptions)) {
      optionsHtml += `<optgroup label="${groupName}">`;
      for (const aspect of aspects) {
        optionsHtml += `<option value="${aspect.id}" data-source="${aspect.source}" data-source-name="${aspect.sourceName}">${aspect.name} (${aspect.type}, Track ${aspect.track})</option>`;
      }
      optionsHtml += '</optgroup>';
    }

    const content = `
      <form>
        <p>Select an aspect from any background. This is your free 4th aspect choice.</p>
        <div class="form-group">
          <label>Aspect:</label>
          <select name="aspectId" style="width: 100%;">
            ${optionsHtml}
          </select>
        </div>
        <div class="form-group aspect-preview" style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px;">
          <em>Select an aspect to see its description</em>
        </div>
      </form>
    `;

    const dialog = new Dialog({
      title: "Add Aspect from Any Background",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add Aspect",
          callback: async (html) => {
            const select = html.find('[name="aspectId"]');
            const aspectId = select.val();
            const selectedOption = select.find(':selected');
            const source = selectedOption.data('source');
            const sourceName = selectedOption.data('sourceName');

            // Find the full aspect definition
            const aspectDef = allAspects.find(a => a.id === aspectId);
            if (!aspectDef) {
              ui.notifications.error("Aspect not found.");
              return;
            }

            const aspects = [...(this.characterData.aspects || [])];
            aspects.push({
              id: aspectDef.id,
              name: aspectDef.name,
              type: aspectDef.type,
              source,
              sourceName,
              track: aspectDef.track,
              marked: 0,
              burned: 0,
              description: aspectDef.description
            });

            await this.updateCharacterData({ aspects });
            ui.notifications.info(`Added aspect: ${aspectDef.name}`);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "add",
      render: (html) => {
        // Add change handler to show aspect description
        html.find('[name="aspectId"]').change((e) => {
          const aspectId = e.target.value;
          const aspect = allAspects.find(a => a.id === aspectId);
          const preview = html.find('.aspect-preview');
          if (aspect) {
            preview.html(`<strong>${aspect.name}</strong> (${aspect.type})<br>${aspect.description}`);
          }
        }).trigger('change');
      }
    });

    dialog.render(true);
  }

  /**
   * Handle remove aspect button
   */
  async _onRemoveAspect(event) {
    event.preventDefault();
    const aspectId = event.currentTarget.dataset.aspectId;

    const aspects = this.characterData.aspects.filter(a => a.id !== aspectId);
    await this.updateCharacterData({ aspects });
  }

  /**
   * Handle add resource button
   */
  async _onAddResource(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Resource Name:</label>
          <input type="text" name="name" value="New Resource"/>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select name="type">
            <option value="Equipment">Equipment</option>
            <option value="Consumable">Consumable</option>
            <option value="Supply">Supply</option>
          </select>
        </div>
        <div class="form-group">
          <label>Track Size:</label>
          <input type="number" name="track" value="3" min="1" max="10"/>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Resource",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const name = html.find('[name="name"]').val() || "New Resource";
            const type = html.find('[name="type"]').val();
            const track = parseInt(html.find('[name="track"]').val()) || 3;

            const resources = [...(this.characterData.resources || [])];
            resources.push({
              id: foundry.utils.randomID(),
              name,
              type,
              track,
              marked: 0,
              burned: 0
            });

            await this.updateCharacterData({ resources });
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
   * Handle remove resource button
   */
  async _onRemoveResource(event) {
    event.preventDefault();
    const resourceId = event.currentTarget.dataset.resourceId;

    const resources = this.characterData.resources.filter(r => r.id !== resourceId);
    await this.updateCharacterData({ resources });
  }

  /**
   * Handle resource track box click
   */
  async _onResourceBoxClick(event) {
    event.preventDefault();
    const resourceId = event.currentTarget.dataset.resourceId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const resources = [...this.characterData.resources];
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    if (resource.marked >= boxIndex) {
      resource.marked = boxIndex - 1;
    } else {
      resource.marked = boxIndex;
    }

    await this.updateCharacterData({ resources });
  }

  /**
   * Handle resource track box burn
   */
  async _onResourceBoxBurn(event) {
    event.preventDefault();
    const resourceId = event.currentTarget.dataset.resourceId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const resources = [...this.characterData.resources];
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    if (resource.burned >= boxIndex) {
      resource.burned = boxIndex - 1;
      resource.marked = Math.min(resource.marked, resource.track);
    } else {
      resource.burned = boxIndex;
      resource.marked = Math.max(resource.marked, boxIndex);
    }

    await this.updateCharacterData({ resources });
  }

  /**
   * Handle add drive button
   */
  async _onAddDrive(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Drive:</label>
          <input type="text" name="name" placeholder="e.g., Protect the innocent"/>
        </div>
        <div class="form-group">
          <label>Notes:</label>
          <textarea name="note" rows="2"></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Drive",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const name = html.find('[name="name"]').val();
            const note = html.find('[name="note"]').val();

            if (!name) {
              ui.notifications.warn("Please enter a drive name.");
              return;
            }

            const drives = [...(this.characterData.drives || [])];
            drives.push({
              id: foundry.utils.randomID(),
              name,
              note
            });

            await this.updateCharacterData({ drives });
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
   * Handle remove drive button
   */
  async _onRemoveDrive(event) {
    event.preventDefault();
    const driveId = event.currentTarget.dataset.driveId;

    const drives = this.characterData.drives.filter(d => d.id !== driveId);
    await this.updateCharacterData({ drives });
  }

  /**
   * Handle drive field change
   */
  async _onDriveFieldChange(event) {
    event.preventDefault();
    const field = event.currentTarget;
    const match = field.name.match(/drive\.(\w+)\.(\w+)/);
    if (!match) return;

    const driveId = match[1];
    const fieldName = match[2];
    const value = field.value;

    const drives = [...this.characterData.drives];
    const drive = drives.find(d => d.id === driveId);
    if (drive) {
      drive[fieldName] = value;
      await this.updateCharacterData({ drives });
    }
  }

  /**
   * Handle add burden button
   */
  async _onAddBurden(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>Burden Name:</label>
          <input type="text" name="name" placeholder="e.g., Radiation Sickness"/>
        </div>
        <div class="form-group">
          <label>Severity (Track Size):</label>
          <select name="track">
            <option value="2">Minor (2 boxes)</option>
            <option value="3" selected>Standard (3 boxes)</option>
            <option value="4">Major (4 boxes)</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: "Add Burden",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Add",
          callback: async (html) => {
            const name = html.find('[name="name"]').val();
            const track = parseInt(html.find('[name="track"]').val()) || 3;

            if (!name) {
              ui.notifications.warn("Please enter a burden name.");
              return;
            }

            const burdens = [...(this.characterData.burdens || [])];
            burdens.push({
              id: foundry.utils.randomID(),
              name,
              track,
              marked: 0,
              burned: 0
            });

            await this.updateCharacterData({ burdens });
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
   * Handle remove burden button
   */
  async _onRemoveBurden(event) {
    event.preventDefault();
    const burdenId = event.currentTarget.dataset.burdenId;

    const burdens = this.characterData.burdens.filter(b => b.id !== burdenId);
    await this.updateCharacterData({ burdens });
  }

  /**
   * Handle burden track box click
   */
  async _onBurdenBoxClick(event) {
    event.preventDefault();
    const burdenId = event.currentTarget.dataset.burdenId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const burdens = [...this.characterData.burdens];
    const burden = burdens.find(b => b.id === burdenId);
    if (!burden) return;

    if (burden.marked >= boxIndex) {
      burden.marked = boxIndex - 1;
    } else {
      burden.marked = boxIndex;
    }

    await this.updateCharacterData({ burdens });
  }

  /**
   * Handle burden track box burn
   */
  async _onBurdenBoxBurn(event) {
    event.preventDefault();
    const burdenId = event.currentTarget.dataset.burdenId;
    const boxIndex = parseInt(event.currentTarget.dataset.box);

    const burdens = [...this.characterData.burdens];
    const burden = burdens.find(b => b.id === burdenId);
    if (!burden) return;

    if (burden.burned >= boxIndex) {
      burden.burned = boxIndex - 1;
    } else {
      burden.burned = boxIndex;
      burden.marked = Math.max(burden.marked, boxIndex);
    }

    await this.updateCharacterData({ burdens });
  }

  /**
   * Handle add milestone button
   */
  async _onAddMilestone(event) {
    event.preventDefault();
    const drives = this.characterData.drives || [];

    const driveOptions = drives.length > 0
      ? drives.map(d => `<option value="${d.id}">${d.name}</option>`).join("")
      : '<option value="">No drives defined</option>';

    const content = `
      <form>
        <div class="form-group">
          <label>Associated Drive:</label>
          <select name="driveId">
            ${driveOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea name="note" rows="3" placeholder="What happened?"></textarea>
        </div>
      </form>
    `;

    new Dialog({
      title: "Record Milestone",
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Record",
          callback: async (html) => {
            const driveId = html.find('[name="driveId"]').val();
            const note = html.find('[name="note"]').val();

            const milestones = [...(this.characterData.milestones || [])];
            milestones.push({
              id: foundry.utils.randomID(),
              driveId,
              note,
              recordedAt: new Date().toISOString(),
              spent: false
            });

            await this.updateCharacterData({ milestones });
            ui.notifications.info("Milestone recorded!");
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
   * Handle remove milestone button
   */
  async _onRemoveMilestone(event) {
    event.preventDefault();
    const milestoneId = event.currentTarget.dataset.milestoneId;

    const milestones = this.characterData.milestones.filter(m => m.id !== milestoneId);
    await this.updateCharacterData({ milestones });
  }

  /**
   * Open the standalone Squad Pools application.
   */
  async _onOpenSquadPools(event) {
    if (event) event.preventDefault();
    const mod = game.modules.get(MODULE_ID);
    if (mod?.openSquadPools) mod.openSquadPools();
    else ui.notifications.warn("Squad Pools app not loaded.");
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
    const charData = this.characterData;

    let data;
    switch (type) {
      case "edge": {
        const edge = FAR_FIELD_EDGES.find(e => e.id === id);
        if (!edge) return;
        data = { title: edge.name, subtitle: "Edge", description: edge.description };
        break;
      }
      case "background": {
        // id is "origin", "role", or "discipline"
        const bgMap = { origin: this._getContextSync().selectedOrigin, role: this._getContextSync().selectedRole, discipline: this._getContextSync().selectedDiscipline };
        const bg = bgMap[id];
        if (!bg) return;
        data = { title: bg.name, subtitle: id.charAt(0).toUpperCase() + id.slice(1), description: bg.description };
        break;
      }
      case "skill": {
        const skillDef = FAR_FIELD_SKILLS.find(s => s.id === id);
        if (!skillDef) return;
        const skillData = charData.skills?.[id] || { rank: 0 };
        const pips = Array.from({ length: 3 }, (_, i) => i < skillData.rank ? "\u25C9" : "\u25CB").join(" ");
        data = { title: skillDef.name, subtitle: "Skill", description: skillDef.description, tags: [`Rank ${skillData.rank} ${pips}`] };
        break;
      }
      case "aspect": {
        const aspect = (charData.aspects || []).find(a => a.id === id);
        if (!aspect) return;
        data = {
          title: aspect.name, subtitle: "Aspect",
          description: aspect.description,
          tags: [aspect.type, aspect.sourceName].filter(Boolean),
          track: { total: aspect.track, marked: aspect.marked, burned: aspect.burned }
        };
        break;
      }
      case "resource": {
        const resource = (charData.resources || []).find(r => r.id === id);
        if (!resource) return;
        data = {
          title: resource.name, subtitle: "Resource",
          tags: [resource.type],
          track: { total: resource.track, marked: resource.marked, burned: resource.burned }
        };
        break;
      }
      case "drive": {
        const drive = (charData.drives || []).find(d => d.id === id);
        if (!drive) return;
        data = { title: drive.name, subtitle: "Drive", description: drive.note || "" };
        break;
      }
      case "burden": {
        const burden = (charData.burdens || []).find(b => b.id === id);
        if (!burden) return;
        data = {
          title: burden.name, subtitle: "Burden",
          track: { total: burden.track, marked: burden.marked, burned: burden.burned }
        };
        break;
      }
      default:
        return;
    }

    await postFeatureToChat(this.actor, data);
  }

  /**
   * Synchronous helper to get background lookup data without a full getData() call
   */
  _getContextSync() {
    const charData = this.characterData;
    return {
      selectedOrigin: charData.backgrounds?.origin ? ORIGIN_OPTIONS.find(o => o.id === charData.backgrounds.origin.id) : null,
      selectedRole: charData.backgrounds?.role ? ROLE_OPTIONS.find(r => r.id === charData.backgrounds.role.id) : null,
      selectedDiscipline: charData.backgrounds?.discipline ? DISCIPLINE_OPTIONS.find(d => d.id === charData.backgrounds.discipline.id) : null
    };
  }

  /**
   * Handle import character button click
   */
  async _onImportCharacter(event) {
    event.preventDefault();

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = importCharacterData(text);

        // Update actor name if provided in import
        if (imported.name) {
          await this.actor.update({ name: imported.name });
          delete imported.name; // Don't store name in flags
        }

        // Update character data with imported values
        await this.updateCharacterData(imported);
        ui.notifications.info(`Character imported successfully!`);
      } catch (err) {
        console.error("Import failed:", err);
        ui.notifications.error(`Import failed: ${err.message}`);
      }
    };

    input.click();
  }

  /**
   * Open a linked vessel's sheet
   */
  _onOpenVessel(event) {
    event.preventDefault();
    const vesselId = event.currentTarget.dataset.vesselId;
    const vessel = game.actors.get(vesselId);
    if (vessel) {
      vessel.sheet.render(true);
    }
  }

  /**
   * Mark a vessel's shared supply track box (left-click)
   * Updates the vessel's data directly
   */
  async _onMarkVesselSupplyBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const vesselId = box.closest(".vessel-supply-item")?.dataset.vesselId;
    const supplyId = box.closest(".vessel-supply-item")?.dataset.supplyId;
    const boxIndex = parseInt(box.dataset.box);

    if (!vesselId || !supplyId || isNaN(boxIndex)) return;

    const vessel = game.actors.get(vesselId);
    if (!vessel || !isVessel(vessel)) return;

    const vesselData = getVesselData(vessel);
    const sharedSupplies = [...(vesselData.sharedSupplies || [])];
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

    // Update the vessel
    const currentData = vesselData;
    const newData = foundry.utils.mergeObject(currentData, { sharedSupplies }, { inplace: false });
    await vessel.setFlag(MODULE_ID, FLAGS.vessel, newData);
  }

  /**
   * Burn a vessel's shared supply track box (right-click)
   * Updates the vessel's data directly
   */
  async _onBurnVesselSupplyBox(event) {
    event.preventDefault();
    const box = event.currentTarget;
    const vesselId = box.closest(".vessel-supply-item")?.dataset.vesselId;
    const supplyId = box.closest(".vessel-supply-item")?.dataset.supplyId;
    const boxIndex = parseInt(box.dataset.box);

    if (!vesselId || !supplyId || isNaN(boxIndex)) return;

    const vessel = game.actors.get(vesselId);
    if (!vessel || !isVessel(vessel)) return;

    const vesselData = getVesselData(vessel);
    const sharedSupplies = [...(vesselData.sharedSupplies || [])];
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

    // Update the vessel
    const currentData = vesselData;
    const newData = foundry.utils.mergeObject(currentData, { sharedSupplies }, { inplace: false });
    await vessel.setFlag(MODULE_ID, FLAGS.vessel, newData);
  }
}
