// combat.js — turn-based "debate combat" against fightable NPCs.
// Implements COMBAT_DESIGN.md: pre-battle Talk/Fight/Walk Away menu (§8),
// enemy-first turn order (§3), Rhetoric/Consideration/Facts/Feelings (§4),
// Defence (§4a), Confident (§4b), the Fact+Feeling win condition with a
// soft HP floor (§5), the no-penalty loss state (§6), and Reputation-on-win
// via the existing save system (§7). Text-only UI: plain DOM panels, no
// battle-transition animation and no status icons yet (§9/§10 are future
// work — see the report accompanying this change for what was deferred).
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {

  // --- Test moveset (§13/§14 — explicitly TEST/THROWAWAY per the design doc) ---

  var PLAYER_START = { hp: 20, maxHp: 20, effort: 10, maxEffort: 10 };
  var FEN_START = { hp: 18, maxHp: 18, effort: 10, maxEffort: 10 };

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

  var PLAYER_MOVES = [
    {
      id: 'rhetoric', label: 'Rhetoric', type: 'basic', cost: null,
      dialogue: 'I just think… we should hear them out?',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 2, this);
        applyDamage(battle, atk, def, dmg);
        battle[atk].r += 1;
      },
    },
    {
      id: 'consideration', label: 'Consideration', type: 'basic', cost: null,
      dialogue: 'Okay. Let me think about that.',
      effect: function (battle, atk, def) {
        heal(battle, atk, 2);
        battle[atk].c += 1;
      },
    },
    {
      id: 'actually', label: 'Fact: "Actually…"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: 'Actually…',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
        applyDamage(battle, atk, def, dmg);
      },
    },
    {
      id: 'understand', label: 'Feeling: "I just want to understand"', type: 'feeling',
      cost: { meter: 'c', amount: 3, effort: 4 },
      dialogue: 'I just want to understand',
      effect: function (battle, atk, def) {
        battle[def].defence = Math.max(0, battle[def].defence - 1);
        heal(battle, atk, 2);
      },
    },
  ];

  var FEN_MOVES = [
    {
      id: 'fen-rhetoric', label: 'Rhetoric', type: 'basic', cost: null,
      dialogue: "You're not even listening to me!",
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 2, this);
        applyDamage(battle, atk, def, dmg);
        battle[atk].r += 1;
      },
    },
    {
      id: 'fen-consideration', label: 'Consideration', type: 'basic', cost: null,
      dialogue: '…alright, fair point.',
      effect: function (battle, atk, def) {
        heal(battle, atk, 2);
        battle[atk].c += 1;
      },
    },
    {
      id: 'council-tax', label: 'Fact: "Council Tax Correction"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: 'The Church gets more funding than my street does, and everyone knows it.',
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
        applyDamage(battle, atk, def, dmg);
        battle[def].defence = Math.max(0, battle[def].defence - 1);
      },
    },
    {
      id: 'drown', label: 'Fact: "Someone\'s Going to Drown"', type: 'fact',
      cost: { meter: 'r', amount: 2, effort: 3 },
      dialogue: "If a mouse drowns crossing that river, that's on whoever let them try.",
      effect: function (battle, atk, def) {
        var dmg = computeDamage(battle, atk, def, 3, this);
        applyDamage(battle, atk, def, dmg);
        battle[atk].defence += 1;
      },
    },
    {
      id: 'persecution', label: 'Feeling: "Persecution Complex"', type: 'feeling',
      cost: { meter: 'c', amount: 3, effort: 4 }, turnWindow: [3, 4], oncePerBattle: true,
      dialogue: "Everyone's against blokes like me these days.",
      effect: function (battle, atk, def) {
        // "The next enemy Fact used against Fen deals bonus damage" (§14) —
        // "enemy" here means Fen's opponent (the player), so it's Fen (atk)
        // who becomes vulnerable to the player's next Fact, not the other
        // way around. This is the self-inflicted vulnerability the design
        // doc calls out: raising his own Defence generally, but leaving
        // himself open to a well-aimed Fact specifically.
        battle[def].effort = Math.max(0, battle[def].effort - 4);
        battle[atk].defence += 1;
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
    battle.log.push(speaker + ': "' + move.dialogue + '"');
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
    if (battle.enemy.confidentTurns > 0) battle.enemy.confidentTurns -= 1;
    battle.turn += 1;
  }

  function freshCombatant(stats) {
    return {
      hp: stats.hp, maxHp: stats.maxHp, effort: stats.effort, maxEffort: stats.maxEffort,
      r: 0, c: 0, defence: 0, usedFact: false, usedFeeling: false,
      confidentTurns: 0, vulnerableNextFact: false, usedOnce: {},
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
    };
    game.battle = battle;
    game.mode = 'battle';

    var screen = document.getElementById('battle-screen');
    if (screen) screen.classList.add('visible');
    var titleEl = document.getElementById('battle-title');
    if (titleEl) titleEl.textContent = 'Debate: You vs. ' + npc.name;

    runEnemyTurn(battle);
    RatLand.renderBattleUI(game);
    if (battle.outcome) endBattle(game);
  };

  RatLand.playerUseMove = function (game, moveId) {
    var battle = game.battle;
    if (!battle || battle.outcome) return;
    var move = PLAYER_MOVES_BY_ID[moveId];
    if (!move || !canAfford(battle, 'player', move)) return;

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
  };

  // --- UI rendering (text-only, per this task's scope) ---------------------

  function formatCombatant(name, c) {
    var tags = c.confidentTurns > 0 ? ' [Confident]' : '';
    return name + ' — HP ' + c.hp + '/' + c.maxHp + '  Effort ' + c.effort + '/' + c.maxEffort +
      '  R:' + c.r + ' C:' + c.c + '  Defence ' + c.defence + tags;
  }

  RatLand.renderBattleUI = function (game) {
    var battle = game.battle;
    if (!battle) return;

    var playerStatsEl = document.getElementById('battle-stats-player');
    var enemyStatsEl = document.getElementById('battle-stats-enemy');
    if (playerStatsEl) playerStatsEl.textContent = formatCombatant('You', battle.player);
    if (enemyStatsEl) enemyStatsEl.textContent = formatCombatant(battle.npcName, battle.enemy);

    var logEl = document.getElementById('battle-log');
    if (logEl) {
      logEl.textContent = battle.log.join('\n');
      logEl.scrollTop = logEl.scrollHeight;
    }

    var resultEl = document.getElementById('battle-result');
    var continueBtn = document.getElementById('battle-continue');

    for (var i = 0; i < PLAYER_MOVES.length; i++) {
      var move = PLAYER_MOVES[i];
      var btn = document.getElementById('battle-move-' + i);
      if (!btn) continue;
      var costStr = move.cost
        ? ' (' + move.cost.amount + move.cost.meter.toUpperCase() + ' + ' + move.cost.effort + ' Effort)'
        : ' (free)';
      btn.textContent = move.label + costStr;
      btn.setAttribute('data-move-id', move.id);
      btn.disabled = !!battle.outcome || !canAfford(battle, 'player', move);
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
      if (movesEl2) movesEl2.style.display = 'block';
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
          if (moveId) RatLand.playerUseMove(RatLand.game, moveId);
        });
      })(i);
    }

    var continueBtn = document.getElementById('battle-continue');
    if (continueBtn) {
      continueBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        RatLand.exitBattle(RatLand.game);
      });
    }
  };

})();
