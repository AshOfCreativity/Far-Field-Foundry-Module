/**
 * Far Field Character Sheet for LANCER
 * Character sheet for tracking Far Field rangers with edges, backgrounds, skills, aspects, and progression
 */

import { MODULE_ID, FLAGS, getDefaultCharacterData, importCharacterData } from "./main.mjs";
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

export class CharacterSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "character-sheet", "far-field-character"],
      template: "modules/lancer-far-field/templates/character-sheet.hbs",
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
    return "modules/lancer-far-field/templates/character-sheet.hbs";
  }

  /**
   * Get character data from flags
   */
  get characterData() {
    return this.actor.getFlag(MODULE_ID, FLAGS.character) || getDefaultCharacterData();
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

    // Editable state
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

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

    // Progression
    html.find(".progression-option").click(this._onProgressionClick.bind(this));

    // Import character
    html.find(".import-character").click(this._onImportCharacter.bind(this));
  }

  /**
   * Handle edge card click
   */
  async _onEdgeClick(event) {
    event.preventDefault();
    const edgeId = event.currentTarget.dataset.edgeId;
    const edges = [...(this.characterData.edges || [])];
    const index = edges.indexOf(edgeId);

    if (index >= 0) {
      // Remove edge
      edges.splice(index, 1);
    } else if (edges.length < 3) {
      // Add edge (max 3)
      edges.push(edgeId);
    } else {
      ui.notifications.warn("You can only select 3 edges.");
      return;
    }

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
   * Handle progression option click
   */
  async _onProgressionClick(event) {
    event.preventDefault();
    const progressionType = event.currentTarget.dataset.type;
    const option = PROGRESSION_OPTIONS.find(o => o.type === progressionType);

    if (!option) return;

    const unspentMilestones = (this.characterData.milestones || []).filter(m => !m.spent);

    if (unspentMilestones.length < option.cost) {
      ui.notifications.warn(`You need ${option.cost} unspent milestones for this advancement. You have ${unspentMilestones.length}.`);
      return;
    }

    // Show progression dialog based on type
    switch (progressionType) {
      case 'skill_rank':
        await this._showSkillRankProgression(option, unspentMilestones);
        break;
      case 'new_skill':
        await this._showNewSkillProgression(option, unspentMilestones);
        break;
      case 'aspect_box':
        await this._showAspectBoxProgression(option, unspentMilestones);
        break;
      case 'background_aspect':
      case 'any_aspect':
        await this._showNewAspectProgression(option, unspentMilestones, progressionType === 'any_aspect');
        break;
    }
  }

  /**
   * Show skill rank progression dialog
   */
  async _showSkillRankProgression(option, unspentMilestones) {
    const skills = this.characterData.skills || {};
    const upgradableSkills = FAR_FIELD_SKILLS.filter(s => (skills[s.id]?.rank || 0) < 3);

    if (upgradableSkills.length === 0) {
      ui.notifications.warn("All skills are at maximum rank.");
      return;
    }

    const skillOptions = upgradableSkills.map(s => {
      const currentRank = skills[s.id]?.rank || 0;
      return `<option value="${s.id}">${s.name} (Rank ${currentRank} → ${currentRank + 1})</option>`;
    }).join("");

    const content = `
      <form>
        <p>Select a skill to increase by 1 rank. Cost: ${option.cost} milestones.</p>
        <div class="form-group">
          <label>Skill:</label>
          <select name="skillId">${skillOptions}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: option.name,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async (html) => {
            const skillId = html.find('[name="skillId"]').val();
            await this._applyProgression('skill_rank', skillId, option.cost, unspentMilestones);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  }

  /**
   * Show new skill progression dialog
   */
  async _showNewSkillProgression(option, unspentMilestones) {
    const skills = this.characterData.skills || {};
    const newSkills = FAR_FIELD_SKILLS.filter(s => (skills[s.id]?.rank || 0) === 0);

    if (newSkills.length === 0) {
      ui.notifications.warn("You already have all skills.");
      return;
    }

    const skillOptions = newSkills.map(s =>
      `<option value="${s.id}">${s.name} - ${s.description}</option>`
    ).join("");

    const content = `
      <form>
        <p>Select a new skill to learn at Rank 1. Cost: ${option.cost} milestones.</p>
        <div class="form-group">
          <label>Skill:</label>
          <select name="skillId">${skillOptions}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: option.name,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async (html) => {
            const skillId = html.find('[name="skillId"]').val();
            await this._applyProgression('new_skill', skillId, option.cost, unspentMilestones);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  }

  /**
   * Show aspect box progression dialog
   */
  async _showAspectBoxProgression(option, unspentMilestones) {
    const aspects = this.characterData.aspects || [];

    if (aspects.length === 0) {
      ui.notifications.warn("You have no aspects to upgrade.");
      return;
    }

    const aspectOptions = aspects.map(a =>
      `<option value="${a.id}">${a.name} (Track ${a.track} → ${a.track + 1})</option>`
    ).join("");

    const content = `
      <form>
        <p>Select an aspect to add 1 box to its track. Cost: ${option.cost} milestones.</p>
        <div class="form-group">
          <label>Aspect:</label>
          <select name="aspectId">${aspectOptions}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: option.name,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async (html) => {
            const aspectId = html.find('[name="aspectId"]').val();
            await this._applyProgression('aspect_box', aspectId, option.cost, unspentMilestones);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  }

  /**
   * Show new aspect progression dialog
   */
  async _showNewAspectProgression(option, unspentMilestones, anyAspect) {
    let availableAspects;

    if (anyAspect) {
      // All aspects from all backgrounds
      availableAspects = [];
      for (const [category, backgrounds] of Object.entries(ASPECTS_BY_BACKGROUND)) {
        for (const [bgId, aspects] of Object.entries(backgrounds)) {
          const bgName = [...ORIGIN_OPTIONS, ...ROLE_OPTIONS, ...DISCIPLINE_OPTIONS].find(o => o.id === bgId)?.name || bgId;
          availableAspects.push(...aspects.map(a => ({ ...a, source: category, sourceName: bgName })));
        }
      }
    } else {
      // Only from character's backgrounds
      availableAspects = getAvailableAspects(this.characterData.backgrounds || {});
    }

    // Filter out already added aspects
    const addedAspectIds = (this.characterData.aspects || []).map(a => a.id);
    availableAspects = availableAspects.filter(a => !addedAspectIds.includes(a.id));

    if (availableAspects.length === 0) {
      ui.notifications.warn("No new aspects available.");
      return;
    }

    const aspectOptions = availableAspects.map(a =>
      `<option value="${a.id}" data-source="${a.source}" data-source-name="${a.sourceName}">${a.name} (${a.sourceName}) - ${a.type}</option>`
    ).join("");

    const content = `
      <form>
        <p>Select a new aspect to add. Cost: ${option.cost} milestones.</p>
        <div class="form-group">
          <label>Aspect:</label>
          <select name="aspectId">${aspectOptions}</select>
        </div>
      </form>
    `;

    new Dialog({
      title: option.name,
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async (html) => {
            const select = html.find('[name="aspectId"]');
            const aspectId = select.val();
            const selectedOption = select.find(':selected');
            const source = selectedOption.data('source');
            const sourceName = selectedOption.data('sourceName');

            await this._applyProgression(
              anyAspect ? 'any_aspect' : 'background_aspect',
              { aspectId, source, sourceName },
              option.cost,
              unspentMilestones
            );
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  }

  /**
   * Apply a progression and spend milestones
   */
  async _applyProgression(type, target, cost, unspentMilestones) {
    const updates = {};

    // Mark milestones as spent
    const milestones = [...this.characterData.milestones];
    const spentMilestoneIds = [];
    for (let i = 0; i < cost && i < unspentMilestones.length; i++) {
      const milestone = milestones.find(m => m.id === unspentMilestones[i].id);
      if (milestone) {
        milestone.spent = true;
        spentMilestoneIds.push(milestone.id);
      }
    }
    updates.milestones = milestones;

    // Apply the progression
    switch (type) {
      case 'skill_rank': {
        const skills = { ...this.characterData.skills };
        if (!skills[target]) skills[target] = { rank: 0, failures: [] };
        skills[target].rank = Math.min(3, (skills[target].rank || 0) + 1);
        updates.skills = skills;
        break;
      }
      case 'new_skill': {
        const skills = { ...this.characterData.skills };
        skills[target] = { rank: 1, failures: [] };
        updates.skills = skills;
        break;
      }
      case 'aspect_box': {
        const aspects = [...this.characterData.aspects];
        const aspect = aspects.find(a => a.id === target);
        if (aspect) {
          aspect.track += 1;
        }
        updates.aspects = aspects;
        break;
      }
      case 'background_aspect':
      case 'any_aspect': {
        const { aspectId, source, sourceName } = target;

        // Find the aspect definition
        let aspectDef = null;
        for (const [category, backgrounds] of Object.entries(ASPECTS_BY_BACKGROUND)) {
          for (const [bgId, aspects] of Object.entries(backgrounds)) {
            const found = aspects.find(a => a.id === aspectId);
            if (found) {
              aspectDef = found;
              break;
            }
          }
          if (aspectDef) break;
        }

        if (aspectDef) {
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
          updates.aspects = aspects;
        }
        break;
      }
    }

    // Add to progression log
    const progressionLog = [...(this.characterData.progressionLog || [])];
    progressionLog.push({
      type,
      target: typeof target === 'object' ? target.aspectId : target,
      cost,
      milestones: spentMilestoneIds,
      appliedAt: new Date().toISOString()
    });
    updates.progressionLog = progressionLog;

    await this.updateCharacterData(updates);
    ui.notifications.info("Progression applied!");
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
}
