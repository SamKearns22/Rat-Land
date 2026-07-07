// npc.js — the Town Crier, a static NPC posted outside Rat Town Hall.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.townCrier = {
  name: 'Town Crier',
  col: 8,
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

// Cycles an NPC's dialogue one line at a time. Works for the Town Crier
// and every RatLand.NPC_ROSTER entry alike, since both shapes carry
// col/row/name/lines/lineIndex.
RatLand.getNpcLine = function (npc) {
  var line = npc.lines[npc.lineIndex];
  npc.lineIndex = (npc.lineIndex + 1) % npc.lines.length;
  return line;
};

// Linked conversational pairs: two NPCs who share a single back-and-forth
// dialogue instead of each cycling their own independent lines. Talking to
// either member of the pair advances the *shared* lineIndex and alternates
// speaker, so pressing Talk repeatedly plays out a real conversation
// instead of two people talking past each other. See `pairId` on the
// relevant RatLand.NPC_ROSTER entries.
RatLand.NPC_PAIRS = {
  weatherpair: {
    speakerNames: { nora: 'Nora Sopwell', barry: 'Barry Trench' },
    lines: [
      { speaker: 'nora', text: 'Damp again.' },
      { speaker: 'barry', text: 'Extra damp, actually. I checked the drip gauge this morning.' },
      { speaker: 'nora', text: 'You have a drip gauge?' },
      { speaker: 'barry', text: 'Everyone should have a drip gauge.' },
    ],
    lineIndex: 0,
  },
};

// Advances a shared pair conversation by one line, wrapping around, and
// returns the display name of whoever's speaking plus their text.
RatLand.getPairLine = function (pairId) {
  var pair = RatLand.NPC_PAIRS[pairId];
  var entry = pair.lines[pair.lineIndex];
  pair.lineIndex = (pair.lineIndex + 1) % pair.lines.length;
  return { speakerName: pair.speakerNames[entry.speaker], text: entry.text };
};

// Finds the closest talkable NPC (Town Crier or roster) within one tile
// (Chebyshev distance) of the player's tile, or null if nobody's close
// enough. Same adjacency rule the Crier always used.
RatLand.findTalkTarget = function (playerCol, playerRow) {
  var candidates = [RatLand.townCrier].concat(RatLand.NPC_ROSTER);
  var best = null;
  var bestDist = Infinity;
  candidates.forEach(function (npc) {
    var dist = Math.max(Math.abs(npc.col - playerCol), Math.abs(npc.row - playerRow));
    if (dist <= 1 && dist < bestDist) {
      best = npc;
      bestDist = dist;
    }
  });
  return best;
};

// True if the Town Crier or any roster NPC is standing on this tile.
// Characters are physically solid, so this tile is off-limits to the
// player the same way a wall or the river is.
RatLand.isNpcAt = function (col, row) {
  var crier = RatLand.townCrier;
  if (crier.col === col && crier.row === row) return true;
  return RatLand.NPC_ROSTER.some(function (npc) {
    return npc.col === col && npc.row === row;
  });
};

// Overworld solidity used for player movement: the ordinary tile/location
// rules, plus NPCs blocking their own tile.
RatLand.isOverworldBlocked = function (col, row) {
  return RatLand.isSolidOverworldTile(col, row) || RatLand.isNpcAt(col, row);
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
    col: 4, row: 6,
    lines: [
      "We didn't spend twenty years excavating this borough for it to become a thoroughfare, thank you very much.",
      "I've nothing against the mice personally. Splendid whiskers, some of them. It's a matter of principle.",
      "A rat who won't defend his own drainpipe is no rat at all. Chin up. Tail straight.",
      "Twenty years, and the old drainpipe's still standing! Do buff your medals for the parade, there's a good chap.",
    ],
    lineIndex: 0,
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
    col: 18, row: 18,
    lines: [
      "Shut the grate, that's what I say. Simple as.",
      "Every time I try to complain about somethin', someone tells me I'm 'not looking at the bigger picture.' I am. It's smaller than it used to be, is what.",
      "Nothin' personal. Well. It's a bit personal.",
    ],
    lineIndex: 0,
    color: '#4a3a2a',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'body', style: 'scruffy' },
    ],
    note: 'Rough dockside rat: flat cap and patchy, unkempt fur. No anniversary trinkets — he has no patience for pageantry.',
  },
  {
    id: 'marguerite', name: 'Marguerite Thistlewood-Vole', group: 'political',
    col: 9, row: 9,
    lines: [
      "One does wonder how some rats sleep at night, frankly, with views like that rattling round such small burrows.",
      "We ought to be a touch more hospitable, don't you think? It costs nothing to be gracious. Well — it costs a little. But one absorbs it.",
      "I had the most marvellous mouse caterer for my anniversary do. Divine little vol-au-vents. It's really opened my eyes.",
    ],
    lineIndex: 0,
    color: '#8a7a78',
    accessories: [
      { type: 'eyewear', style: 'monocle' },
      { type: 'neck', style: 'stole', color: '#9a8888' },
    ],
    note: 'Posh but socialite-posh, not military-posh like Nutkin: a monocle and a draped fur stole rather than a sash.',
  },
  {
    id: 'pip', name: 'Pip', group: 'political', species: 'mouse',
    col: 13, row: 9,
    lines: [
      "Me mum always said a full sewer's a happy sewer. More whiskers, more warmth, that's what I reckon.",
      "Dunno about all the fuss, honestly. A rat's a rat. A mouse works just as hard for a crust as the rest of us.",
    ],
    lineIndex: 0,
    color: '#8a6a4a',
    accessories: [
      { type: 'body', style: 'patched' },
      { type: 'neck', style: 'scarf', color: '#a8987c' },
    ],
    note: 'Poor but cared-for, not neglected: a mended patch (not Gristle\'s scruff) and a plain scarf. Drawn as a mouse, not a rat — one of the few political characters who isn\'t anti-mouse actually is one, which is exactly why "a rat\'s a rat" reads as more than a slogan for him.',
  },
  {
    id: 'drainwatcher', name: 'The Drain-Watcher', group: 'political',
    col: 11, row: 13,
    lines: [
      "Separation, unification, whatever — none of it's fixed my leaky pipe, has it.",
      "They're all up there shouting past each other. I just want the shouting to happen somewhere drier.",
      "Vote for whoever you like. I'm voting for a nap.",
    ],
    lineIndex: 0,
    color: '#7a7a72',
    accessories: [
      { type: 'body', style: 'hivis', color: '#9c9060' },
    ],
    note: 'A single dull, muted hi-vis stripe — going through the motions of a job he\'s checked out of.',
  },
  {
    id: 'twitchy', name: 'Twitchy Nostrum', group: 'political',
    col: 24, row: 3,
    lines: [
      "You don't hear much about who's really running the cheese supply, do you? Funny, that.",
      "The whole separation debate? Distraction. Someone up top wants us squabbling so we don't look at the U-bend.",
      "I'm not saying it's the Overground rats. I'm saying nobody's ruled it out.",
      "Nobody wants to talk about what happened at Grate Nine. I've noticed. I've written it down.",
    ],
    lineIndex: 0,
    color: '#7d8266',
    accessories: [
      { type: 'hat', style: 'tin' },
      { type: 'body', style: 'twitch' },
    ],
    note: 'A direct callback to his own joke about "who\'s really running the cheese supply" — a foil-style tin hat, plus a jittery whisker mark.',
  },
  {
    id: 'nangribble', name: 'Nan Gribble', group: 'political',
    col: 5, row: 10,
    lines: [
      "In my day the water ran browner and nobody made a fuss about it.",
      "We didn't have 'sides.' We had one good tunnel and you were grateful for it.",
      "Mouse Land, Rat Land — in my day it was just 'the wet bit' and 'the wetter bit.'",
      "Riots at the Culvert. Shocking, everyone says. I say it's the first shocking thing to happen down there in about six years, which if you ask me is the real shock.",
    ],
    lineIndex: 0,
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
    col: 15, row: 3,
    lines: [
      "Best thing we ever did, drawing that line. Keeps things tidy.",
      "...My sister crossed over, you know. Mouse Land side. Eleven years this spring. Not that I'm counting.",
      "Anyway. Tidy. That's the main thing.",
    ],
    lineIndex: 0,
    color: '#6a7278',
    accessories: [
      { type: 'pin', style: 'locket' },
    ],
    note: 'A cooler, more melancholy fur tone than the rest of the group, and one tiny, easy-to-miss locket — the sister he doesn\'t talk about.',
  },
  {
    id: 'ferdycobb', name: 'Ferdy Cobb', group: 'political',
    col: 11, row: 18,
    lines: [
      "It's not about mice, personally, it's about wages. Cheese-hauling work's been split three ways since the crossing opened.",
      "Man's got to feed his kits. Nothin' fancy about it, whatever the Colonel dresses it up as.",
    ],
    lineIndex: 0,
    color: '#5a6068',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'pin', style: 'badge', color: '#9c8a3a' },
    ],
    note: 'A flat cap like Gristle\'s, but paired with a union badge — organized labour, not aimless resentment.',
  },
  {
    id: 'wavering', name: 'The Wavering Rat', group: 'political',
    col: 11, row: 1,
    lines: [
      "I go back and forth, don't I. Monday I'm all for the wall. Tuesday I feel dreadful about it.",
      "Honestly I just nod along with whoever's talking. Saves an argument.",
      "Twenty years, is it. I keep meaning to have a view on that.",
    ],
    lineIndex: 0,
    color: '#8a8a82',
    accessories: [
      { type: 'pin', style: 'ribbon-mismatched' },
    ],
    note: 'A deliberately unremarkable grey, with a ribbon pinned to only one side — can\'t commit to a position, visually.',
  },
  {
    id: 'regcutwater', name: 'Reg Cutwater', group: 'political',
    col: 13, row: 17,
    lines: [
      "I've hauled scrap alongside all sorts for thirty years and never said a wrong word. But what happened down the Intake Culvert — that's not on. That's not on at all.",
      "Say what you like about me now. I know what I saw.",
      "A packed pipe with no way out isn't a shelter, it's a kettle. Somebody should've known that before it went off.",
    ],
    lineIndex: 0,
    color: '#6b5240',
    accessories: [
      { type: 'prop', style: 'toolbelt' },
      { type: 'body', style: 'wary' },
    ],
    note: 'A dock foreman\'s toolbelt, plus a darker, tenser tone reflecting how shaken he was by the riot he witnessed.',
  },
  {
    id: 'sisterbramble', name: 'Sister Bramble', group: 'political', species: 'mouse',
    col: 3, row: 11,
    lines: [
      "I was there the night it turned. It wasn't wickedness, it was despair with nowhere left to go. Doesn't make it less frightening.",
      "We'd had complaints about that Culvert for months. Nobody funded the fix. Now everyone's very interested indeed.",
      "The Rat God doesn't ask which side of the river you were born on. I try to follow His example, on the days I've got the energy for it.",
    ],
    lineIndex: 0,
    color: '#6a5a68',
    accessories: [
      { type: 'hat', style: 'hood', color: '#5a4a58' },
      { type: 'body', style: 'droopy' },
    ],
    note: 'A church hood (echoing the Church of the Rat God\'s purple, muted down) and a tired, drooping posture — sympathy fatigue, not anger. Drawn as a mouse: she volunteers at the Intake Culvert because she has a stake in it, not out of detached charity.',
  },
  {
    id: 'fenwicket', name: 'Fen Wicket', group: 'political', spriteAsset: 'fenwicket',
    // Combat test dummy (see COMBAT_DESIGN.md). `talkFightMode: 'independent'`
    // means his Talk and Fight options never affect each other — this is
    // his own per-NPC setting, not a hardcoded rule for every fightable NPC.
    fightable: true, talkFightMode: 'independent',
    // Shown on the Debate confirmation screen (§8) before the battle
    // actually starts -- his opening position, stated plainly, so the
    // player knows what they're about to argue against.
    battleOpinion: 'These boat crossings are never justified. The Mice are just putting all of us in danger!',
    col: 14, row: 11,
    lines: [
      "They come across on whatever floats. Bottle crates, half a shoe, once a rat came over on what I'm fairly sure was a biscuit tin lid.",
      "I've fished three mice out of the current this year. Alive, thank goodness, all three. Doesn't mean the next one goes the same way.",
      "There's a perfectly good bridge forty yards from where most of them go in. I don't know why they don't use it. I expect I do know, actually. I just don't like saying it.",
    ],
    lineIndex: 0,
    color: '#5c6a68',
    accessories: [
      { type: 'body', style: 'damp' },
      { type: 'pin', style: 'tollcoin', color: '#9c9060' },
    ],
    note: 'Now uses a hand-drawn 38x32 sprite (assets/fenwicket-sprite.png -- pre-resized offline from a 1024x1024 AI-generated source via Lanczos + a light sharpen pass, background removed) instead of the procedural rat body -- a tubby, hunched, chip-on-his-shoulder look that fits his "I know why but I don\'t like saying it" weariness. Accessories/body treatments no longer apply since the image is the whole sprite. 38x32 (not the source\'s native size, and not the first size tried -- an initial 29x24 downscale lost whisker/paw detail entirely) is the smallest size that keeps ears, eye, whiskers, and paw shape legible at both his overworld scale and the battle screen\'s 58px CSS width.',
  },
  {
    id: 'dredge', name: 'Dredge', group: 'political',
    col: 16, row: 19,
    lines: [
      "Bridge is right there. Toll's four scraps. I paid it. Everyone can pay it.",
      "Funny how it's always a tragedy right up until someone suggests they use the bridge like the rest of us.",
      "Not saying send 'em back. Saying there's a queue, and I stood in it, and it wasn't fun for me either.",
    ],
    lineIndex: 0,
    color: '#6a5c4a',
    accessories: [
      { type: 'hat', style: 'flatcap' },
      { type: 'body', style: 'damp-light' },
    ],
    note: 'Only lightly damp (he stays on the bridge, not in the water) and a harder-edged flat cap — resentment, not sympathy.',
  },
  {
    id: 'pembertonvole', name: 'Mrs. Pemberton-Vole', group: 'political',
    col: 27, row: 4,
    lines: [
      "Well, I shan't name the shop, but there's a cheese emporium by the Shopping District that's sold suspiciously little cheese for a place with quite so many customers.",
      "They say the same fellow arranges 'crossings' for a fee, if you follow. Dreadful business. I heard it over sherry, obviously, so do take it with a pinch of salt.",
      "One simply repeats what one hears. It isn't gossip if it's concerning, is it.",
    ],
    lineIndex: 0,
    color: '#8a7268',
    accessories: [
      { type: 'eyewear', style: 'monocle' },
      { type: 'prop', style: 'bundle', color: '#5a4a3a' },
    ],
    note: 'Opera-glasses monocle for the gossip, and a small suspicious wrapped bundle — the exact thing she claims to have merely heard about.',
  },
  {
    id: 'marsh', name: 'Marsh', group: 'political',
    col: 3, row: 1,
    lines: [
      "Twenty years! Marvellous. Meanwhile half the town's arguing about a shelter fire and nobody's fixed the Culvert roof.",
      "Bunting doesn't paper over a crack. Well — it can, actually, if you've got enough bunting. That seems to be the plan.",
      "Happy anniversary to us. Let's hang some flags and not discuss any of it.",
    ],
    lineIndex: 0,
    color: '#5c5c48',
    accessories: [
      { type: 'pin', style: 'ribbon-crumpled' },
    ],
    note: 'Wears the anniversary ribbon, but crooked and crumpled — disgust, not pride, distinguishing him from Nutkin\'s straight one.',
  },
  {
    id: 'wetherby', name: 'Wetherby', group: 'political',
    col: 9, row: 2,
    lines: [
      "Between us — and I do mean between us — His Worship didn't jump so much as get a firm nudge from his own back benches.",
      "Some say good riddance, the sewage contracts wanted looking at anyway. Others are furious — say he was hounded out over nothing worse than bad timing.",
      "I couldn't possibly comment on who leaked the minutes. I will say I typed them, and I know my own typeface.",
    ],
    lineIndex: 0,
    color: '#787870',
    accessories: [
      { type: 'eyewear', style: 'spectacles' },
      { type: 'prop', style: 'newspaper', color: '#6a6a60' },
    ],
    note: 'Clerk\'s spectacles (not a monocle — he\'s office staff, not gentry) and the rolled minutes he "typed himself."',
  },
  {
    id: 'nettle', name: 'Corporal Nettle', group: 'political',
    col: 25, row: 11,
    lines: [
      "Half my unit's rations are going to 'the war effort' now. What war effort. I've never seen a cockroach in my life.",
      "They say it's solidarity. Feels like a tax with extra steps.",
    ],
    lineIndex: 0,
    color: '#6a7052',
    accessories: [
      { type: 'neck', style: 'sash', color: '#4a5a3a' },
      { type: 'body', style: 'wary-light' },
    ],
    note: 'Plain green webbing strap (active low-rank, not Nutkin\'s braided officer sash) and a mild, weary tension from the tithes he resents.',
  },
  {
    id: 'barrygutt', name: 'Barry Gutt', group: 'political',
    // Near the player's spawn (createPlayer(5, 6) in save.js) so he's one
    // of the very first rats a new player meets. col 8 (not 6) specifically
    // because Nutkin's unusually long name ("Colonel Bartholomew Nutkin")
    // still collides with Barry's label at only a 2-tile gap -- measured
    // via the game's actual label font/padding (10px monospace, drawLabel's
    // +3px box padding in rendering.js): at col 6 the two label boxes
    // overlap by ~50px; col 8 clears Nutkin's box by ~14px. Same underlying
    // pattern as the Nora Sopwell/Barry Trench label fix, just needing a
    // wider gap here since Nutkin's title-heavy name is much longer than
    // either of theirs.
    col: 8, row: 6,
    lines: [
      "Yeah, I voted Ratxit. What's it to you?",
      "Mayor made a mess of it, of course. Time to get Terry in. He'll sort it out.",
      "Rat Land should be for the rats. Don't like it, scurry back to where you came from.",
      "Rat Land. It's in the name, see? It's not hard.",
    ],
    lineIndex: 0,
    color: '#c8342a',
    accessories: [
      { type: 'prop', style: 'newspaper', color: '#e0d8b8' },
    ],
    note: 'A bold, saturated red found nowhere else in the (deliberately muted) rat palette — he\'s meant to stand out, not blend in with the crowd near spawn. Carries a rolled newspaper like Wetherby\'s, but louder — his own paper, not the clerk\'s quiet minutes. Dialogue-only for now (see NPC_DIALOGUE.md): planned to become fightable once combat content is scaled beyond the Fen Wicket test case.',
  },

  // --- Group 2: ordinary rats ---
  {
    id: 'doreen', name: 'Doreen', group: 'ordinary',
    col: 19, row: 6,
    lines: [
      "Damp again today. Mind you, it's always damp. I mean proper wet-through damp.",
      "Saved you the good crusts, love — oh, not you, I meant the fella behind you. But you can have one too.",
    ],
    lineIndex: 0,
    color: '#9c7a52',
    accessories: [
      { type: 'neck', style: 'apron', color: '#7a5a3a' },
      { type: 'prop', style: 'crust', color: '#c9a878' },
    ],
    note: 'Café apron, and a crust held out mid-offer — she\'s always in the middle of giving one away.',
  },
  {
    id: 'sooty', name: 'Sooty', group: 'ordinary',
    col: 21, row: 11,
    lines: [
      "Outfall Rovers put four past Sump on Sunday. Four!",
      "Excuses are the only thing Sump's any good at collecting these days.",
    ],
    lineIndex: 0,
    color: '#4a4a46',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#3a3a38' },
    ],
    note: 'Soot-dark fur with a matching dark team scarf — Outfall Rovers.',
  },
  {
    id: 'chalky', name: 'Chalky', group: 'ordinary',
    col: 21, row: 14,
    lines: [
      "Against ten rats and a ref who couldn't see past his own whiskers.",
    ],
    lineIndex: 0,
    color: '#b8b4a8',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#d8d4c8' },
    ],
    note: 'Chalk-pale fur with a matching pale scarf — Big Sump United.',
  },
  {
    id: 'oldfenwick', name: 'Old Fenwick', group: 'ordinary',
    col: 25, row: 8,
    lines: [
      "Cheddar's up again. At this rate we'll be back to gnawing candle stubs.",
      "Used to get a whole rind for tuppence. Now they charge you to look at it.",
    ],
    lineIndex: 0,
    color: '#9c8868',
    accessories: [
      { type: 'prop', style: 'walkingstick' },
      { type: 'prop2', style: 'cheese', color: '#e0c880' },
    ],
    note: 'Elderly walking stick, and a clutched wedge of cheese he\'s busy complaining about the price of.',
  },
  {
    id: 'scrapgrumbler', name: 'The Scrap Grumbler', group: 'ordinary',
    col: 22, row: 8,
    lines: [
      "Bottle caps are through the floor. Through the floor! And I've got a whole hoard of the things.",
      "Man down the shopping district offered me half what he did last spring. Half!",
    ],
    lineIndex: 0,
    color: '#8a8a80',
    accessories: [
      { type: 'prop', style: 'bag', color: '#6a6a60' },
    ],
    note: 'A shopping bag stuffed with the bottle-cap hoard he won\'t stop talking about.',
  },
  {
    id: 'countrysidedreamer', name: 'The Countryside Dreamer', group: 'ordinary',
    col: 6, row: 14,
    lines: [
      "Sometimes I dream about grass. Actual grass. Not the mossy sort — the proper green kind, up top.",
      "They say there's a garden two streets over with real soil. I'm saving my scraps for the trip.",
    ],
    lineIndex: 0,
    color: '#7a8268',
    accessories: [
      { type: 'pin', style: 'leaf' },
    ],
    note: 'A single leaf sprig tucked behind the ear — the closest he gets to the surface most days.',
  },
  {
    // Placeholder names for the full character redesign — was "Rat A
    // (weather)". Linked to Barry via `pairId`: a single Talk interaction
    // targets both together and cycles the shared exchange in
    // RatLand.NPC_PAIRS.weatherpair rather than her own independent lines.
    id: 'nora', name: 'Nora Sopwell', group: 'ordinary', pairId: 'weatherpair',
    col: 21, row: 17, facing: 'right', // faces Barry, across the gap tile between them
    color: '#8a8a82',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#6a6a5c' },
    ],
    note: 'Plain damp-weather scarf, nothing more — the straight man in the exchange. Placed a tile apart from Barry Trench, facing him, so they read as two rats mid-conversation rather than a single blob standing shoulder to shoulder.',
  },
  {
    // Placeholder name — was "Rat B (weather)". See Nora's note on pairId.
    id: 'barry', name: 'Barry Trench', group: 'ordinary', pairId: 'weatherpair',
    col: 23, row: 17, facing: 'left', // faces Nora
    color: '#8a7c6a',
    accessories: [
      { type: 'prop', style: 'dripgauge', color: '#5a5a52' },
    ],
    note: 'Carries the drip gauge he\'s inordinately proud of.',
  },
  {
    id: 'queuecomplainer', name: 'The Queue Complainer', group: 'ordinary',
    col: 18, row: 2,
    lines: [
      "Twenty minutes for a coffee-rind and a nibble. Twenty minutes!",
      "Whole town's queuing for something these days. Queuing's basically our national pastime.",
    ],
    lineIndex: 0,
    color: '#6a7876',
    accessories: [
      { type: 'prop', style: 'bag', color: '#5a6a68' },
    ],
    note: 'A little coffee-rind bag, clutched while waiting — and waiting.',
  },
  {
    id: 'allotmentbragger', name: 'The Allotment Bragger', group: 'ordinary',
    col: 4, row: 17,
    lines: [
      "My moss patch took Best in Show at the tunnel fair. Third year running.",
      "Secret's compost. Don't let anyone tell you otherwise.",
    ],
    lineIndex: 0,
    color: '#6a7a5a',
    accessories: [
      { type: 'pin', style: 'moss' },
    ],
    note: 'Prize moss worn proudly like a medal.',
  },
  {
    id: 'paradegossip', name: 'The Parade Gossip', group: 'ordinary',
    col: 6, row: 1,
    lines: [
      "Twenty years! Can you believe it. They're doing bunting all down Main Street.",
      "I heard the Mayor's ordering a whole new sash for the occasion. Velvet, apparently.",
    ],
    lineIndex: 0,
    color: '#9c8478',
    accessories: [
      { type: 'pin', style: 'bunting' },
    ],
    note: 'Tiny bunting flags — excited about the anniversary decorations specifically, nothing political.',
  },
  {
    id: 'bindaygrumbler', name: 'The Bin Day Grumbler', group: 'ordinary',
    col: 18, row: 14,
    lines: [
      "Scrap collection's moved again. Third time this year. Nobody tells you anything round here.",
      "I had a perfectly good bottle cap out for collection Tuesday. Still there Friday. Tragic.",
    ],
    lineIndex: 0,
    color: '#7c7266',
    accessories: [
      { type: 'prop', style: 'toolbelt', color: '#5a4a3a' },
    ],
    note: 'A battered toolbelt for a schedule that never holds.',
  },

  // --- Outsider ---
  {
    // Standing on the west bank facing straight into the river (col 13 is
    // the last dry tile before RIVER_COL_START at 14 -- see map.js).
    // Three lines, each deliberately long enough to span exactly 3 pages
    // under the dialogue box's pagination system (js/main.js) -- this
    // character exists specifically to exercise that system end to end:
    // page 1 (next-only), page 2 (both arrows + "2/3"), page 3 (prev-only).
    // Line lengths are calibrated to the CURRENT
    // DIALOGUE_MAX_CHARS_PER_PAGE (140): ~355-370 characters greedy-splits
    // to exactly 3 pages. If that budget changes, retrim these (the
    // dialogue-layout test asserts the 3-page property).
    id: 'crazyjoe', name: 'Crazy Joe', group: 'mouse', species: 'mouse',
    col: 13, row: 6, facing: 'right',
    lines: [
      "Ohhh no no no, see, the thing is, the THING is, nobody ever asks the drain what it wants, do they, 'course not, 'cause the drain can't talk, 'cept it can, it talks to ME, every night, and it says, Joe, Joe old son, have another one, and honestly? Who am I to argue with a drain. Who among us, I ask you, standing here, on this bank, with this hat, which isn't even mine.",
      "Bit of string. Half a biscuit. Somebody's shoe, just the one, tragic really. A cloud shaped like my aunt. Not the nice aunt. The other one. Three pebbles that looked at me funny, I clocked them, don't think I didn't. A very serious beetle, late for something important. My reflection, but it blinked first, which isn't right, and frankly I've had about enough of it.",
      "PIGEONS. PIGEONS, RIGHT, LISTEN TO ME, THEY'RE NOT BIRDS, THEY'RE COUNTING US, THEY'VE BEEN COUNTING US SINCE THE BRIDGE WENT UP, ONE LOOKED ME DEAD IN THE EYE ON TUESDAY AND I HAVEN'T SLEPT SINCE, NOT ONE WINK, YOU THINK THAT'S FUNNY, NOBODY'S LAUGHING WHEN THE NUMBERS COME DUE, ARE THEY, I DIDN'T THINK SO, SO START WATCHING THE SKY LIKE THE REST OF US.",
    ],
    lineIndex: 0,
    color: '#7a7488',
    accessories: [
      { type: 'prop', style: 'bundle', color: '#4a4a44' },
    ],
    note: 'A dulled, unwashed grey-purple and a clutched bundle (his one worldly possession, never specified further) -- lives on the riverbank, not part of any group\'s politics, and exists to be a self-contained pagination stress-test as much as a character.',
  },
  {
    id: 'kevin', name: 'Kevin', group: 'mouse', species: 'mouse',
    col: 21, row: 3,
    lines: [
      "Colonel Nutkin tips his hat to me every morning — right before asking when I'm 'heading back.' Lovely manners. Terrible math. I was born on Culvert Street.",
      "Doreen saves me the good crusts down the Café. Reckons a mouse who queues properly is alright by her. That's about the whole of it, really.",
    ],
    lineIndex: 0,
    color: '#9a92a0',
    accessories: [],
    note: 'Drawn with the separate mouse silhouette (bigger, forward-set ears, pointed snout, smaller frame) in a cool lavender-grey found nowhere in the rat palette — an outsider by design, not just by color.',
  },
];
