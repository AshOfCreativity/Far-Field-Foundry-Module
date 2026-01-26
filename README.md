# LANCER Vessel/Party Sheet

A Foundry VTT v12 module that adds a **Vessel** sheet to the LANCER system, similar to the PF2e Party Sheet.

## How It Works

Since Foundry doesn't allow modules to add new actor types to existing game systems, this module uses **deployable actors** with a custom sheet and stores vessel data in actor flags. When you create a vessel, it creates a deployable actor with the vessel sheet applied.

## Features

- **"New Vessel" Button** - Creates vessel actors directly from the Actors sidebar
- **Ranger-Class Ship Support** - Built for Far Field campaign vessels
- **Vessel Qualities** - Select 2-3 qualities from the 15 Far Field options:
  - Optimized Nearlight Drive
  - Metafold Containment Facility
  - Tesseract Artificial Gravity Array
  - Custom Survival Gear
  - Extended Fabrication Bays
  - Research Laboratories
  - Mech Hangar
  - High Resolution Suite
  - Blinkfield Cartography Suite
  - Subsurface Suite
  - Expanded Crew Quarters
  - Specialized Medbay
  - Recreation Facilities
  - Upgraded Armament
  - Security Team

- **Crew Roster** - Add crew members with:
  - Name and role
  - Link to Pilot actors
  - Personal notes
  - Drag-and-drop pilot addition

- **Status Tracking**:
  - Hull Integrity (6-box track)
  - Supplies (4-box track)
  - Systems Status (Operational/Damaged/Critical/Offline)
  - Status notes

- **Shared Supplies** - Track party resources with mark/burn box mechanics

- **Mission Log** - Track campaign events with timestamped entries

## Installation

### Manual Installation (Forge VTT)

1. Download or zip the `lancer-vessel-sheet` folder
2. Upload to your Forge VTT `Data/modules/` directory via the File Manager
3. Launch your LANCER world
4. Go to **Settings** > **Manage Modules**
5. Enable "LANCER Vessel/Party Sheet"

### Manual Installation (Local)

1. Copy the `lancer-vessel-sheet` folder to your Foundry `Data/modules/` directory:
   - **Windows**: `%localappdata%/FoundryVTT/Data/modules/`
   - **macOS**: `~/Library/Application Support/FoundryVTT/Data/modules/`
   - **Linux**: `~/.local/share/FoundryVTT/Data/modules/`
2. Restart Foundry VTT
3. Enable the module in your LANCER world

## Usage

### Creating a Vessel

1. Open the **Actors** sidebar
2. Click the **"New Vessel"** button (rocket icon)
3. Enter a name for your vessel
4. The vessel sheet will open automatically

### Alternative: Via Macro

You can also create vessels via macro or console:
```javascript
game.modules.get("lancer-vessel-sheet").createVessel("My Ship Name");
```

### Switching an Existing Deployable to Vessel Sheet

If you have an existing deployable you want to convert:
1. Right-click the actor in the sidebar
2. Select "Configure Sheet"
3. Choose "Ranger Vessel Sheet"

Note: The vessel data won't exist until you create it via the normal flow.

### Configuring Your Vessel

1. **Overview Tab**: See ship status at a glance, set description
2. **Qualities Tab**: Add 2-3 vessel qualities that define your ship's capabilities
3. **Crew Tab**: Add crew members or drag Pilot actors to link them
4. **Status Tab**: Track hull damage, supplies, and systems status
5. **Cargo Tab**: Create and track shared party supplies with mark/burn mechanics
6. **Log Tab**: Record mission events

### Linking Pilots

- Drag a Pilot actor onto the Crew tab to add them as crew
- Or use the dropdown to link existing pilots
- Click the link icon to open the pilot's character sheet

## Compatibility

- **Foundry VTT**: v12
- **LANCER System**: v2.0.0+

## Credits

- Vessel qualities from **Far Field** supplement by Massif Press
- Built for use with the [LANCER system for Foundry VTT](https://github.com/Eranziel/foundryvtt-lancer)

## License

This module is unofficial fan content for LANCER by Massif Press.
