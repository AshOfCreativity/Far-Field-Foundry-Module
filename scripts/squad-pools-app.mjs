/**
 * Squad Pools App
 *
 * Standalone Application window for shared milestone-purchase pools used by
 * Far Field characters. Mirrors the Manna pool module's storage pattern:
 * world-scope setting holds the array; non-GM clients route saves through a
 * GM via socket. Two-stage flow: contributors pay milestones until funded,
 * then each squad member individually claims by picking a target on their
 * own character sheet (which mutates their own actor).
 */

import { MODULE_ID, FLAGS } from "./constants.mjs";
import { isCharacter, getCharacterData, updateCharacterData } from "./main.mjs";
import {
  PROGRESSION_OPTIONS,
  FAR_FIELD_SKILLS,
  ASPECTS_BY_BACKGROUND,
  ORIGIN_OPTIONS,
  ROLE_OPTIONS,
  DISCIPLINE_OPTIONS,
  getAvailableAspects
} from "./character-data.mjs";

const SETTINGS = { pools: "squadPools" };
const SOCKET = `module.${MODULE_ID}`;

/** Register the world-scope setting that stores all pools. */
export function registerSquadPoolSettings() {
  game.settings.register(MODULE_ID, SETTINGS.pools, {
    name: "Squad Pools",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
}

export function getPools() {
  return game.settings.get(MODULE_ID, SETTINGS.pools) || [];
}

/**
 * Persist the pools array. GMs write directly; non-GMs route via socket so
 * any active GM client applies the world-scope write. Returns a promise that
 * resolves once saved (or rejects after timeout).
 */
async function savePools(pools) {
  if (game.user.isGM) {
    await game.settings.set(MODULE_ID, SETTINGS.pools, pools);
    game.socket.emit(SOCKET, { type: "poolsUpdated" });
    if (squadPoolsApp?.rendered) squadPoolsApp.render(false);
    return;
  }
  return new Promise((resolve, reject) => {
    const requestId = foundry.utils.randomID();
    const timeout = setTimeout(() => {
      game.socket.off(SOCKET, handler);
      reject(new Error("GM did not respond to save request"));
      ui.notifications.warn("No GM available to save squad pool change.");
    }, 5000);
    const handler = (data) => {
      if (data.type === "saveAck" && data.requestId === requestId) {
        clearTimeout(timeout);
        game.socket.off(SOCKET, handler);
        resolve();
      }
    };
    game.socket.on(SOCKET, handler);
    game.socket.emit(SOCKET, { type: "saveRequest", requestId, pools });
  });
}

/** Wire up the GM-side socket handler and the all-clients re-render listener. */
export function registerSquadPoolSocket() {
  game.socket.on(SOCKET, async (data) => {
    if (data.type === "saveRequest" && game.user.isGM) {
      try {
        await game.settings.set(MODULE_ID, SETTINGS.pools, data.pools);
        game.socket.emit(SOCKET, { type: "saveAck", requestId: data.requestId });
        game.socket.emit(SOCKET, { type: "poolsUpdated" });
        if (squadPoolsApp?.rendered) squadPoolsApp.render(false);
      } catch (err) {
        console.error(`${MODULE_ID} | save pools failed`, err);
      }
      return;
    }
    if (data.type === "poolsUpdated" && squadPoolsApp?.rendered) {
      squadPoolsApp.render(false);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Pool lifecycle helpers — all funnel through savePools.            */
/* ------------------------------------------------------------------ */

async function createPool({ type, initiatorActorId, squadMemberIds }) {
  const pools = getPools();
  pools.push({
    id: foundry.utils.randomID(),
    type,
    initiatorActorId,
    squadMembers: squadMemberIds,
    contributions: {},
    claims: {},
    cancelled: false,
    createdAt: new Date().toISOString()
  });
  await savePools(pools);
}

async function addContribution(poolId, actorId, milestoneIds) {
  const pools = getPools().map(p => {
    if (p.id !== poolId) return p;
    const prior = p.contributions?.[actorId] || { milestoneIds: [] };
    return {
      ...p,
      contributions: {
        ...(p.contributions || {}),
        [actorId]: {
          milestoneIds: [...prior.milestoneIds, ...milestoneIds],
          lastContributedAt: new Date().toISOString()
        }
      }
    };
  });
  await savePools(pools);
}

async function recordClaim(poolId, actorId, claim) {
  const pools = getPools().map(p => p.id === poolId
    ? { ...p, claims: { ...(p.claims || {}), [actorId]: claim } }
    : p
  );
  await savePools(pools);
}

async function setPoolCancelled(poolId) {
  const pools = getPools().map(p => p.id === poolId
    ? { ...p, cancelled: true, cancelledAt: new Date().toISOString() }
    : p
  );
  await savePools(pools);
}

async function dismissPool(poolId) {
  const pools = getPools().filter(p => p.id !== poolId);
  await savePools(pools);
}

/* ------------------------------------------------------------------ */
/*  Apply a claim's chosen target onto the claiming actor's sheet.    */
/*  This runs on the claiming player's own client; they own the actor.*/
/* ------------------------------------------------------------------ */

function applyTargetToCharacter(actor, type, target) {
  const data = getCharacterData(actor);
  if (!data) return null;
  const updates = {};

  switch (type) {
    case 'skill_rank': {
      const skills = { ...(data.skills || {}) };
      if (!skills[target]) skills[target] = { rank: 0, failures: [] };
      skills[target].rank = Math.min(3, (skills[target].rank || 0) + 1);
      updates.skills = skills;
      break;
    }
    case 'new_skill': {
      const skills = { ...(data.skills || {}) };
      skills[target] = { rank: 1, failures: [] };
      updates.skills = skills;
      break;
    }
    case 'aspect_box': {
      const aspects = [...(data.aspects || [])];
      const aspect = aspects.find(a => a.id === target);
      if (aspect) aspect.track += 1;
      updates.aspects = aspects;
      break;
    }
    case 'background_aspect':
    case 'any_aspect': {
      const { aspectId, source, sourceName } = target;
      let aspectDef = null;
      for (const [, backgrounds] of Object.entries(ASPECTS_BY_BACKGROUND)) {
        for (const [, aspects] of Object.entries(backgrounds)) {
          const found = aspects.find(a => a.id === aspectId);
          if (found) { aspectDef = found; break; }
        }
        if (aspectDef) break;
      }
      if (aspectDef) {
        const aspects = [...(data.aspects || [])];
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
  return updates;
}

/* ------------------------------------------------------------------ */
/*  The Application class                                             */
/* ------------------------------------------------------------------ */

// Extend a placeholder at import time; the real Application base is bound during
// `init` (see reparentFarFieldSheetBases() in main.mjs). Referencing the base at
// import time can throw "class extends undefined" and abort the module.
class _FarFieldAppBase {}

export class SquadPoolsApp extends _FarFieldAppBase {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "lancer-far-field-squad-pools",
      title: "Far Field Squad Pools",
      template: `modules/${MODULE_ID}/templates/squad-pools-app.hbs`,
      classes: ["lancer", "squad-pools-app"],
      width: 620,
      height: 700,
      resizable: true
    });
  }

  async getData() {
    const pools = getPools();
    const optionsByType = Object.fromEntries(PROGRESSION_OPTIONS.map(o => [o.type, o]));

    const enriched = pools.map(p => {
      const option = optionsByType[p.type] || { name: p.type, perPlayerCost: 0 };
      const contributions = p.contributions || {};
      const claims = p.claims || {};
      const totalContributed = Object.values(contributions)
        .reduce((s, c) => s + (c.milestoneIds?.length || 0), 0);
      const totalCost = option.perPlayerCost * p.squadMembers.length;

      const members = p.squadMembers.map(actorId => {
        const actor = game.actors.get(actorId);
        const claim = claims[actorId] || null;
        const isOwner = !!actor?.isOwner;
        return {
          actorId,
          name: actor?.name || "Unknown",
          isOwner,
          contributed: contributions[actorId]?.milestoneIds?.length || 0,
          claim,
          canClaim: isOwner && !claim && !p.cancelled && totalContributed >= totalCost
        };
      });

      const allClaimed = members.length > 0 && members.every(m => m.claim);
      let status;
      if (p.cancelled) status = "cancelled";
      else if (totalContributed < totalCost) status = "funding";
      else if (allClaimed) status = "completed";
      else status = "available";

      const initiator = game.actors.get(p.initiatorActorId);
      const initiatorIsOwner = !!initiator?.isOwner;
      const anyMineCanContribute = members.some(m =>
        m.isOwner && hasUnspentMilestones(m.actorId) && totalContributed < totalCost
      );

      return {
        ...p,
        optionName: option.name,
        perPlayerCost: option.perPlayerCost,
        totalCost,
        totalContributed,
        progressPercent: totalCost > 0 ? Math.min(100, Math.round(totalContributed / totalCost * 100)) : 0,
        members,
        initiatorName: initiator?.name || "Unknown",
        status,
        canContribute: status === "funding" && anyMineCanContribute,
        canCancel: (initiatorIsOwner || game.user.isGM) && !p.cancelled && !allClaimed,
        canDismiss: (initiatorIsOwner || game.user.isGM) && (p.cancelled || allClaimed)
      };
    });

    return {
      pools: enriched,
      progressionOptions: PROGRESSION_OPTIONS,
      isGM: game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".sp-create-pool").click(this._onCreatePool.bind(this));
    html.find(".sp-pool-contribute").click(this._onContribute.bind(this));
    html.find(".sp-pool-claim").click(this._onClaim.bind(this));
    html.find(".sp-pool-cancel").click(this._onCancel.bind(this));
    html.find(".sp-pool-dismiss").click(this._onDismiss.bind(this));
  }

  /* ------------- handlers ------------- */

  async _onCreatePool(event) {
    event.preventDefault();
    const characters = game.actors.filter(a => isCharacter(a));
    if (characters.length === 0) {
      ui.notifications.warn("No Far Field characters exist yet.");
      return;
    }
    const myCharacters = characters.filter(a => a.isOwner);
    if (myCharacters.length === 0) {
      ui.notifications.warn("You don't own any Far Field character to initiate a pool.");
      return;
    }

    const typeOpts = PROGRESSION_OPTIONS.map(o =>
      `<option value="${o.type}">${o.name} (${o.perPlayerCost}/player)</option>`
    ).join("");
    const initiatorOpts = myCharacters.map(a =>
      `<option value="${a.id}">${a.name}</option>`
    ).join("");
    const memberChecks = characters.map(a =>
      `<label class="sp-check"><input type="checkbox" name="squad" value="${a.id}"/><span>${a.name}</span></label>`
    ).join("");

    new Dialog({
      title: "Create Squad Pool",
      content: `
        <form class="sp-form">
          <div class="form-group">
            <label>Advancement:</label>
            <select name="type">${typeOpts}</select>
          </div>
          <div class="form-group">
            <label>Initiator (your character):</label>
            <select name="initiator">${initiatorOpts}</select>
          </div>
          <fieldset>
            <legend>Squad members</legend>
            ${memberChecks}
            <p class="notes">Initiator is added automatically.</p>
          </fieldset>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Create",
          callback: async (html) => {
            const type = html.find('[name="type"]').val();
            const initiatorActorId = html.find('[name="initiator"]').val();
            const squad = new Set([initiatorActorId]);
            html.find('[name="squad"]:checked').each(function() { squad.add(this.value); });
            if (squad.size === 0) {
              ui.notifications.warn("Squad must have at least one member.");
              return;
            }
            await createPool({ type, initiatorActorId, squadMemberIds: Array.from(squad) });
            const opt = PROGRESSION_OPTIONS.find(o => o.type === type);
            ui.notifications.info(`Opened pool: ${opt?.name} for ${squad.size} member(s).`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "create"
    }).render(true);
  }

  async _onContribute(event) {
    event.preventDefault();
    const poolId = event.currentTarget.dataset.poolId;
    const pool = getPools().find(p => p.id === poolId);
    if (!pool || pool.cancelled) return;
    const option = PROGRESSION_OPTIONS.find(o => o.type === pool.type);
    const totalCost = option.perPlayerCost * pool.squadMembers.length;
    const totalContributed = Object.values(pool.contributions || {})
      .reduce((s, c) => s + (c.milestoneIds?.length || 0), 0);
    const remaining = totalCost - totalContributed;
    if (remaining <= 0) { ui.notifications.info("Pool is fully funded."); return; }

    // Which of my owned characters in the squad can contribute?
    const myContributors = pool.squadMembers
      .map(id => game.actors.get(id))
      .filter(a => a?.isOwner && (getCharacterData(a)?.milestones || []).some(m => !m.spent));
    if (myContributors.length === 0) {
      ui.notifications.warn("None of your characters in this pool have unspent milestones.");
      return;
    }

    // Step 1: choose which of your characters
    const pickChar = myContributors.length === 1
      ? Promise.resolve(myContributors[0])
      : new Promise(resolve => {
          const opts = myContributors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
          new Dialog({
            title: "Contribute from which character?",
            content: `<form class="sp-form"><div class="form-group"><label>Character:</label><select name="actor">${opts}</select></div></form>`,
            buttons: {
              ok: {
                label: "Next",
                callback: html => resolve(game.actors.get(html.find('[name="actor"]').val()))
              },
              cancel: { label: "Cancel", callback: () => resolve(null) }
            },
            default: "ok"
          }).render(true);
        });

    const actor = await pickChar;
    if (!actor) return;

    // Step 2: pick milestones
    const data = getCharacterData(actor);
    const unspent = (data.milestones || []).filter(m => !m.spent);
    const max = Math.min(remaining, unspent.length);
    const items = unspent.map(m => {
      const note = (m.note || "(no note)").replace(/"/g, "&quot;");
      const short = note.length > 60 ? note.slice(0, 60) + "…" : note;
      return `<label class="sp-check"><input type="checkbox" name="milestone" value="${m.id}"/><span>${short}</span></label>`;
    }).join("");

    new Dialog({
      title: `Contribute from ${actor.name}`,
      content: `
        <form class="sp-form">
          <p>Pool needs <strong>${remaining}</strong> more. Pick up to <strong>${max}</strong>.</p>
          <div class="sp-milestone-list">${items}</div>
        </form>
      `,
      buttons: {
        contribute: {
          icon: '<i class="fas fa-check"></i>',
          label: "Contribute",
          callback: async (html) => {
            const chosen = [];
            html.find('[name="milestone"]:checked').each(function() { chosen.push(this.value); });
            if (chosen.length === 0) return;
            if (chosen.length > max) {
              ui.notifications.warn(`Cannot contribute more than ${max}.`);
              return;
            }
            // Mark milestones spent on the contributor's own actor
            const newMilestones = (data.milestones || []).map(m =>
              chosen.includes(m.id) ? { ...m, spent: true, spentOn: "Squad pool contribution" } : m
            );
            await updateCharacterData(actor, { milestones: newMilestones });
            // Record on the pool
            await addContribution(poolId, actor.id, chosen);
            ui.notifications.info(`Contributed ${chosen.length} from ${actor.name}.`);
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "contribute"
    }).render(true);
  }

  async _onClaim(event) {
    event.preventDefault();
    const poolId = event.currentTarget.dataset.poolId;
    const actorId = event.currentTarget.dataset.actorId;
    const pool = getPools().find(p => p.id === poolId);
    if (!pool || pool.cancelled) return;
    if (pool.claims?.[actorId]) {
      ui.notifications.info("Already claimed.");
      return;
    }
    const actor = game.actors.get(actorId);
    if (!actor?.isOwner) {
      ui.notifications.warn(`You don't own ${actor?.name || "this character"}.`);
      return;
    }

    // Open the type-appropriate target picker
    switch (pool.type) {
      case 'skill_rank':
        return showSkillRankClaim(pool, actor);
      case 'new_skill':
        return showNewSkillClaim(pool, actor);
      case 'aspect_box':
        return showAspectBoxClaim(pool, actor);
      case 'background_aspect':
      case 'any_aspect':
        return showAspectClaim(pool, actor, pool.type === 'any_aspect');
    }
  }

  async _onCancel(event) {
    event.preventDefault();
    const poolId = event.currentTarget.dataset.poolId;
    const confirmed = await Dialog.confirm({
      title: "Cancel Pool",
      content: "<p>Mark this pool cancelled? Contributed milestones won't be auto-refunded.</p>",
      defaultYes: false
    });
    if (!confirmed) return;
    await setPoolCancelled(poolId);
    ui.notifications.info("Pool cancelled.");
  }

  async _onDismiss(event) {
    event.preventDefault();
    const poolId = event.currentTarget.dataset.poolId;
    const confirmed = await Dialog.confirm({
      title: "Dismiss Pool",
      content: "<p>Remove this pool from the list?</p>",
      defaultYes: true
    });
    if (!confirmed) return;
    await dismissPool(poolId);
  }
}

/* ------------------------------------------------------------------ */
/*  Per-type claim dialogs                                            */
/* ------------------------------------------------------------------ */

function hasUnspentMilestones(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) return false;
  const data = getCharacterData(actor);
  return (data?.milestones || []).some(m => !m.spent);
}

async function finalizeClaim(pool, actor, type, target, targetName) {
  const updates = applyTargetToCharacter(actor, type, target);
  if (!updates) {
    ui.notifications.error(`Could not read character data for ${actor.name}.`);
    return;
  }
  // Append to that character's progression log
  const data = getCharacterData(actor);
  updates.progressionLog = [
    ...(data.progressionLog || []),
    {
      type,
      target: typeof target === 'object' ? target.aspectId : target,
      targetName,
      poolId: pool.id,
      appliedAt: new Date().toISOString()
    }
  ];
  await updateCharacterData(actor, updates);
  // Record claim on the pool
  await recordClaim(pool.id, actor.id, {
    target: typeof target === 'object' ? target.aspectId : target,
    targetName,
    claimedAt: new Date().toISOString()
  });
  ui.notifications.info(`${actor.name} claimed: ${targetName}`);
}

function showSkillRankClaim(pool, actor) {
  const data = getCharacterData(actor);
  const skills = data?.skills || {};
  const upgradable = FAR_FIELD_SKILLS.filter(s => (skills[s.id]?.rank || 0) < 3);
  if (upgradable.length === 0) {
    ui.notifications.warn(`${actor.name} has no skills below max rank.`);
    return;
  }
  const opts = upgradable.map(s => {
    const r = skills[s.id]?.rank || 0;
    return `<option value="${s.id}">${s.name} (${r} → ${r + 1})</option>`;
  }).join("");
  new Dialog({
    title: `${actor.name}: +1 Skill Rank`,
    content: `<form class="sp-form"><div class="form-group"><label>Skill:</label><select name="skillId">${opts}</select></div></form>`,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: "Claim",
        callback: async (html) => {
          const id = html.find('[name="skillId"]').val();
          const sk = FAR_FIELD_SKILLS.find(s => s.id === id);
          await finalizeClaim(pool, actor, 'skill_rank', id, sk?.name || id);
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
    },
    default: "ok"
  }).render(true);
}

function showNewSkillClaim(pool, actor) {
  const data = getCharacterData(actor);
  const skills = data?.skills || {};
  const newSkills = FAR_FIELD_SKILLS.filter(s => (skills[s.id]?.rank || 0) === 0);
  if (newSkills.length === 0) {
    ui.notifications.warn(`${actor.name} already has every skill.`);
    return;
  }
  const opts = newSkills.map(s =>
    `<option value="${s.id}">${s.name} — ${s.description}</option>`
  ).join("");
  new Dialog({
    title: `${actor.name}: New Skill`,
    content: `<form class="sp-form"><div class="form-group"><label>Skill:</label><select name="skillId">${opts}</select></div></form>`,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: "Claim",
        callback: async (html) => {
          const id = html.find('[name="skillId"]').val();
          const sk = FAR_FIELD_SKILLS.find(s => s.id === id);
          await finalizeClaim(pool, actor, 'new_skill', id, sk?.name || id);
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
    },
    default: "ok"
  }).render(true);
}

function showAspectBoxClaim(pool, actor) {
  const data = getCharacterData(actor);
  const aspects = data?.aspects || [];
  if (aspects.length === 0) {
    ui.notifications.warn(`${actor.name} has no aspects.`);
    return;
  }
  const opts = aspects.map(a =>
    `<option value="${a.id}">${a.name} (Track ${a.track} → ${a.track + 1})</option>`
  ).join("");
  new Dialog({
    title: `${actor.name}: +1 Aspect Box`,
    content: `<form class="sp-form"><div class="form-group"><label>Aspect:</label><select name="aspectId">${opts}</select></div></form>`,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: "Claim",
        callback: async (html) => {
          const id = html.find('[name="aspectId"]').val();
          const a = aspects.find(x => x.id === id);
          await finalizeClaim(pool, actor, 'aspect_box', id, a?.name || id);
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
    },
    default: "ok"
  }).render(true);
}

function showAspectClaim(pool, actor, anyAspect) {
  const data = getCharacterData(actor);
  let available;
  if (anyAspect) {
    available = [];
    for (const [category, backgrounds] of Object.entries(ASPECTS_BY_BACKGROUND)) {
      for (const [bgId, aspects] of Object.entries(backgrounds)) {
        const bgName = [...ORIGIN_OPTIONS, ...ROLE_OPTIONS, ...DISCIPLINE_OPTIONS].find(o => o.id === bgId)?.name || bgId;
        available.push(...aspects.map(a => ({ ...a, source: category, sourceName: bgName })));
      }
    }
  } else {
    available = getAvailableAspects(data?.backgrounds || {});
  }
  const added = (data?.aspects || []).map(a => a.id);
  available = available.filter(a => !added.includes(a.id));
  if (available.length === 0) {
    ui.notifications.warn(`No new aspects available for ${actor.name}.`);
    return;
  }
  const opts = available.map(a =>
    `<option value="${a.id}" data-source="${a.source}" data-source-name="${a.sourceName}">${a.name} (${a.sourceName}) — ${a.type}</option>`
  ).join("");
  new Dialog({
    title: `${actor.name}: ${anyAspect ? "Any Aspect" : "Background Aspect"}`,
    content: `<form class="sp-form"><div class="form-group"><label>Aspect:</label><select name="aspectId">${opts}</select></div></form>`,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: "Claim",
        callback: async (html) => {
          const sel = html.find('[name="aspectId"]');
          const aspectId = sel.val();
          const opt = sel.find(':selected');
          const source = opt.data('source');
          const sourceName = opt.data('sourceName');
          const a = available.find(x => x.id === aspectId);
          await finalizeClaim(
            pool, actor,
            anyAspect ? 'any_aspect' : 'background_aspect',
            { aspectId, source, sourceName },
            a?.name || aspectId
          );
        }
      },
      cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
    },
    default: "ok"
  }).render(true);
}

/* ------------------------------------------------------------------ */
/*  Singleton open                                                    */
/* ------------------------------------------------------------------ */

let squadPoolsApp = null;
export function openSquadPools() {
  if (!squadPoolsApp) squadPoolsApp = new SquadPoolsApp();
  squadPoolsApp.render(true);
}
