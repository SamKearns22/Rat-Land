// npc.js — the Town Crier, a static NPC posted outside Rat Town Hall.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.townCrier = {
  name: 'Town Crier',
  // Repositioned to the right of Rat Town Hall's relocated door (4,3);
  // the building's own footprint now covers (5,3), so "right of the
  // door" lands just past its east edge, at (6,3) -- Town Hall's own
  // former anchor tile, now open ground.
  col: 6,
  row: 3,
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
    speakerNames: { nora: 'Nora Sopwell', barry: 'Nivvey Trench' },
    lines: [
      { speaker: 'barry', text: "Love, don't be out there pretending like you aren't snacking with the girls at the office. Every day is cake day in there." },
      { speaker: 'nora', text: "What do you mean, I eat too much? You can't just say that to a girl! Besides, you're the one who does all the cooking!" },
      { speaker: 'nora', text: "I'm not sure you realise how horrible you're being." },
      { speaker: 'barry', text: "No, I'm perfectly aware, love." },
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

// NPCs used to block their *entire* 32px tile (same granularity as a
// wall), which was noticeably heavy-handed: a single NPC standing on a
// path -- and every path in Rat Land is exactly one tile wide -- fully
// closed it, and the player's own 22px box couldn't graze past an NPC
// standing one tile off to the side either, since any corner landing on
// that NPC's tile blocked the whole move. NPC collision is now a
// separate, smaller, continuous-position box (not tile-snapped) centered
// on each NPC's tile, checked by AABB overlap against the player's own
// box instead of by tile membership -- shrunk from the full 32px tile
// down to 18px (out of the player's 22px box, so full overlap still
// can't happen, but the player can pass within a few pixels of an NPC
// without being stopped a whole tile away). Wall/building/water
// solidity is untouched -- still tile-based via isSolidOverworldTile,
// wired separately in main.js's frame loop.
RatLand.NPC_HITBOX_SIZE = 18;

RatLand.npcHitbox = function (npc) {
  var ts = RatLand.TILE_SIZE;
  var hs = RatLand.NPC_HITBOX_SIZE;
  return {
    x: npc.col * ts + (ts - hs) / 2,
    y: npc.row * ts + (ts - hs) / 2,
    size: hs,
  };
};

// Cached once: no roster NPC ever changes col/row at runtime (all
// placement is static), so there's no need to recompute this every
// frame/collision-check.
RatLand._npcHitboxes = null;
RatLand.allNpcHitboxes = function () {
  if (!RatLand._npcHitboxes) {
    RatLand._npcHitboxes = [RatLand.townCrier].concat(RatLand.NPC_ROSTER).map(RatLand.npcHitbox);
  }
  return RatLand._npcHitboxes;
};

RatLand.isNpcBlockingBox = function (x, y, size) {
  var boxes = RatLand.allNpcHitboxes();
  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    if (x < b.x + b.size && x + size > b.x && y < b.y + b.size && y + size > b.y) return true;
  }
  return false;
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
    id: 'nutkin', name: 'Captain Aldus', group: 'political',
    col: 8, row: 7, // hand-marked map: green line, Church -> near The Gilded Rat's door
    lines: [
      "Twenty years since we drove out Grimmal and his ilk. We should never forget what it cost us to found Rat Land.",
      "Mind you, sometimes I look around and it's like he never left.",
      "Though, I will admit, no mouse could ever compare to Grimmal. One of a kind. The speed, the ferocity, the damn charisma. They don't make adversaries like they used to.",
      "I will never forget that day. I was young then, like you. The things I saw...",
      "Never take what you have for granted.",
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
    id: 'gristle', name: 'Grismond', group: 'political',
    col: 18, row: 18,
    lines: [
      "Shut the grate, stop the problem. Simple as.",
      "We don't want them here.",
      "Something's gotta be done.",
      "Twitchtails out.",
      "Thinking of going out there and meeting them up-river. I'd like to see them try get past me.",
      "It's common sense.",
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
    id: 'marguerite', name: 'Aurora Thistlewood-Vole', group: 'political',
    col: 9, row: 9,
    lines: [
      "One does wonder how some rats sleep at night with such hatred filling their burrows.",
      "Judging someone by the shape of their snout or the size of their ears is a sign of a deficient mind.",
      "I blame the schools, the parents, the media, the government and a long history of bloody-minded stupidity.",
      "Our war with the cockroaches is only going to push the mice back in our direction. You can always find Rat Land at the heart of its own woes.",
      "Have you even bothered to try mouse cuisine? Mouse poetry? No — of course you haven't.",
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
      "Ey mister, don't know of any jobs going, do ya?",
      "I wanna earn my keep but it's a tough old world right now. Hard to stay positive.",
      "I had a job once back in Mousika. Hauling crates. Somebody just give me a crate to haul!",
      "People always look at me funny here.",
      "My ma says we are where we're meant to be. Funny, she said that back in Mousika...",
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
    id: 'drainwatcher', name: 'Bill Arnold', group: 'political',
    col: 19, row: 12, // hand-marked map: green line, west bank -> near Rat School's bridge approach
    lines: [
      "Everyone complains, nobody does anything about it.",
      "The whole of Rat Land is a shouting match and everyone's losing.",
      "Vote for whoever you like. I'm voting for a nap.",
      "Don't come to me for solutions. I'm just some guy.",
      "We'll have a new mayor soon. Another enthralling period of nothing significant changing.",
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
    // hand-marked map: green line, sweeping down past Rat Shopping District.
    col: 23, row: 5, // 2nd revision: short green line, further west
    lines: [
      "Funny that nobody asks where the cheese comes from. Happy to eat it, not happy to ask questions.",
      "They want us angry at the mice so we aren't talking about the money. They want us distracted.",
      "Who is 'they'? I'm sorry, I'm not talking to a sheeple.",
      "Do your own research. The things they put into the run-off... I only drink bottled now.",
      "Trust no-one. I learned that from a podcast.",
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
    id: 'nangribble', name: 'Annabelle Drodd', group: 'political',
    col: 5, row: 10,
    lines: [
      "In my day the water was stagnant brown and we didn't make a fuss.",
      "This isn't our country anymore. Nothing works as it should. What's to be proud of?",
      "Before Mousika and Rat Land there was just 'the wet bit' and 'the wetter bit.'",
      "You walk down some streets around here and it's like you're in Mousika. They don't even bother speaking the language.",
      "Things were better when we could hang folk.",
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
    id: 'bramwell', name: 'Barney Bursk', group: 'political',
    col: 15, row: 3,
    lines: [
      "Twenty years ago, we kicked 'em out. Well, they're back now all right, and they're signing up for benefits.",
      "My sister went to Mousika and went native. Married some bloke up there. Well, it's her life...",
      "They say they are refugees — what refugee do you know has a MiPhone? Nonsense.",
      "I met my sister's husband once when they visited, proper bloke he is. Still, they aren't all like that, are they?",
      "Can't even speak to my daughter these days. Try to tell her some sense and she starts calling me a bigot. Who teaches them this stuff?",
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
    col: 11, row: 18, // 2nd revision: short green line, back north one tile
    lines: [
      "Nothing against them. Fine people, just different. But we're hardly drowning in good work.",
      "Half my crew are mice when there's rats homeless in the streets. Mind you, they were homeless before the mice came...",
      "Man's got to feed his kits. Call that what you want. At the end of the day, family before strangers.",
      "Don't resent their food coming over, mind you. They sure know their way around a wedge.",
      "The difference between a refugee and an economic migrant is one gullible idiot at river control. They'll believe anything if you put a sad enough face on.",
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
    id: 'wavering', name: 'Dod Sproggins', group: 'political',
    col: 18, row: 2, // 2nd revision: green line, further east along row 2
    lines: [
      "Sometimes I think it's best to shut the grate. Other times, I wonder what that says about us.",
      "Like, I know a bunch of them have drowned. But you can prevent that by not getting on a crisp packet in the first place.",
      "Honestly, I just nod along with whoever's talking. Saves an argument.",
      "My boss was saying some pretty nasty things the other day but I'm really fond of paying my rent. I just smiled and said 'yeah!' a lot.",
      "Who am I planning to vote for? Well, Terrance is the type of rat you could have a beer with... only I don't drink.",
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
    col: 14, row: 18, // hand-marked map: short green line, near Mouse Quarter's allotment
    lines: [
      "I've worked this river for years and I've never seen anything like what happened last week.",
      "Mice throwing things at police, police marching in on mice. Disgraceful.",
      "Shows they aren't assimilating. They don't understand our culture.",
      "If the mouse didn't want to be beaten, he shouldn't have committed a crime.",
      "I've been beaten plenty by police in my life. Don't see me causing a scene.",
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
    // Sprite switched to the rat pack per Sam's request (was species: 'mouse').
    id: 'sisterbramble', name: 'Sister Bramble', group: 'political',
    col: 3, row: 11,
    lines: [
      "We are understandably concerned about the shelter riots. It should never have gotten to that point.",
      "The house is a place of listening and healing. We welcome anybody who wants to unpack what they saw that day.",
      "The Rat God is sympathetic to all his creatures, even the ones who most definitely are not rats.",
      "We are not threatened by another place of worship in the city. The preacher there is a very nice man, whatever he believes.",
      "We have a service for the injured this Sunday. You are most welcome to come along.",
    ],
    lineIndex: 0,
    color: '#6a5a68',
    accessories: [
      { type: 'hat', style: 'hood', color: '#5a4a58' },
      { type: 'body', style: 'droopy' },
    ],
    note: 'A church hood (echoing the Church of the Rat God\'s purple, muted down) and a tired, drooping posture — sympathy fatigue, not anger.',
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
    // Overworld-only dialogue (per Sam's request, battleOpinion above is
    // untouched -- his battle/combat dialogue stays exactly as it was).
    lines: [
      "They come across on whatever floats. Bottle caps. Bits of wood. I saw a family come in on a turd!",
      "It is never safe to cross. Not safe for them, not safe for us. I have no sympathy for it.",
      "That's why we have the proper channels. So they don't have to swim down that one!",
      "Anyone who comes in like that, I'm sorry, they need to be turned around. It's not a matter for bleeding hearts.",
      "Nobody good is crossing like that. Trust me.",
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
    id: 'dredge', name: 'Giselle Tomiyak', group: 'political',
    // Moved from (16,19) to stay close to The Rusty Pipe's relocated
    // door -- beside its worn approach path (row 19), not blocking it.
    // North of the path rather than south: rows 21+ are the documented
    // danger zone for the south camera clamp overlapping the dialogue
    // box (see rendering.js's CAMERA_BOTTOM_UI_BAND comment) -- she's
    // also this project's standing south-clamp regression-test subject
    // (tests/check-dialogue-layout.js), so this isn't just theoretical.
    col: 22, row: 18,
    lines: [
      "I wasn't originally from this part of the network. I stood in line. I suffered years of scrutiny and checks. Who knew I needn't have bothered!",
      "You can just show up now: here's a home and some money, off you go.",
      "I've got nothing against anybody but the hypocrisy is galling.",
      "I came here with nothing. Nothing!",
      "I'm sorry. This subject really upsets me. I don't think I want to talk about it.",
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
    id: 'pembertonvole', name: 'Kathy Vole', group: 'political',
    // 3rd revision: green line, down toward Rat School.
    col: 19, row: 7,
    lines: [
      "Been hearing some interesting things about the smoke emporium in the shopping district.",
      "Apparently, the gentleman who runs it arranges crossings for a fee. Someone should arrange him some time in a cell.",
      "Illegal smokes, shady characters going in and out all the time. It's a disgrace.",
      "It's a disgrace all over at the moment. Happy Twentieth Birthday.",
      "Proof? My friend told me. And they're all doing it, aren't they?",
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
    id: 'marsh', name: 'Marsh Holsworth', group: 'political',
    // Moved from (3,1) -- Rat Town Hall's relocated sprite now visually
    // stands tall enough to occlude that tile from behind. One column
    // further west clears it while staying in the same spot otherwise.
    col: 2, row: 1,
    lines: [
      "Twenty years! Marvellous. Everyone's poor, there's a riot near the docks, everyone's at each other's throats, might as well throw a parade!",
      "And not a cheap parade, no! The whole shebang! Flags on everything! Flags attached to flags!",
      "I think we should all stand in a big circle amongst the rubbish and the boarded-up shops and sing the national anthem.",
      "To have national pride, you ought to have something to be proud of. But I guess that doesn't matter to most.",
      "I hope the new mayor cancels the whole thing and instead opens a pub that isn't wank.",
    ],
    lineIndex: 0,
    color: '#5c5c48',
    accessories: [
      { type: 'pin', style: 'ribbon-crumpled' },
    ],
    note: 'Wears the anniversary ribbon, but crooked and crumpled — disgust, not pride, distinguishing him from Nutkin\'s straight one.',
  },
  {
    id: 'wetherby', name: 'Otis Littlefoot', group: 'political',
    col: 9, row: 2,
    lines: [
      "You should've seen the old mayor's face when his own team voted him out. Looked like he was choking on a rind.",
      "Some say good riddance. To be honest, I say good riddance. But this constant turnover of leadership is no good for any of us.",
      "He never signed a contract without first ensuring that the people carrying out the work were a bunch of feckless oafs.",
      "I took the minutes that day. My favourite line: 'You bastards. You utter backstabbing bastards!'",
      "My feet aren't that little.",
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
    // hand-marked map: green line, south past The Rusty Pipe's east side.
    col: 25, row: 20,
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
    // Shifted east so he's beside the pub's door instead of standing
    // right in front of it. Row 9, not 8: (12,8) tied for closest-NPC at
    // the Crazy Joe pagination regression test's fixed talk-approach
    // tile (13,7) -- Chebyshev distance 1 from both -- and findTalkTarget
    // (js/npc.js) breaks distance ties by roster order, so Barry Gutt
    // (earlier in NPC_ROSTER) was silently stealing that Talk press
    // instead of Crazy Joe. One row further south clears the tie.
    col: 12, row: 9,
    // Name unchanged (no "New Name" given for him) -- dialogue only.
    lines: [
      "Yeah, I'm voting for Terry. What of it?",
      "Rat Land for the rats. Don't like it, scurry back to where you came from.",
      "Rat Land. It's in the name, see? It's not hard.",
      "Terry is the only one brave enough to do what needs to be done.",
      "Of course, saying that out loud makes you the bad guy. Guess I'm a bad guy then. Deal with it.",
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
    id: 'doreen', name: 'Doreen Chunderghast', group: 'ordinary',
    // 2nd revision: short green line, one tile west.
    col: 5, row: 13,
    lines: [
      "Isn't it damp out?",
      "I feel sorry for all those without a sturdy roof over their heads. I try and share what I can.",
      "I can feel it in my socks.",
      "Don't worry, I always carry spares.",
      "Me and the hubby are going to take a trip to the overworld soon. Catch some rays.",
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
    id: 'sooty', name: 'Sooty Lowes', group: 'ordinary',
    // 3rd revision: green line, north toward Rat School's side of the gap.
    col: 21, row: 8,
    lines: [
      "Culvert 6 West Vs Pipe 17 Rovers tonight. The Rusty's gonna be rammed.",
      "I think West has a chance of promotion this season. Say what you want about the mice, but they make them fast.",
      "Deni Layon. Sure, he's foreign. But he's paid to kick a ball, and boy does he kick it.",
      "I sponged too much on bets last season. I can't do that again this year.",
      "Can't resist putting a few cheeky wagers on, mind you.",
    ],
    lineIndex: 0,
    color: '#4a4a46',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#3a3a38' },
    ],
    note: 'Soot-dark fur with a matching dark team scarf — Outfall Rovers.',
  },
  {
    // Sprite switched to the mouse pack per Sam's request.
    id: 'chalky', name: 'Chalky Stubbs', group: 'ordinary', species: 'mouse',
    // 3rd revision: green line, west onto the main east-west road.
    col: 25, row: 12,
    lines: [
      "Here's a tip for you. If Lowes puts a gander on something, do the complete opposite.",
      "It's my get rich quick scheme.",
      "Rovers until I die. Considering the size of the kebab I plan to eat tonight, that might happen soon.",
      "The match can't come fast enough. My whiskers have never felt this dry.",
      "Honestly, I'm only in the mood to talk about slimeball.",
    ],
    lineIndex: 0,
    color: '#b8b4a8',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#d8d4c8' },
    ],
    note: 'Chalk-pale fur with a matching pale scarf — Big Sump United.',
  },
  {
    id: 'oldfenwick', name: 'Maisey Gray', group: 'ordinary',
    // 2nd revision, corrected: green line runs top-left to bottom-right
    // as a single diagonal, ending with a small leftward hook -- not a
    // checkmark back up into the nook (that was a second, separate line
    // crossing it, which belongs to a different NPC).
    col: 29, row: 12,
    lines: [
      "Have you seen the price of cheddar? It's enough to make you faint.",
      "We used to consider ourselves pretty middle class. Now we're shopping for discounts like everyone else.",
      "Still, got to have some creature comforts, don't you? Latest issue of Sump Beauty is out.",
      "Ten Tips To Make Your Rat's Back Arch. How about just walk into the room?",
      "I'm not sure my back has ever arched.",
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
    id: 'scrapgrumbler', name: 'Vinnie Sputtings', group: 'ordinary',
    col: 22, row: 11, // hand-marked map: green line, south towards Rat School's bridge approach
    lines: [
      "The best part about hauling scrap is that people pay you for tidying up.",
      "The worst part about hauling scrap is your body hurting all the time.",
      "Do you ever wonder where all the scrap we don't dredge to shore ends up? I bet it is a magical place.",
      "I had a dream I was diving into a massive pile of scrap. I had never felt so happy. Then I hit the pile and BOOM. Dead.",
      "A death worth dreaming about. I bloody love scrap.",
    ],
    lineIndex: 0,
    color: '#8a8a80',
    accessories: [
      { type: 'prop', style: 'bag', color: '#6a6a60' },
    ],
    note: 'A shopping bag stuffed with the bottle-cap hoard he won\'t stop talking about.',
  },
  {
    id: 'countrysidedreamer', name: 'Les Drainshaw', group: 'ordinary',
    // 2nd revision: the line crossing Maisey Gray's near Rat Gymnasium --
    // this is its other end, up into the building's east-side nook.
    col: 29, row: 10,
    lines: [
      "Keeping a garden in a sewer isn't for everyone. But little in this life is more rewarding.",
      "One day, I'll save up me pennies and go up top and see it all. Proper grass, proper flowers. That's the dream.",
      "Tell me, friend, have you ever sunk your paws into immaculate loam? I shudder just thinking about it.",
      "Who needs the sun to grow things when you have a can-do attitude?",
      "There's no way Otis grew that squash by himself. It floated down the tunnel, I'll bet my life on it.",
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
    // Nivvey (below) swapped to Nora's west side so he'd clear The Rusty
    // Pipe's relocated visual footprint -- Nora's own position and the
    // one-tile gap between them is unchanged, just facing flipped to
    // still face him.
    col: 21, row: 17, facing: 'left', // faces Nivvey, across the gap tile between them
    color: '#8a8a82',
    accessories: [
      { type: 'neck', style: 'scarf', color: '#6a6a5c' },
    ],
    note: 'Plain damp-weather scarf, nothing more — the straight man in the exchange. Placed a tile apart from Barry Trench, facing him, so they read as two rats mid-conversation rather than a single blob standing shoulder to shoulder.',
  },
  {
    // Placeholder id/comment — was "Rat B (weather)", display name now Nivvey
    // Trench. See Nora's note on pairId.
    // Moved from (23,17) to (19,17) -- The Rusty Pipe's relocated sprite
    // now visually occludes (23,17) from behind. Swapped to Nora's west
    // side instead of just shifting sideways, so the one-tile "facing
    // each other across a gap" relationship is preserved rather than
    // collapsed into standing shoulder to shoulder.
    id: 'barry', name: 'Nivvey Trench', group: 'ordinary', pairId: 'weatherpair',
    col: 19, row: 17, facing: 'right', // faces Nora
    color: '#8a7c6a',
    accessories: [
      { type: 'prop', style: 'dripgauge', color: '#5a5a52' },
    ],
    note: 'Carries the drip gauge he\'s inordinately proud of.',
  },
  {
    id: 'queuecomplainer', name: 'Emily Cricket', group: 'ordinary',
    // hand-marked map: short green line, one tile east.
    col: 21, row: 4,
    lines: [
      "I love waiting twenty minutes for a latte.",
      "It's my favourite thing to do.",
      "I think it's fine that they have one member of staff at peak hours.",
      "I love how every business does this now.",
      "She looks so stressed, bless her. I want to put her out of her misery.",
    ],
    lineIndex: 0,
    color: '#6a7876',
    accessories: [
      { type: 'prop', style: 'bag', color: '#5a6a68' },
    ],
    note: 'A little coffee-rind bag, clutched while waiting — and waiting.',
  },
  {
    // Re-themed from moss-gardening to TV-binge-watching -- the small
    // planter/moss scenery plot placed beside (4,17) last session no
    // longer matches this character's dialogue. Left in place (still
    // reads fine as generic yard dressing) since only dialogue/rename
    // changes were requested; flagged to Sam in case it should move or
    // change to fit Zippy's new theme.
    id: 'allotmentbragger', name: 'Zippy Shacks', group: 'ordinary',
    col: 7, row: 17, // hand-marked map: short green line, east past the path spine
    lines: [
      "The first season of Sewer Gods was when TV peaked.",
      "When Rattikan struck down the King of the Cockroaches in his own court? Out of nowhere? I vomited.",
      "Memes for days.",
      "You know what was better than season one of Sewer Gods? Season two of Sewer Gods.",
      "Shame about seasons three to twelve.",
    ],
    lineIndex: 0,
    color: '#6a7a5a',
    accessories: [
      { type: 'pin', style: 'moss' },
    ],
    note: 'Prize moss worn proudly like a medal.',
  },
  {
    id: 'paradegossip', name: 'Charlene Gray', group: 'ordinary',
    col: 6, row: 1,
    lines: [
      "Twenty years! Can you believe it? They're doing bunting all down main street.",
      "They're going to have floats depicting all the major moments of Rat Land history. I bet Grimmal's going to scare all the kits!",
      "I've asked my sister to get the good cheese in. Bugger the price.",
      "It ain't hard to be proud of one's own country on a day like today.",
      "I peed a little.",
    ],
    lineIndex: 0,
    color: '#9c8478',
    accessories: [
      { type: 'pin', style: 'bunting' },
    ],
    note: 'Tiny bunting flags — excited about the anniversary decorations specifically, nothing political.',
  },
  {
    id: 'bindaygrumbler', name: 'Archie Lott', group: 'ordinary',
    col: 18, row: 14,
    lines: [
      "I forgot to put the bins out and now the wife isn't texting back.",
      "I'd take aggressive over passive-aggressive any day.",
      "I'd take Grimmal ripping my face off over her particular brand of passive-aggressive.",
      "A shoulder massage will fix her. Always does.",
      "Oh shit. I didn't take the laundry out either.",
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
    id: 'kevin', name: 'Ken Choppings', group: 'mouse', species: 'mouse',
    // Moved from (21,3) -- his old tile now falls inside Rat Café's
    // relocated footprint (20,3)-(21,3) -- to (23,3), then moved again
    // when Rat Shopping District came up 2 tiles and its sprite's tall
    // visual box (not just its footprint) newly occluded (23,3) from
    // behind. One tile further east, past the building's east edge.
    col: 26, row: 3,
    lines: [
      "Why you staring at me, boss?",
      "Badman trying to get shanked?",
      "Big man staring contest?",
      "You pushing me? You pushing me, son?",
      "Y'know, you're alrite. We're good, boss.",
    ],
    lineIndex: 0,
    color: '#9a92a0',
    accessories: [],
    note: 'Drawn with the separate mouse silhouette (bigger, forward-set ears, pointed snout, smaller frame) in a cool lavender-grey found nowhere in the rat palette — an outsider by design, not just by color.',
  },
];
