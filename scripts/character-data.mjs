/**
 * Far Field Character Data Definitions
 * Skills, Edges, Backgrounds, and Aspects for Far Field characters
 */

// Far Field Skills (14 total)
export const FAR_FIELD_SKILLS = [
  { id: 'assault', name: 'Assault', description: 'shoot, brawl, use tactics' },
  { id: 'endure', name: 'Endure', description: 'lift and carry, endure pain, test your stamina' },
  { id: 'control', name: 'Control', description: 'balance, hold your nerve, take charge' },
  { id: 'observe', name: 'Observe', description: 'watch, notice, catch details' },
  { id: 'conceal', name: 'Conceal', description: 'camouflage, hide, lie' },
  { id: 'tend', name: 'Tend', description: 'treat, heal, nurture' },
  { id: 'hack', name: 'Hack', description: 'access, code, repurpose' },
  { id: 'fix', name: 'Fix', description: 'create, repair, break' },
  { id: 'pilot', name: 'Pilot', description: 'use vehicles, ships, or mechs' },
  { id: 'navigate', name: 'Navigate', description: 'wayfind, orient, plan a journey' },
  { id: 'investigate', name: 'Investigate', description: 'appraise, study, research' },
  { id: 'organize', name: 'Organize', description: 'plan, order, catalog' },
  { id: 'interpret', name: 'Interpret', description: 'understand, read a situation, communicate' },
  { id: 'sway', name: 'Sway', description: 'charm, convince, bargain' }
];

// Far Field Edges (7 total, select 3)
export const FAR_FIELD_EDGES = [
  { id: 'steel', name: 'Steel', description: 'strength, resilience, power' },
  { id: 'sleight', name: 'Sleight', description: 'deception, stealth, secrets' },
  { id: 'guts', name: 'Guts', description: 'instinct, tenacity, courage' },
  { id: 'keen', name: 'Keen', description: 'precision, logic, coldness' },
  { id: 'vision', name: 'Vision', description: 'planning, foresight, focus' },
  { id: 'flash', name: 'Flash', description: 'charisma, impressiveness, audacity' },
  { id: 'heart', name: 'Heart', description: 'empathy, warmth, insight' }
];

// Origin Options (7 total)
export const ORIGIN_OPTIONS = [
  { id: 'scientist', name: 'Scientist', description: 'A researcher, academic, or specialist driven by curiosity and the pursuit of knowledge.' },
  { id: 'military', name: 'Military', description: 'A veteran of armed conflict, trained in discipline, combat, and tactical thinking.' },
  { id: 'worker', name: 'Worker', description: 'Someone who built their life through labor, skilled trades, or community service.' },
  { id: 'cosmopolitan', name: 'Cosmopolitan', description: 'A spacer born and raised among the stars, at home in the void between worlds.' },
  { id: 'diasporan', name: 'Diasporan', description: 'A traveler from the far edges of known space, bringing unique perspectives and determination.' },
  { id: 'non_union', name: 'Non-Union', description: 'Someone from beyond Union space, with different customs, technology, or worldviews.' },
  { id: 'nhp', name: 'NHP', description: 'A Non-Human Person - an artificial intelligence with human-equivalent consciousness.' }
];

// Role Options (7 total)
export const ROLE_OPTIONS = [
  { id: 'leader', name: 'Leader', description: 'Coordinates the team, makes tactical decisions, and keeps everyone working together.' },
  { id: 'surveyor', name: 'Surveyor', description: 'Scouts ahead, gathers intelligence, and maps unknown territory.' },
  { id: 'engineer', name: 'Engineer', description: 'Builds, repairs, and maintains equipment and systems in the field.' },
  { id: 'medic', name: 'Medic', description: 'Treats injuries, manages health crises, and keeps the team alive.' },
  { id: 'survivalist', name: 'Survivalist', description: 'Expert in harsh environments, resource management, and staying alive.' },
  { id: 'sysop', name: 'Sysop', description: 'Specializes in digital systems, hacking, communications, and electronic warfare.' },
  { id: 'security', name: 'Security', description: 'Provides protection, handles threats, and manages combat situations.' }
];

// Discipline Options (14 total)
export const DISCIPLINE_OPTIONS = [
  { id: 'anthropology', name: 'Anthropology', description: 'The study of human cultures, societies, and their development.' },
  { id: 'astronomy', name: 'Astronomy', description: 'The study of celestial objects, space, and the physical universe.' },
  { id: 'biology', name: 'Biology', description: 'The study of living organisms and life processes.' },
  { id: 'cartography', name: 'Cartography', description: 'The science of making maps and understanding spatial relationships.' },
  { id: 'chemistry', name: 'Chemistry', description: 'The study of matter, its properties, and how substances interact.' },
  { id: 'computing', name: 'Computing', description: 'The theory and practice of computer systems and software.' },
  { id: 'history', name: 'History', description: 'The study of past events and their significance.' },
  { id: 'linguistics', name: 'Linguistics', description: 'The scientific study of language and its structure.' },
  { id: 'medicine', name: 'Medicine', description: 'The science and practice of diagnosing, treating, and preventing disease.' },
  { id: 'ontologistics', name: 'Ontologistics', description: 'The study of paracausal phenomena and NHP consciousness.' },
  { id: 'physical_geography', name: 'Physical Geography', description: 'The study of natural features and processes of the Earth and other worlds.' },
  { id: 'psychology', name: 'Psychology', description: 'The study of mind and behavior.' },
  { id: 'narration', name: 'Narration', description: 'The art of storytelling, documentation, and cultural preservation.' },
  { id: 'theology', name: 'Theology', description: 'The study of religious beliefs, practices, and experiences.' }
];

// Aspects organized by background type
export const ASPECTS_BY_BACKGROUND = {
  origins: {
    scientist: [
      { id: 'curious', name: 'Curious', type: 'Expertise', track: 4, description: 'Your fearless curiosity drives you into the unknown. When you investigate something entirely new for the first time, reduce the severity of any Consequences you incur by one step.' },
      { id: 'meticulous', name: 'Meticulous', type: 'Expertise', track: 3, description: 'Your memory and attention to detail is exceptional. You can always recall specific details about anything you have seen during the current Mission.' },
      { id: 'data_driven', name: 'Data-Driven', type: 'Expertise', track: 3, description: 'You are an expert at collecting and processing data. Whenever you create a Scientific Data Resource, it gains one additional box on its track.' },
      { id: 'creative_solutions', name: 'Creative Solutions', type: 'Expertise', track: 5, description: 'When confronted with a problem you cannot solve, burn a box on this Aspect to ask the GM for a clue or hint on how to proceed, gaining +1 die on all Rolls following that information.' },
      { id: 'worlds_renowned', name: 'Worlds-Renowned', type: 'Expertise', track: 4, description: 'You are famous in your field. You may mark a box on this Aspect to leverage your fame into a favor from a fellow scientist.' }
    ],
    military: [
      { id: 'supersoldier', name: 'Supersoldier', type: 'Expertise', track: 4, description: 'You were genetically engineered or cybernetically enhanced to maximize your combat potential. You have exceptional strength, stamina, and athletic ability.' },
      { id: 'discipline', name: 'Discipline', type: 'Expertise', track: 5, description: 'You are able to keep your cool even in the most stressful circumstances. You may mark this Aspect to ignore the choices presented in a Snap Decision and act as normal.' },
      { id: 'true_grit', name: 'True Grit', type: 'Expertise', track: 4, description: 'Your fortitude is legendary. When you would be removed from a Scene due to a Burden, you may mark this Aspect to remain in the Scene.' },
      { id: 'skincrawl', name: 'Skincrawl', type: 'Expertise', track: 5, description: 'You are always on your guard. You get a physical reaction when you or another PC is in danger.' },
      { id: 'commanding_presence', name: 'Commanding Presence', type: 'Expertise', track: 3, description: 'You may mark this Aspect to issue a forceful command to an NPC, which they will reflexively follow unless they have a good reason not to.' }
    ],
    worker: [
      { id: 'we_all_lift_together', name: 'We All Lift Together', type: 'Expertise', track: 5, description: 'When another PC makes a Roll, you may mark this Aspect and describe how you help them to grant +1 die. Burn instead to grant +2 dice.' },
      { id: 'tough_as_nails', name: 'Tough As Nails', type: 'Expertise', track: 3, description: 'If you would mark the final box on an Aspect, you may burn an already-marked box on that Aspect instead.' },
      { id: 'careerist', name: 'Careerist', type: 'Expertise', track: 4, description: 'When you invoke this Aspect and the Roll would create a Twist, that Twist is always positive.' },
      { id: 'vox_populi', name: 'Vox Populi', type: 'Expertise', track: 5, description: 'You have a natural affinity for people that transcends cultural or language barriers.' },
      { id: 'jack_of_all_trades', name: 'Jack Of All Trades', type: 'Expertise', track: 3, description: 'You may mark this Aspect to treat any Skill as Trained (Rank I) for the rest of the Scene.' }
    ],
    cosmopolitan: [
      { id: 'spacers_ear', name: "Spacer's Ear", type: 'Expertise', track: 4, description: 'You have a pinpoint sense of direction and orientation, adapt quickly to variations in gravity, and are excellent at judging distances.' },
      { id: 'duct_tape_and_prayer', name: 'Duct Tape And Prayer', type: 'Expertise', track: 3, description: 'When you Rest, you may choose a piece of Equipment. Clear two marked boxes, then burn any marked or unmarked box. Repairing this way does not require a Roll.' },
      { id: 'ageless', name: 'Ageless', type: 'Expertise', track: 5, description: 'You are incredibly old by Cosmopolitan standards. You are familiar with ancient history and technology from personal experience.' },
      { id: 'steel_vigil', name: 'Steel Vigil', type: 'Expertise', track: 3, description: 'Whenever something mechanical or structural would break in your vicinity, you may mark this Aspect to act first.' },
      { id: 'whispers_of_a_thousand_ports', name: 'Whispers Of A Thousand Ports', type: 'Expertise', track: 4, description: 'Mark this Aspect to name a location, object, or person you have encountered this Mission; the GM tells you what rumors you have heard about it.' }
    ],
    diasporan: [
      { id: 'loyal_companion', name: 'Loyal Companion', type: 'Expertise', track: 5, description: 'A creature accompanies you as you explore. They are loyal to you and will go to great lengths to protect you.' },
      { id: 'childs_play', name: "Child's Play", type: 'Expertise', track: 2, description: 'When you come across a Hazard, if you can describe a similar challenge you faced on your homeworld, mark this Aspect to add +1 die on any Roll to overcome a similar Hazard for the rest of the Mission.' },
      { id: 'improviser', name: 'Improviser', type: 'Expertise', track: 5, description: 'Mark this Aspect to allow you or another PC to apply a Resource to a Roll that would not ordinarily be relevant.' },
      { id: 'fortunes_favored', name: "Fortune's Favored", type: 'Expertise', track: 3, description: 'When you would incur Consequences while acting boldly, you may mark this Aspect to defer them until the end of the Scene.' },
      { id: 'horizon_walker', name: 'Horizon Walker', type: 'Expertise', track: 2, description: 'When you encounter something entirely new for the first time, clear a marked box on any Expertise Aspect.' }
    ],
    non_union: [
      { id: 'far_traveler', name: 'Far Traveler', type: 'Expertise', track: 3, description: 'When you encounter something strange or unexplained, mark this Aspect to ask the GM if you have seen something like this before.' },
      { id: 'outside_perspective', name: 'Outside Perspective', type: 'Expertise', track: 3, description: 'When another PC makes a Roll that would result in Disaster, you may instead mark this Aspect and attempt the Roll yourself using a different Edge.' },
      { id: 'bridge_the_gap', name: 'Bridge The Gap', type: 'Expertise', track: 4, description: 'Whenever you make a Roll to connect people from distinct cultures and create a Twist, the Twist is always positive.' },
      { id: 'unusual_technology', name: 'Unusual Technology', type: 'Equipment', track: 2, description: 'You have a unique piece of technology used by your people, rare or unknown in Union space.' },
      { id: 'paracausal_training', name: 'Paracausal Training', type: 'Expertise', track: 2, description: 'You have training in a unique paracausal ability known to your people.' }
    ],
    nhp: [
      { id: 'unbounded_processing', name: 'Unbounded Processing', type: 'Expertise', track: 4, description: 'Your ability to analyze and process data is unparalleled. You could coordinate an entire research division or accurately predict meteorological patterns.' },
      { id: 'paracausal_insight', name: 'Paracausal Insight', type: 'Expertise', track: 4, description: 'When you enter a Scene, mark this Aspect to ask the GM a question about what is going on here. The GM must answer truthfully.' },
      { id: 'system_link', name: 'System Link', type: 'Expertise', track: 3, description: 'Your casket is equipped to connect to almost any conceivable electronic system, and you are adept at figuring out digital architecture.' },
      { id: 'interpellate_lens', name: 'Interpellate Lens', type: 'Expertise', track: 3, description: 'When you interact with a complex machine or digital program, you may mark this Aspect to talk to it as if it were a person.' },
      { id: 'subaltern_drones', name: 'Subaltern Drones', type: 'Equipment', track: 5, description: 'You have backup subalterns that you can control remotely. These multipurpose humanoid drones can carry out most tasks a human could perform.' }
    ]
  },
  roles: {
    leader: [
      { id: 'situational_awareness_suite', name: 'Situational Awareness Suite', type: 'Equipment', track: 3, description: 'A command and analysis suite that tracks team members and coordinates communications. Mark this Aspect to allow another PC to reroll any Roll.' },
      { id: 'adaptive_translator', name: 'Adaptive Translator', type: 'Equipment', track: 5, description: 'A specialized COMP/CON with almost all known languages and a sophisticated translation suite, capable of adapting to novel languages.' },
      { id: 'extended_harness', name: 'Extended Harness', type: 'Equipment', track: 3, description: 'If another PC would mark an Equipment or Consumable Aspect or Resource, you may instead mark this Aspect.' },
      { id: 'ssc_empatheia_neuromod', name: 'SSC Empatheia Neuromod', type: 'Expertise', track: 3, description: 'An experimental SSC augment that heightens sensitivity to nonverbal communication.' },
      { id: 'coordination_training', name: 'Coordination Training', type: 'Expertise', track: 3, description: 'Mark this Aspect to allow another PC to use an Equipment or Consumable Aspect belonging to another willing PC for their Roll.' },
      { id: 'lucid_dream_fata_morgana', name: 'LUCID_DREAM(FATA MORGANA)', type: 'Consumable', track: 5, description: 'Puck-like discs that project extremely convincing holographic images. Mark this Aspect upon use.' }
    ],
    surveyor: [
      { id: 'smart_scope', name: 'Smart Scope', type: 'Equipment', track: 5, description: 'An advanced sensor suite with exceptional clarity at significant distances, under adverse conditions and light levels.' },
      { id: 'omnispectrum_scanner', name: 'Omnispectrum Scanner', type: 'Equipment', track: 2, description: 'A handheld scanning device allowing passive imaging and short-range active scanning at all wavelengths.' },
      { id: 'sample_collection_gear', name: 'Sample Collection Gear', type: 'Equipment', track: 5, description: 'Hardened containers, microstasis generators, and protective gear for safely extracting dangerous samples.' },
      { id: 'drone_command_module', name: 'Drone Command Module', type: 'Equipment', track: 3, description: 'When your team uses a Survey Drone to make an additional survey roll, you may mark this Aspect to reroll and choose the result.' },
      { id: 'ispn_pharos_beacons', name: 'ISP-N Pharos Beacons', type: 'Equipment', track: 4, description: 'Designed for extended field use with precise positioning sensors and durable paracausal transponders.' },
      { id: 'minimap_scanner_projector', name: 'MINIMAP Scanner/Projector', type: 'Equipment', track: 4, description: 'A handheld unit with onboard COMP/CON that automatically compiles sensor data into a persistent aggregate map.' }
    ],
    engineer: [
      { id: 'programmable_whitewash', name: 'Programmable Whitewash', type: 'Consumable', track: 5, description: 'Canisters of programmable nanites capable of repairing equipment, extinguishing fires, sealing leaks. Mark upon use.' },
      { id: 'handheld_printer', name: 'Handheld Printer', type: 'Equipment', track: 2, description: 'A portable matter fabrication unit. Given adequate feedstock and time, can produce a variety of useful components.' },
      { id: 'ha_icepack_power_system', name: 'HA ICEPACK Power System', type: 'Equipment', track: 4, description: 'A stabilized sliver of a coldcore - a portable, near-perpetual power supply for recharging gear.' },
      { id: 'ipsn_aegaeon_multi_limb', name: 'IPS-N Aegaeon Multi-Limb', type: 'Equipment', track: 3, description: 'A cybernetic control system providing additional limbs controlled by a neural bridge.' },
      { id: 'ha_logos_grav_projector', name: 'HA LOGOS Grav Projector', type: 'Equipment', track: 3, description: 'A power-hungry portable generator that projects a close-range artificial gravity field. Mark at Scene end.' },
      { id: 'imperative_override', name: 'IMPERATIVE_OVERRIDE', type: 'Equipment', track: 2, description: 'An adaptive hive control unit designed to pacify, redirect, and retask nanites in the immediate vicinity.' }
    ],
    medic: [
      { id: 'field_surgery_kit', name: 'Field Surgery Kit', type: 'Equipment', track: 3, description: 'Specialized medical equipment allowing treatment of serious injuries. Mark to heal burned boxes on physical Aspects.' },
      { id: 'medical_scanner', name: 'Medical Scanner', type: 'Equipment', track: 3, description: 'A specialized Omnispectrum Scanner variant optimized for physiological data collection and medical diagnosis.' },
      { id: 'corrective', name: 'Corrective', type: 'Consumable', track: 2, description: 'Medi-gel patches with nanites and stim injectors. Mark to let a removed character act for the rest of the Scene.' },
      { id: 'emergency_evac_system', name: 'Emergency Evac System', type: 'Consumable', track: 2, description: 'Single-use extraction gear. Mark to immediately travel to a previously visited Location without Consequences.' },
      { id: 'ha_pause_lock_stasis_pack', name: 'HA Pause/Lock Stasis Pack', type: 'Consumable', track: 5, description: 'Single-use portable generators that project a limited stasis field. Mark at Scene end when used.' },
      { id: 'ssc_panacea_nanites', name: 'SSC Panacea Nanites', type: 'Consumable', track: 4, description: 'Specialized medical nanites that act as an artificial immune system. Mark to reroll any healing roll.' }
    ],
    survivalist: [
      { id: 'custom_survival_gear', name: 'Custom Survival Gear', type: 'Equipment', track: 4, description: 'Sophisticated customized gear ensuring you have the appropriate tool for almost any survival situation.' },
      { id: 'multi_gear_maneuver_system', name: 'Multi-Gear Maneuver System', type: 'Equipment', track: 5, description: 'Smart cabling and grapple units allowing easy climbing, hauling, and traversal across distant gaps.' },
      { id: 'ssc_mythimna_panoply', name: 'SSC Mythimna Panoply', type: 'Equipment', track: 3, description: 'A hardsuit with chameleonic reactive weave that causes you to blend with almost any environment.' },
      { id: 'ssc_sylph_undersuit', name: 'SSC Sylph Undersuit', type: 'Equipment', track: 5, description: 'A bioengineered organic undersuit that cleans your body, aids healing, filters air, and protects against vacuum.' },
      { id: 'tetrafold_barque', name: 'TETRAFOLD_BARQUE', type: 'Equipment', track: 1, description: 'A generator producing semi-stable metafold space usable as temporary shelter. Mark at Scene end.' },
      { id: 'ssc_genetailoring', name: 'SSC Genetailoring', type: 'Expertise', track: 4, description: 'Bespoke genetic enhancements providing improvements in oxygen consumption, muscle mass, bone density, and more.' }
    ],
    sysop: [
      { id: 'locksmith_security_suite', name: 'LOCKSMITH Security Suite', type: 'Equipment', track: 4, description: 'A custom software package with advanced hacking programs and countermeasures for digital systems.' },
      { id: 'omnihook', name: 'Omnihook', type: 'Equipment', track: 2, description: 'A bulky omninet terminal allowing communication, data transfer, and limited hot-spotting in the field.' },
      { id: 'custom_comp_con', name: 'Custom COMP/CON', type: 'Equipment', track: 3, description: 'A highly advanced AI unit that can analyze data, operate machinery, and act semi-independently.' },
      { id: 'emp_generator', name: 'EMP Generator', type: 'Equipment', track: 2, description: 'A generator creating a localized electromagnetic pulse that indiscriminately disrupts electronics. Mark upon use.' },
      { id: 'unavoidable_void', name: 'UNAVOIDABLE_VOID', type: 'Equipment', track: 3, description: 'A hardsuit memetic lace that induces errors in AI systems that scan it. At Scene end, mark Minor Consequences.' },
      { id: 'iron_knife_opening_of_the_mouth', name: 'IRON_KNIFE/OPENING OF THE MOUTH', type: 'Equipment', track: 4, description: 'A sophisticated scanning rig for extracting data patterns from digital systems, combating deletion and bit rot.' }
    ],
    security: [
      { id: 'heavy_hardsuit', name: 'Heavy Hardsuit', type: 'Equipment', track: 5, description: 'An up-armored hardsuit that reduces the severity of Consequences from weapons fire and physical trauma by one step.' },
      { id: 'ipsn_goliath_weave', name: 'IPS-N Goliath Weave', type: 'Equipment', track: 3, description: 'A woven mesh that reinforces strength augmentation. Mark to perform a feat of superhuman strength.' },
      { id: 'signature_weapon', name: 'Signature Weapon', type: 'Equipment', track: 4, description: 'A custom weapon - blade, smartgun, or laser rifle - and extensive training in its use.' },
      { id: 'thermite_charges', name: 'Thermite Charges', type: 'Consumable', track: 5, description: 'Pyrotechnic charges for creating entry points and cutting through tough material. Mark upon use.' },
      { id: 'flash_charges', name: 'Flash Charges', type: 'Consumable', track: 5, description: 'Less-lethal charges designed to disorient and stun. Mark upon use.' },
      { id: 'ha_hardlight_projector', name: 'HA Hardlight Projector', type: 'Equipment', track: 2, description: 'A generator projecting hardlight shielding that reduces all Consequences from weapons fire to Minor. Mark at Scene end.' }
    ]
  },
  disciplines: {
    anthropology: [
      { id: 'adaptable', name: 'Adaptable', type: 'Expertise', track: 5, description: 'Given an opportunity to immerse yourself within a culture, you can quickly gain understanding of its social conventions and protocols.' },
      { id: 'deep_dive', name: 'Deep Dive', type: 'Expertise', track: 4, description: 'With time to study, you can choose a single culture to research. When interacting with members and creating a Twist, mark to reroll.' },
      { id: 'ethnography', name: 'Ethnography', type: 'Expertise', track: 2, description: 'When you Rest after observing a culture, you may create a Scientific Data Resource related to your experiences.' }
    ],
    astronomy: [
      { id: 'cynosure', name: 'Cynosure', type: 'Expertise', track: 5, description: 'With a clear view of the sky, you can accurately determine current time, orientation, and rough latitude/longitude.' },
      { id: 'telemetrics', name: 'Telemetrics', type: 'Expertise', track: 3, description: 'You can track and predict objects in orbit. If you have a Satellite resource, mark to give the team an additional die on surveying.' },
      { id: 'astrodynamics', name: 'Astrodynamics', type: 'Expertise', track: 5, description: 'You have extensive experience applying orbital mechanics to piloting spacecraft and measuring astronomical bodies.' }
    ],
    biology: [
      { id: 'geneticist', name: 'Geneticist', type: 'Expertise', track: 4, description: 'With a tissue or blood sample and Rest time, you can analyze a creature\'s genetics and gain useful information or a Scientific Data Resource.' },
      { id: 'xenobiologist', name: 'Xenobiologist', type: 'Expertise', track: 2, description: 'When surveying a Location for the first time, you automatically reveal any Hazards related to native flora or fauna.' },
      { id: 'ecologist', name: 'Ecologist', type: 'Expertise', track: 5, description: 'Mark to ask the GM about the foreseeable consequences of a particular ecological change and receive a truthful answer.' }
    ],
    cartography: [
      { id: 'join_the_dots', name: 'Join The Dots', type: 'Expertise', track: 3, description: 'If you have fully explored two Locations connected to your target, your survey rolls gain +1 die.' },
      { id: 'pathfinder', name: 'Pathfinder', type: 'Expertise', track: 4, description: 'You can construct extremely accurate maps, allowing you to ignore all Travel Hazards between previously-visited Locations.' },
      { id: 'mapmaker', name: 'Mapmaker', type: 'Expertise', track: 2, description: 'When you Rest at a new Location, you may create a Map Resource which can be invoked on Rolls related to previously visited Locations.' }
    ],
    chemistry: [
      { id: 'field_laboratory', name: 'Field Laboratory', type: 'Expertise', track: 4, description: 'During a Rest when you examine an unknown object or material, you may automatically generate a Scientific Data Resource.' },
      { id: 'synthesis', name: 'Synthesis', type: 'Expertise', track: 3, description: 'When you overcome a material-based Hazard, you may mark to clear marks on a Consumable Aspect equal to the Hazard\'s Rating.' },
      { id: 'matter_processing', name: 'Matter Processing', type: 'Expertise', track: 2, description: 'With access to a printer and sufficient feedstock and energy, you can convert one type of material into another.' }
    ],
    computing: [
      { id: 'machine_linguist', name: 'Machine Linguist', type: 'Expertise', track: 3, description: 'During a Rest, mark to study an unfamiliar digital system and gain +1 die on all Rolls to interact with it for the Mission.' },
      { id: 'universal_compatibility', name: 'Universal Compatibility', type: 'Expertise', track: 5, description: 'You can hook up almost any digital system to any other, even if they are normally incompatible.' },
      { id: 'liturgics', name: 'Liturgics', type: 'Expertise', track: 3, description: 'During a Rest you may mark to initiate a short Scene where you can interrogate HORUS-like paracode as if it were a person.' }
    ],
    history: [
      { id: 'hit_the_books', name: 'Hit The Books', type: 'Expertise', track: 4, description: 'When you invoke this Aspect and the result includes a Twist, the GM gives you useful historical context or recorded information.' },
      { id: 'archaeologist', name: 'Archaeologist', type: 'Expertise', track: 5, description: 'When examining artifacts or technology, you can identify the time period and whether something was created off-world.' },
      { id: 'paleographer', name: 'Paleographer', type: 'Expertise', track: 5, description: 'You can always decipher familiar language texts, and when invoking this Aspect on research, you may mark it to add a second die.' }
    ],
    linguistics: [
      { id: 'common_ground', name: 'Common Ground', type: 'Expertise', track: 4, description: 'Even without a shared language, you can always communicate basic concepts to anyone actively trying to understand you.' },
      { id: 'codebreaker', name: 'Codebreaker', type: 'Expertise', track: 5, description: 'Mark to decipher simple codes without a Roll. For complex codes, gain +1 die on all future Rolls to decipher this type.' },
      { id: 'lexicographer', name: 'Lexicographer', type: 'Expertise', track: 2, description: 'When you Rest after interacting with an unusual language, you may create a Scientific Data Resource related to that language.' }
    ],
    medicine: [
      { id: 'paramedic', name: 'Paramedic', type: 'Expertise', track: 4, description: 'When a character is physically injured and you can reach them in the same Scene, mark to cause them to take only Minor Consequences.' },
      { id: 'pathologist', name: 'Pathologist', type: 'Expertise', track: 5, description: 'You can readily identify symptoms of poisoning, infection, and disease. When invoking on related Rolls, mark to add a second die.' },
      { id: 'pharmacologist', name: 'Pharmacologist', type: 'Expertise', track: 3, description: 'During a Rest you may analyze a substance for its pharmacological properties, determining its effects and creating a Scientific Data Resource.' }
    ],
    ontologistics: [
      { id: 'paratechnician', name: 'Paratechnician', type: 'Expertise', track: 5, description: 'You are qualified to administer tests and procedures related to NHPs, and can translate non-human subjectivities to a human frame.' },
      { id: 'metafold_engineer', name: 'Metafold Engineer', type: 'Expertise', track: 4, description: 'You are an expert in blinkspace geometry. When analyzing paraphysical phenomena, mark to create a Scientific Data Resource with two boxes.' },
      { id: 'subjectivity_conditioning', name: 'Subjectivity Conditioning', type: 'Expertise', track: 3, description: 'You are familiar with methods used to impose or alter subjective experience, including hard-code conditioning and interpellation.' }
    ],
    physical_geography: [
      { id: 'rock_hound', name: 'Rock Hound', type: 'Expertise', track: 4, description: 'You are adept at navigating underground and gain an extra die whenever you survey a cave or natural rock formation.' },
      { id: 'a_weather_eye', name: 'A Weather Eye', type: 'Expertise', track: 5, description: 'You can accurately predict weather and automatically reveal any weather-related Hazards when surveying a Location.' },
      { id: 'sea_legs', name: 'Sea Legs', type: 'Expertise', track: 5, description: 'You are an expert in navigating liquid oceans. When invoking on a relevant Survey Roll, mark to add a second die.' }
    ],
    psychology: [
      { id: 'frontier_psychiatrist', name: 'Frontier Psychiatrist', type: 'Expertise', track: 3, description: 'During a Rest, mark to initiate a Scene with someone struggling with psychological effects. At the end, they may clear two boxes on a related Aspect.' },
      { id: 'xenopsychologist', name: 'Xenopsychologist', type: 'Expertise', track: 5, description: 'When interacting with an unfamiliar creature, you can interpret its intent and mood and determine communication methods.' },
      { id: 'memeticist', name: 'Memeticist', type: 'Expertise', track: 4, description: 'You are adept at identifying paracausal effects. When surveying a Location, you automatically reveal any memetic Hazards.' }
    ],
    narration: [
      { id: 'storyteller', name: 'Storyteller', type: 'Expertise', track: 5, description: 'You are adept at weaving tales, reframing experiences, and reading subtext, making you particularly effective at communication through story.' },
      { id: 'artist', name: 'Artist', type: 'Expertise', track: 3, description: 'During a Rest, mark to create an Art Resource depicting some aspect of the mission. Art Resources persist into Downtime.' },
      { id: 'play_it_back', name: 'Play It Back', type: 'Expertise', track: 4, description: 'Mark to retroactively declare that an earlier Scene was recorded, allowing you to analyze the footage in extreme detail.' }
    ],
    theology: [
      { id: 'rites_and_rituals', name: 'Rites and Rituals', type: 'Expertise', track: 3, description: 'When you encounter religious ceremony or symbology, you can always gain a sense of its intent or meaning.' },
      { id: 'theographer', name: 'Theographer', type: 'Expertise', track: 4, description: 'Whenever you create a Scientific Data Resource from studying religious practices, it gains an additional box.' },
      { id: 'as_foretold', name: 'As Foretold', type: 'Expertise', track: 1, description: 'When a teammate would make a Roll, you may burn this Aspect. If you do, the Roll automatically results in a Triumph.' }
    ]
  }
};

// Standard supplies for character resources
export const STANDARD_SUPPLIES = [
  { id: 'first_aid_kit', name: 'First Aid Kit', type: 'Equipment', track: 3, description: 'Basic medical supplies for treating minor injuries.' },
  { id: 'rations', name: 'Rations', type: 'Consumable', track: 5, description: 'Food and water supplies for survival in the field.' },
  { id: 'ammunition', name: 'Ammunition', type: 'Consumable', track: 4, description: 'Ammunition for personal weapons.' },
  { id: 'power_cells', name: 'Power Cells', type: 'Consumable', track: 4, description: 'Portable power sources for equipment.' },
  { id: 'repair_kit', name: 'Repair Kit', type: 'Equipment', track: 3, description: 'Tools and materials for field repairs.' },
  { id: 'climbing_gear', name: 'Climbing Gear', type: 'Equipment', track: 3, description: 'Ropes, carabiners, and other climbing equipment.' },
  { id: 'hardsuit', name: 'Hardsuit', type: 'Equipment', track: 4, description: 'Environmental protection suit rated for hostile conditions.' },
  { id: 'comm_unit', name: 'Comm Unit', type: 'Equipment', track: 2, description: 'Personal communication device.' }
];

// Progression options. Cost is per-squad-member; the total cost of a pool
// is perPlayerCost × number of squad members in the pool.
export const PROGRESSION_OPTIONS = [
  { type: 'skill_rank', name: '+1 Skill Rank', perPlayerCost: 3, description: 'Each squad member increases the rank of one of their skills by 1 (max 3).' },
  { type: 'aspect_box', name: '+1 Aspect Box', perPlayerCost: 3, description: 'Each squad member adds one box to one of their aspects.' },
  { type: 'new_skill', name: 'New Skill at Rank 1', perPlayerCost: 6, description: 'Each squad member gains a new skill at Rank 1.' },
  { type: 'background_aspect', name: 'New Background Aspect', perPlayerCost: 6, description: 'Each squad member gains a new aspect from one of their backgrounds.' },
  { type: 'any_aspect', name: 'Any Aspect', perPlayerCost: 9, description: 'Each squad member gains any aspect from any background.' }
];

/**
 * Get all aspects for a given origin
 */
export function getOriginAspects(originId) {
  return ASPECTS_BY_BACKGROUND.origins[originId] || [];
}

/**
 * Get all aspects for a given role
 */
export function getRoleAspects(roleId) {
  return ASPECTS_BY_BACKGROUND.roles[roleId] || [];
}

/**
 * Get all aspects for a given discipline
 */
export function getDisciplineAspects(disciplineId) {
  return ASPECTS_BY_BACKGROUND.disciplines[disciplineId] || [];
}

/**
 * Get all available aspects for a character based on their backgrounds
 */
export function getAvailableAspects(backgrounds) {
  const aspects = [];

  if (backgrounds.origin?.id) {
    const originAspects = getOriginAspects(backgrounds.origin.id);
    aspects.push(...originAspects.map(a => ({ ...a, source: 'origin', sourceName: backgrounds.origin.name })));
  }

  if (backgrounds.role?.id) {
    const roleAspects = getRoleAspects(backgrounds.role.id);
    aspects.push(...roleAspects.map(a => ({ ...a, source: 'role', sourceName: backgrounds.role.name })));
  }

  if (backgrounds.discipline?.id) {
    const disciplineAspects = getDisciplineAspects(backgrounds.discipline.id);
    aspects.push(...disciplineAspects.map(a => ({ ...a, source: 'discipline', sourceName: backgrounds.discipline.name })));
  }

  return aspects;
}

/**
 * Get default skills object for a new character
 */
export function getDefaultSkills() {
  const skills = {};
  for (const skill of FAR_FIELD_SKILLS) {
    skills[skill.id] = { rank: 0, failures: [] };
  }
  return skills;
}
