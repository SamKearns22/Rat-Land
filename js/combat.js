// combat.js — turn-based "debate combat" against fightable NPCs.
// Implements COMBAT_DESIGN.md: pre-battle Talk/Fight/Walk Away menu (§8),
// enemy-first turn order (§3), Rhetoric/Consideration/Facts/Feelings (§4),
// Defence (§4a), Confident (§4b), the Fact+Feeling win condition with a
// soft HP floor (§5), the no-penalty loss state (§6), Reputation-on-win via
// the existing save system (§7), and a Pokémon-style battle screen layout
// (§9/§10): opponent panel on top, player panel on the bottom-opposite
// corner, HP/Effort bars, always-visible R/C/Defence/Confident status
// icons (text/symbol only, tap for a plain-text explanation), and a 2x2
// move grid with a select-then-confirm flow that previews a move's
// plain-text description before it's used, and contextual/randomized
// battle dialogue (§11): a one-shot opening/finishing line per combatant,
// a unique first-use line for each Fact/Feeling, and a random 3-4 line
// pool for every repeat use (including all Rhetoric/Consideration uses).
// Still no battle-transition animation (§10) and no illustrated sprite
// art — DOM panels only.
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

  // Damage/heal math shared by every move. `computeDamage` applies Defence
  // first (flat, pre-modifier — §4a), then the Confident reduction for
  // "Actually…" specifically (§4b), then the Persecution Complex
  // vulnerability bonus (§14) — in that order, per §4a's order of operations.
  function computeDamage(battle, atkSide, defSide, baseDamage, move) {
    var defender = battle[defSide];
    var dmg = Math.max(0, baseDamage - defender.defence);
    if (move.id === 'actually' && defender.confidentTurns > 0) {
      dmg = Math.floor(dmg / 2);
    }
    if (move.type === 'fact' && defender.vulnerableNextFact) {
      dmg += 2;
      defender.vulnerableNextFact = false;
    }
    return Math.max(0, dmg);
  }

  // The win-condition soft floor (§5): a hit that would reduce a combatant
  // to 0 HP only actually ends the battle if the attacker has already used
  // at least one Fact AND one Feeling. Otherwise it clamps at 1 HP and the
  // fight continues. Applied symmetrically to both sides, since §5 states
  // the rule in terms of "the winning side" generally, not just the player.
  function applyDamage(battle, atkSide, defSide, dmg) {
    if (dmg <= 0) return 0;
    var attacker = battle[atkSide];
    var defender = battle[defSide];
    var newHp = defender.hp - dmg;
    if (newHp <= 0) {
      if (attacker.usedFact && attacker.usedFeeling) {
        defender.hp = 0;
        battle.outcome = atkSide;
        var finishLine = defSide === 'player' ? PLAYER_FINISHING : FEN_FINISHING;
        battle.log.push((defSide === 'player' ? 'You' : battle.npcName) + ': "' + finishLine + '"');
      } else {
        defender.hp = 1;
        battle.log.push('(' + (defSide === 'player' ? 'You' : battle.npcName) +
          ' nearly went down, but the argument isn\'t over yet.)');
      }
    } else {
      defender.hp = newHp;
    }
    return dmg;
  }

  function heal(battle, side, amount) {
    var c = battle[side];
    c.hp = Math.min(c.maxHp, c.hp + amount);
  }

  // R and C build-up meters are capped at 10, same as Effort — previously
  // uncapped, which let them climb without bound over a long fight.
  var METER_CAP = 10;
  // Every visible mention of the R/C meters uses these icons instead of
  // the bare letters — mouth for R (Rhetoric build-up), brain for C
  // (Consideration build-up).
  var METER_SYMBOL = { r: '👄', c: '🧠' };
  // "Someone's Going to Drown"'s Defence contribution caps at +3 total
  // regardless of how many times it's cast (§12) — previously unlimited.
  var DROWN_DEFENCE_CAP = 3;
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
        var dmg = computeDamage(battle, atk, def, 2, this);
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
      description: 'Bigger damage. Costs 👄 + Effort. Deals half damage against a Confident opponent.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
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
        firstUse: 'I’m not trying to attack you. I just — I want to understand.',
        pool: [
          'I just want to get where you’re coming from.',
          'Can you help me see it your way?',
        ],
      },
      description: 'Heals yourself a little and lowers the opponent’s Defence by 1. Costs 🧠 + Effort.',
      effect: function (battle, atk, def) {
        battle[def].defence = Math.max(0, battle[def].defence - 1);
        heal(battle, atk, 2);
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
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 2, this);
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
      effect: function (battle, atk, def) {
        heal(battle, atk, 2);
        gainMeter(battle, atk, 'c', 1);
      },
    },
    {
      id: 'council-tax', label: 'Fact: "Council Tax Correction"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: {
        firstUse: 'You lot always say that, and nothing ever changes, does it?',
        pool: [
          'The Church gets more funding than my street does.',
          'Nobody’s fixed my drain in three years.',
          'Where’s my anniversary money gone, eh?',
        ],
      },
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
        applyDamage(battle, atk, def, dmg);
        battle[def].defence = Math.max(0, battle[def].defence - 1);
      },
    },
    {
      id: 'drown', label: 'Fact: "Someone\'s Going to Drown"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: {
        firstUse: 'You can call it heartless if you like. I call it common sense.',
        pool: [
          'It’s not safe. Never has been.',
          'I’m not being funny, someone’s gonna die out there.',
        ],
      },
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
        applyDamage(battle, atk, def, dmg);
        // Defence contribution from repeated casts caps at +3 total
        // (§12) -- further casts still deal damage but stop adding
        // Defence once that total is reached.
        if (battle[atk].drownDefenceBonus < DROWN_DEFENCE_CAP) {
          battle[atk].defence += 1;
          battle[atk].drownDefenceBonus += 1;
        }
      },
    },
    {
      id: 'persecution', label: 'Feeling: "Persecution Complex"', type: 'feeling',
      cost: { meter: 'c', amount: 3, effort: 4 }, turnWindow: [3, 4], oncePerBattle: true,
      dialogue: {
        firstUse: 'Don’t you dare tell me how I’m allowed to feel about this.',
        pool: [
          'Everyone’s against blokes like me these days.',
          'No one’s on my side anymore.',
        ],
      },
      effect: function (battle, atk, def) {
        // "The next enemy Fact used against Fen deals bonus damage" (§14) —
        // "enemy" here means Fen's opponent (the player), so it's Fen (atk)
        // who becomes vulnerable to the player's next Fact, not the other
        // way around. This is the self-inflicted vulnerability the design
        // doc calls out: raising his own Defence generally, but leaving
        // himself open to a well-aimed Fact specifically.
        battle[def].effort = Math.max(0, battle[def].effort - 4);
        // This Defence gain is temporary — tied to Confident's 1-turn
        // window, not permanent. If it's somehow already active (re-cast),
        // undo the previous grant first so it can never stack; it always
        // represents "currently active," never an accumulating total.
        battle[atk].defence -= battle[atk].persecutionDefenceBonus;
        battle[atk].persecutionDefenceBonus = 1;
        battle[atk].defence += battle[atk].persecutionDefenceBonus;
        battle[atk].confidentTurns = 1;
        battle[atk].vulnerableNextFact = true;
      },
    },
  ];

  var PLAYER_MOVES_BY_ID = {};
  PLAYER_MOVES.forEach(function (m) { PLAYER_MOVES_BY_ID[m.id] = m; });

  function canAfford(battle, side, move) {
    var c = battle[side];
    if (move.turnWindow && (battle.turn < move.turnWindow[0] || battle.turn > move.turnWindow[1])) return false;
    if (move.oncePerBattle && c.usedOnce && c.usedOnce[move.id]) return false;
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

  // Resolves one move: pays its cost, logs its dialogue, runs its numeric
  // effect, then applies the generic post-move bookkeeping every move of
  // that type carries — usedFact/usedFeeling (§5's win-condition tracker)
  // and Confident (§4b: Fen gains it for 1 turn whenever *any* Fen Fact is
  // used, not just Persecution Complex specifically).
  function useMove(battle, atkSide, defSide, move) {
    payCost(battle, atkSide, move);
    if (move.oncePerBattle) {
      var c = battle[atkSide];
      c.usedOnce = c.usedOnce || {};
      c.usedOnce[move.id] = true;
    }
    var speaker = atkSide === 'player' ? 'You' : battle.npcName;
    var line = pickMoveDialogue(battle, atkSide, move);
    battle.log.push(speaker + ': "' + line + '"');
    move.effect(battle, atkSide, defSide);
    if (move.type === 'fact') {
      battle[atkSide].usedFact = true;
      if (atkSide === 'enemy') battle.enemy.confidentTurns = 1;
    }
    if (move.type === 'feeling') {
      battle[atkSide].usedFeeling = true;
    }
  }

  // Fen's AI (test dummy, not final): bank C toward Persecution Complex
  // through turns 1-4 so his signature move is actually reachable by its
  // turn-3/4 window, fire it the moment it's affordable, otherwise use a
  // Fact when he can afford one (alternating for variety), heal if he's
  // under 40% HP, otherwise fall back to Rhetoric to build up R.
  function chooseFenMove(battle) {
    var persecution = FEN_MOVES[4];
    var usedPersecution = battle.enemy.usedOnce && battle.enemy.usedOnce[persecution.id];

    if (!usedPersecution && canAfford(battle, 'enemy', persecution)) return persecution;
    if (!usedPersecution && battle.turn <= 4 && battle.enemy.c < persecution.cost.amount) {
      return FEN_MOVES[1]; // Consideration — banking C for the window above.
    }

    var councilTax = FEN_MOVES[2], drown = FEN_MOVES[3];
    var primary = battle.turn % 2 === 0 ? drown : councilTax;
    var secondary = primary === drown ? councilTax : drown;
    if (canAfford(battle, 'enemy', primary)) return primary;
    if (canAfford(battle, 'enemy', secondary)) return secondary;

    if (battle.enemy.hp <= battle.enemy.maxHp * 0.4) return FEN_MOVES[1];
    return FEN_MOVES[0];
  }

  function runEnemyTurn(battle) {
    if (battle.outcome) return;
    var move = chooseFenMove(battle);
    useMove(battle, 'enemy', 'player', move);
  }

  function upkeep(battle) {
    battle.player.effort = Math.min(battle.player.maxEffort, battle.player.effort + 2);
    battle.enemy.effort = Math.min(battle.enemy.maxEffort, battle.enemy.effort + 2);
    if (battle.enemy.confidentTurns > 0) {
      battle.enemy.confidentTurns -= 1;
      // Confident just expired -- fully revert Persecution Complex's
      // temporary Defence grant (and only that amount; any Defence Fen
      // earned separately, e.g. from "Someone's Going to Drown", is
      // untouched) rather than let it persist for the rest of the battle.
      if (battle.enemy.confidentTurns === 0 && battle.enemy.persecutionDefenceBonus > 0) {
        battle.enemy.defence -= battle.enemy.persecutionDefenceBonus;
        battle.enemy.persecutionDefenceBonus = 0;
      }
    }
    battle.turn += 1;
  }

  function freshCombatant(stats) {
    return {
      hp: stats.hp, maxHp: stats.maxHp, effort: stats.effort, maxEffort: stats.maxEffort,
      r: 0, c: 0, defence: 0, usedFact: false, usedFeeling: false,
      confidentTurns: 0, vulnerableNextFact: false, usedOnce: {},
      persecutionDefenceBonus: 0, drownDefenceBonus: 0,
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
    RatLand.renderBattleUI(game);
    if (battle.outcome) endBattle(game);
  };

  // Highlights a move without executing it, showing its plain-text
  // description above the grid (per this task's request) so the player can
  // review before confirming. A second tap on the "Use Move" button (or
  // tapping the same already-selected move again) actually executes it.
  RatLand.selectMove = function (game, moveId) {
    var battle = game.battle;
    if (!battle || battle.outcome) return;
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
    if (!battle || battle.outcome || !battle.selectedMoveId) return;
    var moveId = battle.selectedMoveId;
    battle.selectedMoveId = null;
    RatLand.playerUseMove(game, moveId);
  };

  RatLand.playerUseMove = function (game, moveId) {
    var battle = game.battle;
    if (!battle || battle.outcome) return;
    var move = PLAYER_MOVES_BY_ID[moveId];
    if (!move || !canAfford(battle, 'player', move)) return;

    battle.selectedMoveId = null;
    useMove(battle, 'player', 'enemy', move);
    if (!battle.outcome) {
      upkeep(battle);
      runEnemyTurn(battle);
    }
    RatLand.renderBattleUI(game);
    if (battle.outcome) endBattle(game);
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

  // Status icons (§9): text/symbol only, no illustrated art. R, C, Defence,
  // and Confident are always shown for both combatants — never appearing
  // or disappearing — so their tap targets stay in a fixed, predictable
  // spot; an icon just looks muted (`icon-inactive`) when its value/status
  // isn't currently doing anything.
  function buildStatusIcons(name, c) {
    var isPlayer = name === 'You';
    var possessive = isPlayer ? 'Your' : name + '’s';
    var subjectIs = isPlayer ? 'You are' : name + ' is';
    var confidentActive = c.confidentTurns > 0;
    var defenceActive = c.defence !== 0;

    return [
      {
        symbol: '👄', badge: c.r, active: c.r > 0, // mouth — Rhetoric build-up
        explain: possessive + ' 👄 (Rhetoric build-up): ' + c.r + '/10. Builds by 1 each time ' +
          'Rhetoric is used (capped at 10); a Fact spends some of it to cast.',
      },
      {
        symbol: '🧠', badge: c.c, active: c.c > 0, // brain — Consideration build-up
        explain: possessive + ' 🧠 (Consideration build-up): ' + c.c + '/10. Builds by 1 each time ' +
          'Consideration is used (capped at 10); a Feeling spends some of it to cast.',
      },
      {
        symbol: '🛡️', badge: (c.defence > 0 ? '+' : '') + c.defence, active: defenceActive, // shield + signed number
        explain: possessive + ' Defence: ' + c.defence + '. A flat reduction applied to ' +
          'incoming damage before any other modifier.' + (defenceActive ? '' : ' Currently no Defence bonus.'),
      },
      {
        symbol: '😤', badge: null, active: confidentActive, // distinct icon for Confident
        explain: confidentActive
          ? subjectIs + ' Confident (' + c.confidentTurns + ' turn' +
            (c.confidentTurns === 1 ? '' : 's') + ' left): the player’s Fact "Actually…" ' +
            'deals half damage against a Confident target.'
          : subjectIs + ' not currently Confident. When active, the player’s Fact ' +
            '"Actually…" deals half damage against him.',
      },
    ];
  }

  function renderStatusIcons(containerEl, icons) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    icons.forEach(function (icon) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'status-icon' + (icon.active ? '' : ' icon-inactive');
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

    renderStatusIcons(document.getElementById('battle-icons-player'), buildStatusIcons('You', battle.player));
    renderStatusIcons(document.getElementById('battle-icons-enemy'), buildStatusIcons(battle.npcName, battle.enemy));
    // Cleared on every re-render (i.e. every move) rather than left to go
    // stale — the state it described may no longer hold once the turn
    // has moved on, so a fresh tap is needed to see this turn's text.
    var iconExplainEl = document.getElementById('battle-icon-explain');
    if (iconExplainEl) iconExplainEl.textContent = '';

    var logEl = document.getElementById('battle-log');
    if (logEl) {
      logEl.textContent = battle.log.join('\n');
      logEl.scrollTop = logEl.scrollHeight;
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
      btn.disabled = !!battle.outcome || !canAfford(battle, 'player', move);
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

  // --- Wiring (buttons for the pre-battle menu and battle moves) -----------

  RatLand.initBattleUI = function () {
    var talkBtn = document.getElementById('prebattle-talk');
    var fightBtn = document.getElementById('prebattle-fight');
    var walkBtn = document.getElementById('prebattle-walk');

    if (talkBtn) {
      talkBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var game = RatLand.game;
        var npc = game.preBattleNpc;
        RatLand.closePreBattleMenu(game);
        if (npc) RatLand.showDialogue(npc.name, RatLand.getNpcLine(npc));
      });
    }

    if (fightBtn) {
      fightBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var game = RatLand.game;
        var npc = game.preBattleNpc;
        var menu = document.getElementById('prebattle-menu');
        if (menu) menu.classList.remove('visible');
        game.preBattleNpc = null;
        if (npc) RatLand.startBattle(game, npc);
      });
    }

    if (walkBtn) {
      walkBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        RatLand.closePreBattleMenu(RatLand.game);
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
        RatLand.exitBattle(RatLand.game);
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
