# Far Field Module — TODO

## Hazards as NPCs
- Figure out how to represent Far Field hazards as NPC actors in the LANCER system
- Hazards have HP, conditions, actions, environmental triggers, zone effects, escalation

## Scene Track Widget
- Interactive progress track / project track rendered on the Foundry canvas (not HUD/sidebar)
- Linked to a hazard NPC actor so track state and actor state stay in sync
- Click to increment/decrement segments
- Best approach is Actor + Token with custom PIXI rendering via `_draw()` override
- Blocked by LANCER system rejecting custom actor sub-types from modules — likely needs a system fork

## Turn Order Tracker
- Combat tracker / turn order system tailored to Far Field's mechanics
- Details TBD

## Vessel Qualities as Journal Pages
- `vesselQuality` journal page type throws DataModelValidationError during compendium seeding
- Registration via `CONFIG.JournalEntryPage.dataModels` in init appears correct but type is rejected at creation time
- May be moot if we fork the LANCER system and can define proper document types

## LANCER System Fork (Future)
- Fork the LANCER Foundry system to support custom actor/item/document types
- Would unblock: hazard actors, track widgets, vessel qualities, and any other custom data
- Consider Battlegroup data (PC + NPC) as part of the fork scope
