// combat.js — turn-based "debate combat" against fightable NPCs.
// Implements COMBAT_DESIGN.md: pre-battle Talk/Debate menu with a Debate
// confirmation screen showing the NPC's opening opinion before the fight
// actually starts (§8/§25),
// enemy-first turn order (§3), Rhetoric/Consideration/Facts/Feelings (§4),
// Exposed (§4a/§27: Fen's Big Swing leaves him open to a doubled
// follow-up Fact for one attack), an instant-KO win condition (§5) — HP hitting 0
// always ends the fight immediately, no soft floor — with Fen's own
// heal-below-30%-HP reactive AI making a Fact+Feeling strategy
// practically necessary to close the fight out in reasonable time rather
// than hard-gated (§21/§24), the no-penalty loss state (§6),
// Reputation-on-win via the existing save system (§7), and a
// Pokémon-style battle screen layout (§9/§10): opponent panel on top
// (with Fen's overworld sprite, §20), player panel on the
// bottom-opposite corner, HP/Effort bars, always-visible R/C/Exposed
// status icons plus a tap-to-reveal "Fen's last move" icon (§21)
// (text/symbol only, tap for a plain-text explanation), a scrollable
// battle log (§21), and a 2x2 move grid with a select-then-confirm flow
// that previews a move's plain-text description before it's used,
// contextual/randomized battle dialogue (§11): a one-shot
// opening/finishing line per combatant, a unique first-use line for each
// Fact/Feeling, and a random 3-4 line pool for every repeat use
// (including all Rhetoric/Consideration uses), and a brief Pokémon-style
// wipe transition (§10) entering/exiting battle.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {

  // --- Test moveset (§13/§14 — explicitly TEST/THROWAWAY per the design doc) ---

  var PLAYER_START = { hp: 20, maxHp: 20, effort: 10, maxEffort: 10 };
  var FEN_START = { hp: 14, maxHp: 14, effort: 10, maxEffort: 10 };

  // Opening/finishing lines: one-shot flavor tied to battle start and to a
  // combatant's HP actually hitting 0 (not the soft-floor near-miss) --
  // independent of the per-move dialogue system below.
  var FEN_OPENING = 'Oh, here we go. Another one come to tell me how to think.';
  var FEN_FINISHING = '…fine. Fine! Maybe I’ve not thought it all the way through.';
  var PLAYER_OPENING = 'Right. Okay. I can do this.';
  var PLAYER_FINISHING = '…maybe he’s got a point, actually.';

  // Damage math shared by every move (§4a/§24/§27): start from the move's
  // flat base damage, add the attacker's own primed next-attack bonus if
  // one is pending (granted by a Feeling, consumed by this hit), then
  // double the total if the defender is Exposed *and* this hit is
  // specifically a Fact (§27) — Exposed is a general "make my opponent's
  // next well-reasoned point land harder" status, not a blanket
  // next-hit-doubler: a Rhetoric jab or a Feeling landed during the
  // window gets no bonus from it and the window is simply spent (still
  // cleared by upkeep's 1-turn expiry either way, whether or not a Fact
  // ever capitalized on it).
  function computeDamage(battle, atkSide, defSide, baseDamage, isFact) {
    var attacker = battle[atkSide];
    var defender = battle[defSide];
    var dmg = baseDamage;
    if (attacker.nextAttackBonus > 0) {
      dmg += attacker.nextAttackBonus;
      attacker.nextAttackBonus = 0;
    }
    if (defender.exposed && isFact) {
      dmg *= EXPOSED_MULTIPLIER;
      defender.exposed = false;
    }
    return Math.max(0, dmg);
  }

  // Fen's sprite (the only combatant sprite that exists -- player stays
  // text/stat-only until a player sprite exists) bounces forward on his own
  // move and flashes/shifts back when he takes damage. Both animations are
  // plain CSS (style.css), well under 0.5s; removing then re-adding the
  // class (with a forced reflow) lets a fast-repeating trigger restart
  // cleanly instead of no-op'ing because the class was already present.
  function triggerFenSpriteAnim(kind) {
    var el = document.getElementById('battle-sprite-enemy');
    if (!el) return;
    el.classList.remove('sprite-attack', 'sprite-hurt');
    void el.offsetWidth;
    el.classList.add(kind === 'attack' ? 'sprite-attack' : 'sprite-hurt');
  }

  // HP damage/heal flash (§23): mirrors the Effort regen-flash's structure
  // (battle-level transient state, read by renderBattleUI) but uses a
  // nonce, not a "did the displayed text change" comparison, to decide
  // whether to restart the pop animation. Damage/heal amounts repeat
  // constantly in practice (Rhetoric always deals the same 2 damage), and
  // a text-comparison retrigger -- the pattern renderRegenFlash uses --
  // would silently skip re-showing the flash whenever the same amount
  // lands twice in a row. Left renderRegenFlash itself untouched (this is
  // additive, not a fix to that one), but didn't want to copy a gap I'd
  // already spotted into new code that's going to hit it far more often.
  function recordHpFlash(battle, side, amount) {
    if (amount === 0) return;
    var f = battle.hpFlash[side];
    f.amount = amount;
    f.nonce += 1;
  }

  // The win condition (§5): a hit that reduces a combatant to 0 HP ends the
  // battle immediately, always — no soft floor, no Fact+Feeling requirement.
  // Applied symmetrically to both sides.
  function applyDamage(battle, atkSide, defSide, dmg) {
    if (dmg <= 0) return 0;
    if (defSide === 'enemy') triggerFenSpriteAnim('hurt');
    recordHpFlash(battle, defSide, -dmg);
    var defender = battle[defSide];
    var newHp = defender.hp - dmg;
    if (newHp <= 0) {
      defender.hp = 0;
      battle.outcome = atkSide;
      var finishLine = defSide === 'player' ? PLAYER_FINISHING : FEN_FINISHING;
      battle.log.push((defSide === 'player' ? 'You' : battle.npcName) + ': "' + finishLine + '"');
    } else {
      defender.hp = newHp;
    }
    return dmg;
  }

  function heal(battle, side, amount) {
    var c = battle[side];
    var before = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + amount);
    recordHpFlash(battle, side, c.hp - before);
  }

  // R and C build-up meters are capped at 10, same as Effort — previously
  // uncapped, which let them climb without bound over a long fight.
  var METER_CAP = 10;
  // Every visible mention of the R/C meters uses these icons instead of
  // the bare letters — mouth for R (Rhetoric build-up), brain for C
  // (Consideration build-up).
  var METER_SYMBOL = { r: '👄', c: '🧠' };
  // Big Swing (§24, replacing the old Defence-stacking kit entirely):
  // deals a big hit and leaves Fen Exposed for one turn (a well-timed
  // Fact against him deals double damage — §27). §26 added an R cost on
  // top of its Effort cost (so Fen's R meter -- previously climbing with
  // nothing to spend it on -- has a real purpose again), and gave Fen a
  // second, smaller "Snipe" option so he isn't reduced to bare Rhetoric
  // in the gaps between Big Swings. See chooseFenMove for how these combine.
  var BIG_SWING_DAMAGE = 5;
  var BIG_SWING_EFFORT_COST = 9;
  var BIG_SWING_R_COST = 2;
  var EXPOSED_MULTIPLIER = 2;
  var SNIPE_DAMAGE = 3;
  // Costed at 8, not the original 4, after balance verification (§27):
  // at 4, Snipe was so cheap that giving it the same below-threshold
  // exception as Big Swing (needed so Fen ever gets a chance to bank
  // toward Big Swing at all, rather than being locked in a Consideration
  // loop that exactly cancels a single incoming hit) let him skip
  // healing almost entirely once low, which both made him easier to
  // grind down via flat attrition and raised his output enough to lose
  // the realistic-heuristic matchup. At 8, Snipe below threshold fires
  // only when Fen has meaningfully banked Effort, keeping healing the
  // clear default while still breaking up long identical-Consideration
  // stretches with real variety.
  var SNIPE_EFFORT_COST = 8;
  // Fen's reactive AI switches to pure self-heal once his own HP drops
  // below this fraction of his max (§24) — mirrors the same threshold the
  // human "heal when hurt" instinct naturally uses.
  var FEN_HEAL_THRESHOLD = 0.30;
  function gainMeter(battle, side, meter, amount) {
    var c = battle[side];
    c[meter] = Math.min(METER_CAP, c[meter] + amount);
  }

  // Ordered [Rhetoric, Actually, Consideration, Understand] rather than by
  // introduction order, so the 2x2 move grid pairs each basic move with the
  // special it fuels: top row is the damage track (Rhetoric feeds R, which
  // Actually spends), bottom row is the sustain track (Consideration feeds
  // C, which Understand spends).
  var PLAYER_MOVES = [
    {
      id: 'rhetoric', label: 'Rhetoric', type: 'basic', cost: null,
      dialogue: { pool: [
        'I just think… we should hear them out?',
        'That’s not — that’s not quite fair, is it?',
        'Um. I disagree, actually.',
        'I don’t think that’s right.',
      ] },
      description: 'Deals small damage and gives you 1 👄.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 2, false);
        applyDamage(battle, atk, def, dmg);
        gainMeter(battle, atk, 'r', 1);
      },
    },
    {
      id: 'actually', label: 'Fact: "Actually…"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: {
        firstUse: 'Actually — sorry, I looked this up — that’s not quite true.',
        pool: [
          'Actually, I think the numbers say otherwise.',
          'I checked, and, um, that’s not right.',
        ],
      },
      description: 'Bigger damage than Rhetoric. Costs 👄 + Effort. Capitalizes fully on an Exposed opponent (§27).',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, true);
        applyDamage(battle, atk, def, dmg);
      },
    },
    {
      id: 'consideration', label: 'Consideration', type: 'basic', cost: null,
      dialogue: { pool: [
        'Okay. Let me think about that.',
        '…huh. Fair enough.',
        'You might be right.',
        'I hadn’t thought of it like that.',
      ] },
      description: 'Heals yourself a little and gives you 1 🧠.',
      effect: function (battle, atk, def) {
        heal(battle, atk, 2);
        gainMeter(battle, atk, 'c', 1);
      },
    },
    {
      id: 'understand', label: 'Feeling: "I just want to understand"', type: 'feeling',
      cost: { meter: 'c', amount: 3, effort: 4 },
      dialogue: {
        firstUse: 'I’m not trying to score points. I just want to actually understand what you’re saying.',
        pool: [
          'Help me get why you see it that way.',
          'I’m listening, genuinely.',
          'Okay — walk me through it.',
        ],
      },
      description: 'Heals yourself and primes your next attack to deal +2 damage. Costs 🧠 + Effort.',
      effect: function (battle, atk, def) {
        heal(battle, atk, 3);
        battle[atk].nextAttackBonus = 2;
      },
    },
  ];

  var FEN_MOVES = [
    {
      id: 'fen-rhetoric', label: 'Rhetoric', type: 'basic', cost: null,
      dialogue: { pool: [
        'You’re not even listening to me!',
        'Typical.',
        'Here we go again.',
        'You always do this.',
      ] },
      description: 'Deals small damage to you and gives Fen 1 👄.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 2, false);
        applyDamage(battle, atk, def, dmg);
        gainMeter(battle, atk, 'r', 1);
      },
    },
    {
      id: 'fen-consideration', label: 'Consideration', type: 'basic', cost: null,
      dialogue: { pool: [
        '…alright, fair point.',
        '…s’pose that’s true.',
        'Hm. Didn’t think of it that way.',
        '…fine. Whatever.',
      ] },
      description: 'Heals Fen a little and gives him 1 🧠.',
      effect: function (battle, atk, def) {
        heal(battle, atk, 2);
        gainMeter(battle, atk, 'c', 1);
      },
    },
    {
      id: 'big-swing', label: 'Big Swing', type: 'fact',
      cost: { meter: 'r', amount: BIG_SWING_R_COST, effort: BIG_SWING_EFFORT_COST },
      dialogue: {
        firstUse: 'You want to talk about danger? Half of Mouse Land’s out there right now, bobbing about on a Wotsit packet!',
        pool: [
          'One went across on a flip-flop last week. A flip-flop!',
          'They say it’s a human rights issue. I say it’s a buoyancy issue.',
          'Nobody voted for the sewer to become a shipping lane.',
          'If cheese wrappers can hold three mice and a dream, that’s not immigration policy, that’s a design flaw.',
        ],
      },
      description: 'Big damage. Costs 👄 + Effort. Leaves Fen Exposed for 1 turn: your next Fact against him deals double damage.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, BIG_SWING_DAMAGE, true);
        applyDamage(battle, atk, def, dmg);
        // Exposed is only earned when Fen swings from a position of
        // strength (§26) -- when this fires as the below-threshold
        // override instead (chooseFenMove), he's already at his most
        // vulnerable, and leaving him *also* Exposed there would hand
        // any attack (not just a well-timed Fact) a free lethal
        // follow-up on a basics-only-reachable state. The desperate
        // low-HP swing still lands its damage; it just doesn't leave him
        // doubly open the way a swing from strength does.
        if (battle[atk].hp >= battle[atk].maxHp * FEN_HEAL_THRESHOLD) {
          battle[atk].exposed = true;
        }
      },
    },
    {
      id: 'snipe', label: 'Snipe', type: 'fact', cost: { effort: SNIPE_EFFORT_COST },
      dialogue: {
        firstUse: 'Oh, don’t give me that look.',
        pool: [
          'Just saying it how it is.',
          'Somebody’s got to.',
          'Don’t act so surprised.',
        ],
      },
      description: 'Small hit. Costs Effort only, no meter.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, SNIPE_DAMAGE, true);
        applyDamage(battle, atk, def, dmg);
      },
    },
  ];

  var PLAYER_MOVES_BY_ID = {};
  PLAYER_MOVES.forEach(function (m) { PLAYER_MOVES_BY_ID[m.id] = m; });

  function canAfford(battle, side, move) {
    var c = battle[side];
    if (!move.cost) return true;
    if (move.cost.meter === 'r' && c.r < move.cost.amount) return false;
    if (move.cost.meter === 'c' && c.c < move.cost.amount) return false;
    if (move.cost.effort && c.effort < move.cost.effort) return false;
    return true;
  }

  function payCost(battle, side, move) {
    var c = battle[side];
    if (!move.cost) return;
    if (move.cost.meter === 'r') c.r = Math.max(0, c.r - move.cost.amount);
    if (move.cost.meter === 'c') c.c = Math.max(0, c.c - move.cost.amount);
    if (move.cost.effort) c.effort = Math.max(0, c.effort - move.cost.effort);
  }

  // Picks which line a move says this time (§11 dialogue structure): the
  // unique `firstUse` line the first time *this specific combatant* casts
  // *this specific move*, falling back to a random pick from `pool` every
  // time after (including always, for moves with no firstUse -- Rhetoric
  // and Consideration only ever have a pool, no distinguished first line).
  function pickMoveDialogue(battle, atkSide, move) {
    var combatant = battle[atkSide];
    var d = move.dialogue;
    if (d.firstUse && !combatant.dialogueUsed[move.id]) {
      combatant.dialogueUsed[move.id] = true;
      return d.firstUse;
    }
    return d.pool[Math.floor(Math.random() * d.pool.length)];
  }

  // Which SFX category a move belongs to, for RatLand.playSfx (js/audio.js):
  // Facts/Feelings map directly off their type; Rhetoric/Consideration are
  // both type 'basic' so they're told apart by id (works for both the
  // player's and Fen's versions of each, e.g. 'rhetoric'/'fen-rhetoric').
  function sfxKeyForMove(move) {
    if (move.type === 'fact') return 'fact';
    if (move.type === 'feeling') return 'feeling';
    if (move.id.indexOf('rhetoric') !== -1) return 'rhetoric';
    if (move.id.indexOf('consideration') !== -1) return 'consideration';
    return null;
  }

  // Resolves one move: pays its cost, logs its dialogue, then runs its
  // numeric effect.
  function useMove(battle, atkSide, defSide, move) {
    payCost(battle, atkSide, move);
    var speaker = atkSide === 'player' ? 'You' : battle.npcName;
    var line = pickMoveDialogue(battle, atkSide, move);
    battle.log.push(speaker + ': "' + line + '"');
    if (RatLand.playSfx) RatLand.playSfx(sfxKeyForMove(move));
    if (atkSide === 'enemy') {
      triggerFenSpriteAnim('attack');
      // Auto-reveal (§22): what Fen's move just did is logged automatically,
      // no tap required -- previously this only showed via a tap-to-reveal
      // status icon, which is removed now that this is unmissable in the
      // log. move.description is written from the player's perspective
      // already (e.g. "gives Fen 1 👄"), so it reads fine as a plain
      // follow-up line under his dialogue.
      battle.log.push('(' + move.label + ' — ' + move.description + ')');
    }
    move.effect(battle, atkSide, defSide);
  }

  // Fen's AI (§24/§26, replacing the old scripted turn-window pattern
  // entirely): purely reactive, no scripted turn numbers, no
  // once-per-battle gating, no held-back/no-op turns.
  //
  // Below FEN_HEAL_THRESHOLD, healing is still the default -- but if he
  // has enough R and Effort banked specifically for Big Swing, he takes
  // that over healing (§26): occasional aggression breaking through his
  // own defensive posture when the opportunity is actually there, not a
  // scheduled pattern layered on top of the heal-priority rule. Snipe
  // gets the same exception, at its higher §27 cost -- without it, Fen's
  // own heal exactly cancels a single incoming hit near the threshold in
  // practice, locking him into Consideration indefinitely (he re-evaluates
  // from *already below* threshold every round) with no variety and no
  // chance to ever bank toward Big Swing. An earlier attempt gave Snipe
  // this exception at its original, cheaper cost and it backfired -- Fen
  // stopped healing almost entirely once low (cheap Snipe nearly always
  // affordable), which both let flat attrition grind him down faster than
  // intended and raised his output enough to flip realistic play from a
  // win into a loss. Costing Snipe higher keeps healing the clear
  // default while still breaking up long identical-Consideration
  // stretches. Above the threshold, Big Swing again comes first when
  // affordable, then Snipe as the lightweight aggressive option for the
  // gaps between Big Swings, falling back to bare Rhetoric only when
  // neither is affordable.
  function chooseFenMove(battle) {
    var e = battle.enemy;
    var bigSwing = FEN_MOVES[2];
    var snipe = FEN_MOVES[3];
    if (e.hp < e.maxHp * FEN_HEAL_THRESHOLD) {
      if (canAfford(battle, 'enemy', bigSwing)) return bigSwing;
      if (canAfford(battle, 'enemy', snipe)) return snipe;
      return FEN_MOVES[1]; // Consideration
    }
    if (canAfford(battle, 'enemy', bigSwing)) return bigSwing;
    // Snipe never competes with actually banking toward the next Big
    // Swing -- if R is still short of Big Swing's cost, Rhetoric (the
    // only thing that builds it) takes priority; Snipe only fills the
    // gap once R is already banked and Effort is the sole thing being
    // waited on, which is the "resource-constrained" case it's meant for.
    if (e.r < BIG_SWING_R_COST) return FEN_MOVES[0]; // Rhetoric
    if (canAfford(battle, 'enemy', snipe)) return snipe;
    return FEN_MOVES[0]; // Rhetoric
  }

  function runEnemyTurn(battle) {
    if (battle.outcome) return;
    var move = chooseFenMove(battle);
    // Defensive backstop for the enemy affordability rule (§22): even
    // though chooseFenMove above is verified to only ever pick a move it
    // can currently pay for, this guards against a future enemy's AI
    // having a bug in its own equivalent function, rather than trusting
    // every future chooseXMove implementation to get it right. Fen's own
    // fallback (fen-rhetoric) has no cost, so it's always affordable.
    if (!canAfford(battle, 'enemy', move)) {
      move = FEN_MOVES[0];
    }
    useMove(battle, 'enemy', 'player', move);
  }

  // --- Vague enemy-intent hint (§22) ---------------------------------------
  // Shown at the start of each player turn: a category-level hint of the
  // enemy's likely next move (Fact/Feeling/basic), never the exact move
  // name, and never a hint at what to actually DO about it -- winning
  // strategy stays for the player to discover. Reusable for any future
  // enemy: pass its own display name and move-choosing function (already
  // required for its turn logic) and, optionally, its own hint-phrase
  // pools; defaults to a generic basic/fact/feeling phrasing otherwise.
  // Calling chooseMoveFn here is a pure preview (it doesn't mutate battle
  // state) of the *exact same* function that will actually pick the move
  // on the enemy's next turn, so the hint's category is always accurate
  // and -- critically -- always about a move that enemy can currently
  // afford, since chooseFenMove (and runEnemyTurn's backstop) never
  // returns anything else.
  var DEFAULT_INTENT_HINT_POOLS = {
    basic: ['seems to be just deflecting.', 'looks like he’s stalling for time.'],
    fact: ['looks like he’s gathering a comeback.', 'seems to be marshalling an argument.'],
    feeling: ['seems to be getting worked up.', 'looks like his feelings are rising.'],
  };

  function buildEnemyIntentHint(battle, npcName, chooseMoveFn, hintPools) {
    var pools = hintPools || DEFAULT_INTENT_HINT_POOLS;
    var nextMove = chooseMoveFn(battle);
    if (!nextMove) return '';
    var pool = pools[nextMove.type] || pools.basic;
    return npcName + ' ' + pool[Math.floor(Math.random() * pool.length)];
  }

  function updateIntentHint(battle) {
    battle.intentHint = battle.outcome ? '' : buildEnemyIntentHint(battle, battle.npcName, chooseFenMove);
  }

  // Regen flash (§22): recorded here (not hardcoded "+2" in the UI) so a
  // future move that changes a combatant's regen rate still shows the
  // right number -- reads effortRegenRate off each combatant rather than
  // a single global constant. battle.regenFlash holds the *actual* amount
  // each side's Effort just grew by (0 if already at max), which
  // renderBattleUI displays as a transient "+N" next to each Effort bar.
  function upkeep(battle) {
    var playerBefore = battle.player.effort;
    battle.player.effort = Math.min(battle.player.maxEffort, battle.player.effort + battle.player.effortRegenRate);
    var enemyBefore = battle.enemy.effort;
    battle.enemy.effort = Math.min(battle.enemy.maxEffort, battle.enemy.effort + battle.enemy.effortRegenRate);
    battle.regenFlash = {
      player: battle.player.effort - playerBefore,
      enemy: battle.enemy.effort - enemyBefore,
    };
    // Exposed/Primed genuinely last "for 1 turn" (§26): each is granted on
    // one side's move and is available through the other side's very next
    // move, then expires here regardless of whether it was ever used --
    // upkeep runs right after the player's move and before Fen's, so this
    // is exactly one player-turn opportunity per grant. Without this, an
    // unused window would persist indefinitely (until whenever an attack
    // eventually lands), letting a patient player delay and stockpile
    // resources before cashing in an old exposure rather than actually
    // reacting to it -- confirmed exploitable by a basics-only search
    // before this was added.
    battle.player.exposed = false;
    battle.enemy.exposed = false;
    battle.player.nextAttackBonus = 0;
    battle.enemy.nextAttackBonus = 0;
    battle.turn += 1;
  }

  function freshCombatant(stats) {
    return {
      hp: stats.hp, maxHp: stats.maxHp, effort: stats.effort, maxEffort: stats.maxEffort,
      effortRegenRate: 2, // standard regen/turn (§22) -- read here, not hardcoded, so a
                          // future move that alters it is reflected automatically
      r: 0, c: 0,
      exposed: false, // §24: granted by Big Swing, consumed by the next attack against this combatant
      nextAttackBonus: 0, // §24: granted by the player's Feeling, consumed by this combatant's next attack
      dialogueUsed: {}, // tracks which moves' firstUse line has already fired
    };
  }

  // --- Pre-battle menu (§8) -----------------------------------------------

  RatLand.openPreBattleMenu = function (game, npc) {
    game.mode = 'battle-menu';
    game.preBattleNpc = npc;
    var nameEl = document.getElementById('prebattle-name');
    if (nameEl) nameEl.textContent = npc.name;
    var menu = document.getElementById('prebattle-menu');
    if (menu) menu.classList.add('visible');
  };

  RatLand.closePreBattleMenu = function (game) {
    game.mode = 'overworld';
    game.preBattleNpc = null;
    var menu = document.getElementById('prebattle-menu');
    if (menu) menu.classList.remove('visible');
  };

  // Debate confirmation screen (§8): a second step between choosing
  // "Debate" from the menu above and the battle actually starting --
  // states the NPC's opening position, then offers Debate (commit) or
  // Walk Away (cancel, no penalty, same as the old top-level Walk Away).
  RatLand.openPreBattleOpinion = function (game, npc) {
    game.mode = 'battle-opinion';
    game.preBattleNpc = npc;
    var menu = document.getElementById('prebattle-menu');
    if (menu) menu.classList.remove('visible');
    var nameEl = document.getElementById('prebattle-opinion-name');
    if (nameEl) nameEl.textContent = npc.name;
    var textEl = document.getElementById('prebattle-opinion-text');
    if (textEl) textEl.textContent = npc.battleOpinion || '';
    var overlay = document.getElementById('prebattle-opinion');
    if (overlay) overlay.classList.add('visible');
  };

  RatLand.closePreBattleOpinion = function (game) {
    game.mode = 'overworld';
    game.preBattleNpc = null;
    var overlay = document.getElementById('prebattle-opinion');
    if (overlay) overlay.classList.remove('visible');
  };

  // --- Battle loop (§3, §5, §6) --------------------------------------------

  RatLand.startBattle = function (game, npc) {
    var battle = {
      npcId: npc.id,
      npcName: npc.name,
      turn: 1,
      outcome: null,
      log: [],
      player: freshCombatant(PLAYER_START),
      enemy: freshCombatant(FEN_START),
      selectedMoveId: null, // UI-only: highlighted move awaiting confirmation
      turnGapPending: false, // UI-only: see ENEMY_TURN_GAP_MS below
      regenFlash: { player: 0, enemy: 0 }, // §22: actual regen applied last upkeep
      intentHint: '', // §22: vague category-level hint of the enemy's next move
      hpFlash: { player: { amount: 0, nonce: 0 }, enemy: { amount: 0, nonce: 0 } }, // §23: last HP damage/heal event
    };
    game.battle = battle;
    game.mode = 'battle';

    var screen = document.getElementById('battle-screen');
    if (screen) screen.classList.add('visible');
    var titleEl = document.getElementById('battle-title');
    if (titleEl) titleEl.textContent = 'Debate: You vs. ' + npc.name;
    var enemyNameEl = document.getElementById('battle-name-enemy');
    if (enemyNameEl) enemyNameEl.textContent = npc.name;

    // Opening lines (§11): a one-shot pre-battle beat, independent of the
    // move-selection system -- both combatants get a line in before the
    // turn loop (enemy-first per §3) actually starts.
    battle.log.push(npc.name + ': "' + FEN_OPENING + '"');
    battle.log.push('You: "' + PLAYER_OPENING + '"');

    runEnemyTurn(battle);
    updateIntentHint(battle);
    RatLand.renderBattleUI(game);
    if (battle.outcome) endBattle(game);
  };

  // Highlights a move without executing it, showing its plain-text
  // description above the grid (per this task's request) so the player can
  // review before confirming. A second tap on the "Use Move" button (or
  // tapping the same already-selected move again) actually executes it.
  RatLand.selectMove = function (game, moveId) {
    var battle = game.battle;
    if (!battle || battle.outcome || battle.turnGapPending) return;
    var move = PLAYER_MOVES_BY_ID[moveId];
    if (!move || !canAfford(battle, 'player', move)) return;
    if (battle.selectedMoveId === moveId) {
      RatLand.confirmSelectedMove(game);
      return;
    }
    battle.selectedMoveId = moveId;
    RatLand.renderBattleUI(game);
  };

  RatLand.confirmSelectedMove = function (game) {
    var battle = game.battle;
    if (!battle || battle.outcome || battle.turnGapPending || !battle.selectedMoveId) return;
    var moveId = battle.selectedMoveId;
    battle.selectedMoveId = null;
    RatLand.playerUseMove(game, moveId);
  };

  // Fen's hurt-flash (triggered by the player's move, if it lands) and his
  // own attack-bounce (triggered by his next move) would otherwise both
  // fire in the same synchronous tick -- since turn order is enemy-first
  // (§3), Fen's *next* round starts immediately after the player's move
  // resolves, and the second class swap stomps the first before either
  // ever gets painted. ENEMY_TURN_GAP_MS defers Fen's turn just long
  // enough for the player's move (and any hurt-flash it caused) to
  // actually render first, so both animations are visible in sequence --
  // the same beat classic turn-based battle screens use, and still brief.
  var ENEMY_TURN_GAP_MS = 320;

  RatLand.playerUseMove = function (game, moveId) {
    var battle = game.battle;
    if (!battle || battle.outcome || battle.turnGapPending) return;
    var move = PLAYER_MOVES_BY_ID[moveId];
    if (!move || !canAfford(battle, 'player', move)) return;

    battle.selectedMoveId = null;
    useMove(battle, 'player', 'enemy', move);

    if (battle.outcome) {
      RatLand.renderBattleUI(game);
      endBattle(game);
      return;
    }

    battle.turnGapPending = true;
    RatLand.renderBattleUI(game);
    window.setTimeout(function () {
      battle.turnGapPending = false;
      upkeep(battle);
      runEnemyTurn(battle);
      updateIntentHint(battle);
      RatLand.renderBattleUI(game);
      if (battle.outcome) endBattle(game);
    }, ENEMY_TURN_GAP_MS);
  };

  function endBattle(game) {
    var battle = game.battle;
    if (battle.outcome === 'player') {
      game.reputation += 1;
      RatLand.saveGame(game);
    }
    // Loss (§6): no penalty, no stat carryover — a fresh battle next time
    // always starts both combatants at full HP/Effort anyway.
  }

  RatLand.exitBattle = function (game) {
    game.mode = 'overworld';
    game.battle = null;
    var screen = document.getElementById('battle-screen');
    if (screen) screen.classList.remove('visible');
    var resultEl = document.getElementById('battle-result');
    if (resultEl) resultEl.textContent = '';
    var continueBtn = document.getElementById('battle-continue');
    if (continueBtn) continueBtn.style.display = 'none';
    var confirmBtn = document.getElementById('battle-confirm-move');
    if (confirmBtn) confirmBtn.style.display = 'none';
    var moveDescEl = document.getElementById('battle-move-desc');
    if (moveDescEl) moveDescEl.textContent = '';
    var iconExplainEl = document.getElementById('battle-icon-explain');
    if (iconExplainEl) iconExplainEl.textContent = '';
    var playerIcons = document.getElementById('battle-icons-player');
    if (playerIcons) playerIcons.innerHTML = '';
    var enemyIcons = document.getElementById('battle-icons-enemy');
    if (enemyIcons) enemyIcons.innerHTML = '';
    var intentHintEl = document.getElementById('battle-intent-hint');
    if (intentHintEl) intentHintEl.textContent = '';
    var rulesOverlay = document.getElementById('battle-rules-overlay');
    if (rulesOverlay) rulesOverlay.classList.remove('visible');
    // renderHpFlash retriggers off a data-nonce attribute left on these
    // spans (see its comment) -- clear it here, or the first damage/heal
    // of the *next* battle could land on the same small nonce (1, 2, ...)
    // the previous battle ended on and get silently skipped as "unchanged".
    ['battle-hp-flash-player', 'battle-hp-flash-enemy'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = '';
      delete el.dataset.nonce;
      el.classList.remove('flash-anim', 'hp-flash-heal', 'hp-flash-damage');
    });
  };

  // --- UI rendering: Pokémon-style top (opponent) / bottom (player) panels,
  // text/symbol-only status icons, and a 2x2 move grid. ---------------------

  function renderBar(fillEl, textEl, current, max, lowClass) {
    if (fillEl) {
      var pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
      fillEl.style.width = pct + '%';
      if (lowClass) fillEl.classList.toggle('bar-low', current <= max * 0.25);
    }
    if (textEl) textEl.textContent = current + '/' + max;
  }

  // Status icons (§9/§24): text/symbol only, no illustrated art. R, C, and
  // Exposed/Primed are always shown for both combatants — never appearing
  // or disappearing — so their tap targets stay in a fixed, predictable
  // spot; an icon just looks muted (`icon-inactive`) when its value/status
  // isn't currently doing anything.
  function buildStatusIcons(name, c) {
    var isPlayer = name === 'You';
    var possessive = isPlayer ? 'Your' : name + '’s';
    var subjectIs = isPlayer ? 'You are' : name + ' is';
    var objectPronoun = isPlayer ? 'you' : 'him';
    var possessivePronoun = isPlayer ? 'your' : 'his';
    var exposedActive = !!c.exposed;
    var primedActive = c.nextAttackBonus > 0;

    var icons = [
      {
        symbol: '👄', badge: c.r, active: c.r > 0, capped: c.r >= METER_CAP, // mouth — Rhetoric build-up
        explain: possessive + ' 👄 (Rhetoric build-up): ' + c.r + '/10. Builds by 1 each time ' +
          'Rhetoric is used (capped at 10); a Fact spends some of it to cast.',
      },
      {
        symbol: '🧠', badge: c.c, active: c.c > 0, capped: c.c >= METER_CAP, // brain — Consideration build-up
        explain: possessive + ' 🧠 (Consideration build-up): ' + c.c + '/10. Builds by 1 each time ' +
          'Consideration is used (capped at 10); a Feeling spends some of it to cast.',
      },
      {
        symbol: '💥', badge: null, active: exposedActive || primedActive, // Exposed (Big Swing) / Primed (Feeling)
        explain: exposedActive
          ? possessive + ' Exposed status: granted for 1 turn by a big hit landing on ' + objectPronoun +
            '. Currently active — the next Fact used against ' + objectPronoun + ' deals double damage; ' +
            'any other move against ' + objectPronoun + ' just lets the window expire.'
          : primedActive
            ? possessive + ' Primed status: granted by a Feeling, consumed by ' + possessivePronoun +
              ' own next attack. Currently active — ' + possessivePronoun + ' next attack deals +' +
              c.nextAttackBonus + ' bonus damage.'
            : possessive + ' Exposed/Primed status: Exposed doubles the next Fact landed against ' +
              objectPronoun + ' specifically (any other move just lets it expire); Primed adds a flat ' +
              'bonus to ' + possessivePronoun + ' own next attack. Both are one-shot and currently inactive.',
      },
    ];

    return icons;
  }

  // Regen flash (§22): pops up "+N" next to an Effort bar reflecting the
  // actual amount just regenerated (0 => nothing shown, matching "if
  // full"). The span is a fixed element (not rebuilt per render like the
  // status icons), so restarting the animation needs the same
  // remove-class/reflow/add-class trick used for Fen's sprite animations
  // -- otherwise re-setting the same "+2" text on the next upkeep
  // wouldn't restart the fade. Only restarts when the text actually
  // changes, so re-renders that don't follow an upkeep (e.g. just
  // highlighting a move) don't repeatedly retrigger it.
  function renderRegenFlash(elId, amount) {
    var el = document.getElementById(elId);
    if (!el) return;
    var text = amount > 0 ? '+' + amount : '';
    if (el.textContent === text) return;
    el.textContent = text;
    if (text) {
      el.classList.remove('flash-anim');
      void el.offsetWidth;
      el.classList.add('flash-anim');
    }
  }

  // HP damage/heal flash (§23): unlike renderRegenFlash above, retriggers
  // off a nonce (stored on the element itself via a data attribute)
  // rather than "did the text change" -- see recordHpFlash's comment for
  // why a text comparison isn't enough here. flash.nonce === 0 means no
  // damage/heal has happened yet this battle, so there's nothing to show.
  function renderHpFlash(elId, flash) {
    var el = document.getElementById(elId);
    if (!el || !flash.nonce) return;
    var nonceStr = String(flash.nonce);
    if (el.dataset.nonce === nonceStr) return;
    el.dataset.nonce = nonceStr;
    el.textContent = flash.amount > 0 ? '+' + flash.amount : String(flash.amount);
    el.classList.remove('flash-anim', 'hp-flash-heal', 'hp-flash-damage');
    void el.offsetWidth;
    el.classList.add('flash-anim', flash.amount > 0 ? 'hp-flash-heal' : 'hp-flash-damage');
  }

  function renderStatusIcons(containerEl, icons) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    icons.forEach(function (icon) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'status-icon' + (icon.active ? '' : ' icon-inactive') + (icon.capped ? ' icon-capped' : '');
      btn.textContent = icon.symbol + (icon.badge !== null && icon.badge !== undefined ? ' ' + icon.badge : '');
      btn.setAttribute('data-explain', icon.explain);
      containerEl.appendChild(btn);
    });
  }

  RatLand.renderBattleUI = function (game) {
    var battle = game.battle;
    if (!battle) return;

    renderBar(
      document.getElementById('battle-hp-fill-player'), document.getElementById('battle-hp-text-player'),
      battle.player.hp, battle.player.maxHp, true
    );
    renderBar(
      document.getElementById('battle-effort-fill-player'), document.getElementById('battle-effort-text-player'),
      battle.player.effort, battle.player.maxEffort, false
    );
    renderBar(
      document.getElementById('battle-hp-fill-enemy'), document.getElementById('battle-hp-text-enemy'),
      battle.enemy.hp, battle.enemy.maxHp, true
    );
    renderBar(
      document.getElementById('battle-effort-fill-enemy'), document.getElementById('battle-effort-text-enemy'),
      battle.enemy.effort, battle.enemy.maxEffort, false
    );
    renderRegenFlash('battle-effort-flash-player', battle.regenFlash ? battle.regenFlash.player : 0);
    renderRegenFlash('battle-effort-flash-enemy', battle.regenFlash ? battle.regenFlash.enemy : 0);
    if (battle.hpFlash) {
      renderHpFlash('battle-hp-flash-player', battle.hpFlash.player);
      renderHpFlash('battle-hp-flash-enemy', battle.hpFlash.enemy);
    }

    var intentHintEl = document.getElementById('battle-intent-hint');
    if (intentHintEl) intentHintEl.textContent = battle.intentHint || '';

    renderStatusIcons(document.getElementById('battle-icons-player'), buildStatusIcons('You', battle.player));
    renderStatusIcons(document.getElementById('battle-icons-enemy'), buildStatusIcons(battle.npcName, battle.enemy));
    // Cleared on every re-render (i.e. every move) rather than left to go
    // stale — the state it described may no longer hold once the turn
    // has moved on, so a fresh tap is needed to see this turn's text.
    var iconExplainEl = document.getElementById('battle-icon-explain');
    if (iconExplainEl) iconExplainEl.textContent = '';

    // The log is scrollable (`overflow-y: auto` in style.css) so players
    // can review earlier lines, not just the latest ones. Auto-scrolling
    // to the bottom on every single render (including ones that don't
    // even add a line, like just highlighting a move) used to fight any
    // manual scroll-up immediately -- now it only re-pins to the bottom
    // when new lines actually arrived AND the player was already reading
    // near the bottom; if they'd scrolled up to review, a new line
    // doesn't yank them back down.
    var logEl = document.getElementById('battle-log');
    if (logEl) {
      var nextLogText = battle.log.join('\n');
      if (logEl.textContent !== nextLogText) {
        var wasNearBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 20;
        logEl.textContent = nextLogText;
        if (wasNearBottom) logEl.scrollTop = logEl.scrollHeight;
      }
    }

    var resultEl = document.getElementById('battle-result');
    var continueBtn = document.getElementById('battle-continue');
    var confirmBtn = document.getElementById('battle-confirm-move');
    var moveDescEl = document.getElementById('battle-move-desc');

    for (var i = 0; i < PLAYER_MOVES.length; i++) {
      var move = PLAYER_MOVES[i];
      var btn = document.getElementById('battle-move-' + i);
      if (!btn) continue;
      var costStr = move.cost
        ? ' (' + move.cost.amount + METER_SYMBOL[move.cost.meter] + ' + ' + move.cost.effort + ' Effort)'
        : ' (free)';
      btn.textContent = move.label + costStr;
      btn.setAttribute('data-move-id', move.id);
      btn.disabled = !!battle.outcome || battle.turnGapPending || !canAfford(battle, 'player', move);
      btn.classList.toggle('move-selected', battle.selectedMoveId === move.id);
    }

    if (moveDescEl) {
      var selected = battle.selectedMoveId && PLAYER_MOVES_BY_ID[battle.selectedMoveId];
      moveDescEl.textContent = selected ? selected.label + ' — ' + selected.description : '';
    }
    if (confirmBtn) {
      confirmBtn.style.display = (!battle.outcome && battle.selectedMoveId) ? 'block' : 'none';
    }

    if (battle.outcome) {
      var movesEl = document.getElementById('battle-moves');
      if (movesEl) movesEl.style.display = 'none';
      if (continueBtn) continueBtn.style.display = 'block';
      if (resultEl) {
        if (battle.outcome === 'player') {
          resultEl.textContent = battle.npcName + ' backs down. You win! (+1 Reputation)';
        } else {
          resultEl.textContent = battle.npcName + ' talks over you until you give up. ' +
            '"Not everything needs solving today," he mutters. (No penalty.)';
        }
      }
    } else {
      var movesEl2 = document.getElementById('battle-moves');
      if (movesEl2) movesEl2.style.display = 'grid';
      if (continueBtn) continueBtn.style.display = 'none';
      if (resultEl) resultEl.textContent = '';
    }
  };

  // --- Battle wipe transition (§10) ----------------------------------------
  // A brief "Venetian blinds" wipe: covers the screen, runs `onCovered` at
  // the moment it's fully covered (swap overworld <-> battle screen here),
  // then uncovers. ~0.22s per phase (plus a small stagger), so well under
  // 1s round trip -- deliberately quick so it doesn't slow down testing.
  var WIPE_PHASE_MS = 300; // >= the CSS animation + stagger duration

  RatLand.playBattleWipe = function (onCovered) {
    var overlay = document.getElementById('battle-wipe');
    if (!overlay) {
      if (onCovered) onCovered();
      return;
    }
    overlay.classList.remove('wipe-out');
    // Force a reflow so re-adding 'wipe-in' restarts the animation even if
    // a previous wipe used the same class very recently.
    void overlay.offsetWidth;
    overlay.classList.add('visible', 'wipe-in');
    setTimeout(function () {
      if (onCovered) onCovered();
      overlay.classList.remove('wipe-in');
      void overlay.offsetWidth;
      overlay.classList.add('wipe-out');
      setTimeout(function () {
        overlay.classList.remove('visible', 'wipe-out');
      }, WIPE_PHASE_MS);
    }, WIPE_PHASE_MS);
  };

  // --- Wiring (buttons for the pre-battle menu and battle moves) -----------

  RatLand.initBattleUI = function () {
    var talkBtn = document.getElementById('prebattle-talk');
    var debateBtn = document.getElementById('prebattle-debate');
    var opinionDebateBtn = document.getElementById('prebattle-opinion-debate');
    var opinionWalkBtn = document.getElementById('prebattle-opinion-walk');

    if (talkBtn) {
      talkBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var game = RatLand.game;
        var npc = game.preBattleNpc;
        RatLand.closePreBattleMenu(game);
        if (npc) RatLand.showDialogue(npc.name, RatLand.getNpcLine(npc));
      });
    }

    // Debate (top-level menu): no longer starts the battle directly --
    // opens the opinion-confirmation screen instead (§8).
    if (debateBtn) {
      debateBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var game = RatLand.game;
        var npc = game.preBattleNpc;
        if (!npc) return;
        RatLand.openPreBattleOpinion(game, npc);
      });
    }

    // Debate (opinion-confirmation screen): this is the actual commit to
    // battle -- what the old top-level Fight button used to do directly.
    if (opinionDebateBtn) {
      opinionDebateBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var game = RatLand.game;
        var npc = game.preBattleNpc;
        var overlay = document.getElementById('prebattle-opinion');
        if (overlay) overlay.classList.remove('visible');
        game.preBattleNpc = null;
        if (!npc) return;
        RatLand.playBattleWipe(function () {
          RatLand.startBattle(game, npc);
        });
      });
    }

    if (opinionWalkBtn) {
      opinionWalkBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        RatLand.closePreBattleOpinion(RatLand.game);
      });
    }

    for (var i = 0; i < PLAYER_MOVES.length; i++) {
      (function (idx) {
        var btn = document.getElementById('battle-move-' + idx);
        if (!btn) return;
        btn.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          var moveId = btn.getAttribute('data-move-id');
          if (moveId) RatLand.selectMove(RatLand.game, moveId);
        });
      })(i);
    }

    var confirmMoveBtn = document.getElementById('battle-confirm-move');
    if (confirmMoveBtn) {
      confirmMoveBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        RatLand.confirmSelectedMove(RatLand.game);
      });
    }

    var continueBtn = document.getElementById('battle-continue');
    if (continueBtn) {
      continueBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        RatLand.playBattleWipe(function () {
          RatLand.exitBattle(RatLand.game);
        });
      });
    }

    // Rules overlay (§22): a pure informational layer on top of the battle
    // screen -- opening/closing it never touches battle state, so it can
    // be opened any time, including mid-turn-gap, with no side effects.
    var rulesOpenBtn = document.getElementById('battle-rules-open');
    var rulesOverlay = document.getElementById('battle-rules-overlay');
    var rulesBackBtn = document.getElementById('battle-rules-back');
    if (rulesOpenBtn && rulesOverlay) {
      rulesOpenBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        rulesOverlay.classList.add('visible');
      });
    }
    if (rulesBackBtn && rulesOverlay) {
      rulesBackBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        rulesOverlay.classList.remove('visible');
      });
    }

    // Status icons are recreated on every render (renderStatusIcons), so
    // their tap handling is delegated from the fixed container elements
    // rather than bound per-icon.
    ['battle-icons-player', 'battle-icons-enemy'].forEach(function (containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.addEventListener('pointerdown', function (e) {
        var target = e.target.closest ? e.target.closest('.status-icon') : null;
        if (!target) return;
        e.preventDefault();
        var explainEl = document.getElementById('battle-icon-explain');
        if (explainEl) explainEl.textContent = target.getAttribute('data-explain');
      });
    });
  };

})();
