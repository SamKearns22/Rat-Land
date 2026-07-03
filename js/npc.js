// npc.js — the Town Crier, a static NPC posted outside Rat Town Hall.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.townCrier = {
  name: 'Town Crier',
  col: 7,
  row: 4,
  color: '#b0463c',
  lines: [
    'Hear ye, hear ye! Twenty glorious years of Rat Land!',
    "The Mayor says the mouse situation is 'under control.'",
    'Cheese rations for all citizens... eventually.',
    "Don't mind the bridge tolls, friend — progress isn't free.",
    'Anniversary parade at sundown! Mind the potholes.',
  ],
  lineIndex: 0,
};

RatLand.getCrierLine = function () {
  var crier = RatLand.townCrier;
  var line = crier.lines[crier.lineIndex];
  crier.lineIndex = (crier.lineIndex + 1) % crier.lines.length;
  return line;
};

// Chebyshev (tile) distance from the player's current tile to the crier.
RatLand.distanceToCrier = function (playerCol, playerRow) {
  var crier = RatLand.townCrier;
  return Math.max(Math.abs(playerCol - crier.col), Math.abs(playerRow - crier.row));
};

// --- NPC sprite roster --------------------------------------------------
// One entry per named or distinct NPC in NPC_DIALOGUE.md. Every rat is
// drawn from the same base rat shape (see rendering.js: drawNpcRat) —
// what makes each one look like *that* character is the fur tone plus a
// short, specific list of accessories chosen from their actual lines,
// not a generic "posh rat" / "rough rat" template. `note` records the
// reasoning so it stays traceable back to the dialogue file.
RatLand.NPC_ROSTER = [
  // --- Group 1: political rats ---
  {
    id: 'nutkin', name: 'Colonel Bartholomew Nutkin', group: 'political',
    color: '#6b4a3a',
    accessories: [
      { type: 'hat', style: 'bowler' },
      { type: 'neck', style: 'sash', color: '#8a6a2a' },
      { type: 'pin', style: 'ribbon-proud' },
    ],
    note: 'Posh ex-officer: bowler hat and a braided sash, plus a straight, proudly worn anniversary ribbon — his stance is sincere pride, not irony.',
  },
  {
    id: 'gristle', name: 'Gristle', group: 'political',
    color: '#4a3a2a',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'body', style: 'scruffy' },
    ],
    note: 'Rough dockside rat: flat cap and patchy, unkempt fur. No anniversary trinkets — he has no patience for pageantry.',
  },
  {
    id: 'marguerite', name: 'Marguerite Thistlewood-Vole', group: 'political',
    color: '#8a7a78',
    accessories: [
      { type: 'eyewear', style: 'monocle' },
      { type: 'neck', style: 'stole', color: '#9a8888' },
    ],
    note: 'Posh but socialite-posh, not military-posh like Nutkin: a monocle and a draped fur stole rather than a sash.',
  },
  {
    id: 'pip', name: 'Pip', group: 'political',
    color: '#8a6a4a',
    accessories: [
      { type: 'body', style: 'patched' },
      { type: 'neck', style: 'scarf', color: '#a8987c' },
    ],
    note: 'Poor but cared-for, not neglected: a mended patch (not Gristle\'s scruff) and a plain scarf.',
  },
  {
    id: 'drainwatcher', name: 'The Drain-Watcher', group: 'political',
    color: '#7a7a72',
    accessories: [
      { type: 'body', style: 'hivis', color: '#9c9060' },
    ],
    note: 'A single dull, muted hi-vis stripe — going through the motions of a job he\'s checked out of.',
  },
  {
    id: 'twitchy', name: 'Twitchy Nostrum', group: 'political',
    color: '#7d8266',
    accessories: [
      { type: 'hat', style: 'tin' },
      { type: 'body', style: 'twitch' },
    ],
    note: 'A direct callback to his own joke about "who\'s really running the cheese supply" — a foil-style tin hat, plus a jittery whisker mark.',
  },
  {
    id: 'nangribble', name: 'Nan Gribble', group: 'political',
    color: '#9c9488',
    accessories: [
      { type: 'body', style: 'faded' },
      { type: 'neck', style: 'shawl', color: '#8a8278' },
      { type: 'prop', style: 'walkingstick' },
    ],
    note: 'Washed-out, sepia fur tone for nostalgia, plus an elderly shawl and stick.',
  },
  {
    id: 'bramwell', name: 'Bramwell', group: 'political',
    color: '#6a7278',
    accessories: [
      { type: 'pin', style: 'locket' },
    ],
    note: 'A cooler, more melancholy fur tone than the rest of the group, and one tiny, easy-to-miss locket — the sister he doesn\'t talk about.',
  },
  {
    id: 'ferdycobb', name: 'Ferdy Cobb', group: 'political',
    color: '#5a6068',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'pin', style: 'badge', color: '#9c8a3a' },
    ],
    note: 'A flat cap like Gristle\'s, but paired with a union badge — organized labour, not aimless resentment.',
  },
  {
    id: 'wavering', name: 'The Wavering Rat', group: 'political',
    color: '#8a8a82',
    accessories: [
      { type: 'pin', style: 'ribbon-mismatched' },
    ],
    note: 'A deliberately unremarkable grey, with a ribbon pinned to only one side — can\'t commit to a position, visually.',
  },
  {
    id: 'regcutwater', name: 'Reg Cutwater', group: 'political',
    color: '#6b5240',
    accessories: [
      { type: 'prop', style: 'toolbelt' },
      { type: 'body', style: 'wary' },
    ],
    note: 'A dock foreman\'s toolbelt, plus a darker, tenser tone reflecting how shaken he was by the riot he witnessed.',
  },
  {
    id: 'sisterbramble', name: 'Sister Bramble', group: 'political',
    color: '#6a5a68',
    accessories: [
      { type: 'hat', style: 'hood', color: '#5a4a58' },
      { type: 'body', style: 'droopy' },
    ],
    note: 'A church hood (echoing the Church of the Rat God\'s purple, muted down) and a tired, drooping posture — sympathy fatigue, not anger.',
  },
  {
    id: 'fenwicket', name: 'Fen Wicket', group: 'political',
    color: '#5c6a68',
    accessories: [
      { type: 'body', style: 'damp' },
      { type: 'pin', style: 'tollcoin', color: '#9c9060' },
    ],
    note: 'Heavily damp and bedraggled from years at the toll-house watching the river, plus the coin he collects tolls with.',
  },
  {
    id: 'dredge', name: 'Dredge', group: 'political',
    color: '#6a5c4a',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'body', style: 'damp-light' },
    ],
    note: 'Only lightly damp (he stays on the bridge, not in the water) and a harder-edged flat cap — resentment, not sympathy.',
  },
  {
    id: 'pembertonvole', name: 'Mrs. Pemberton-Vole', group: 'political',
    color: '#8a7268',
    accessories: [
      { type: 'eyewear', style: 'monocle' },
      { type: 'prop', style: 'bundle', color: '#5a4a3a' },
    ],
    note: 'Opera-glasses monocle for the gossip, and a small suspicious wrapped bundle — the exact thing she claims to have merely heard about.',
  },
  {
    id: 'marsh', name: 'Marsh', group: 'political',
    color: '#5c5c48',
    accessories: [
      { type: 'pin', style: 'ribbon-crumpled' },
    ],
    note: 'Wears the anniversary ribbon, but crooked and crumpled — disgust, not pride, distinguishing him from Nutkin\'s straight one.',
  },
  {
    id: 'wetherby', name: 'Wetherby', group: 'political',
    color: '#787870',
    accessories: [
      { type: 'eyewear', style: 'spectacles' },
      { type: 'prop', style: 'newspaper', color: '#6a6a60' },
    ],
    note: 'Clerk\'s spectacles (not a monocle — he\'s office staff, not gentry) and the rolled minutes he "typed himself."',
  },
  {
    id: 'nettle', name: 'Corporal Nettle', group: 'political',
    color: '#6a7052',
    accessories: [
      { type: 'neck', style: 'sash', color: '#4a5a3a' },
      { type: 'body', style: 'wary-light' },
    ],
    note: 'Plain green webbing strap (active low-rank, not Nutkin\'s braided officer sash) and a mild, weary tension from the tithes he resents.',
  },

  // --- Group 2: ordinary rats ---
  {
    id: 'doreen', name: 'Doreen', group: 'ordinary',
    color: '#9c7a52',
    accessories: [
      { type: 'neck', style: 'apron', color: '#7a5a3a' },
      { type: 'prop', style: 'crust', color: '#c9a878' },
    ],
    note: 'Café apron, and a crust held out mid-offer — she\'s always in the middle of giving one away.',
  },
  {
    id: 'sooty', name: 'Sooty', group: 'ordinary',
    color: '#4a4a46',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#3a3a38' },
    ],
    note: 'Soot-dark fur with a matching dark team scarf — Outfall Rovers.',
  },
  {
    id: 'chalky', name: 'Chalky', group: 'ordinary',
    color: '#b8b4a8',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#d8d4c8' },
    ],
    note: 'Chalk-pale fur with a matching pale scarf — Big Sump United.',
  },
  {
    id: 'oldfenwick', name: 'Old Fenwick', group: 'ordinary',
    color: '#9c8868',
    accessories: [
      { type: 'prop', style: 'walkingstick' },
      { type: 'prop2', style: 'cheese', color: '#e0c880' },
    ],
    note: 'Elderly walking stick, and a clutched wedge of cheese he\'s busy complaining about the price of.',
  },
  {
    id: 'scrapgrumbler', name: 'The Scrap Grumbler', group: 'ordinary',
    color: '#8a8a80',
    accessories: [
      { type: 'prop', style: 'bag', color: '#6a6a60' },
    ],
    note: 'A shopping bag stuffed with the bottle-cap hoard he won\'t stop talking about.',
  },
  {
    id: 'countrysidedreamer', name: 'The Countryside Dreamer', group: 'ordinary',
    color: '#7a8268',
    accessories: [
      { type: 'pin', style: 'leaf' },
    ],
    note: 'A single leaf sprig tucked behind the ear — the closest he gets to the surface most days.',
  },
  {
    id: 'weatherA', name: 'Rat A (weather)', group: 'ordinary',
    color: '#8a8a82',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#6a6a5c' },
    ],
    note: 'Plain damp-weather scarf, nothing more — the straight man in the exchange.',
  },
  {
    id: 'weatherB', name: 'Rat B (weather)', group: 'ordinary',
    color: '#8a7c6a',
    accessories: [
      { type: 'prop', style: 'dripgauge', color: '#5a5a52' },
    ],
    note: 'Carries the drip gauge he\'s inordinately proud of.',
  },
  {
    id: 'queuecomplainer', name: 'The Queue Complainer', group: 'ordinary',
    color: '#6a7876',
    accessories: [
      { type: 'prop', style: 'bag', color: '#5a6a68' },
    ],
    note: 'A little coffee-rind bag, clutched while waiting — and waiting.',
  },
  {
    id: 'allotmentbragger', name: 'The Allotment Bragger', group: 'ordinary',
    color: '#6a7a5a',
    accessories: [
      { type: 'pin', style: 'moss' },
    ],
    note: 'Prize moss worn proudly like a medal.',
  },
  {
    id: 'paradegossip', name: 'The Parade Gossip', group: 'ordinary',
    color: '#9c8478',
    accessories: [
      { type: 'pin', style: 'bunting' },
    ],
    note: 'Tiny bunting flags — excited about the anniversary decorations specifically, nothing political.',
  },
  {
    id: 'bindaygrumbler', name: 'The Bin Day Grumbler', group: 'ordinary',
    color: '#7c7266',
    accessories: [
      { type: 'prop', style: 'toolbelt', color: '#5a4a3a' },
    ],
    note: 'A battered toolbelt for a schedule that never holds.',
  },

  // --- Outsider ---
  {
    id: 'kevin', name: 'Kevin', group: 'mouse', species: 'mouse',
    color: '#9a92a0',
    accessories: [],
    note: 'Drawn with the separate mouse silhouette (bigger, forward-set ears, pointed snout, smaller frame) in a cool lavender-grey found nowhere in the rat palette — an outsider by design, not just by color.',
  },
];
