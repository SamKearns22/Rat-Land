# Combat Design — Rat Land

**Status: design review draft. No combat code has been written yet.**
This document is for review and revision before any implementation
starts. The two movesets in §13 are explicitly test/throwaway (see
that section) and a handful of smaller mechanics they reference
aren't fully pinned down yet — flagged in §11 rather than guessed.

## 1. Concept

Turn-based "debate combat." Rat Land's whole setting is an argument
(per `WORLD.md` and `NPC_DIALOGUE.md`), so fights are framed the same
way: **Rhetoric** (basic jabs) and **Consideration** (basic
conciliation) are free, always-available moves, while **Facts** and
**Feelings** are costed specials standing in for hard evidence and
emotional appeal. The thematic point (see §5) is that out-shouting or
out-soothing someone isn't a real win — landing both a Fact and a
Feeling is what actually convinces anyone.

## 2. Resource Pools

Three pools, tracked per combatant:

1. **HP** — depletes toward zero. Reaching zero ends the battle,
   subject to the win-condition rule in §5.
2. **Effort** (MP equivalent) — regenerates +2 per turn for both
   test combatants (§12). Note: in the confirmed test movesets (§13),
   no move actually spends Effort — Facts and Feelings are paid for
   out of the R/C meter instead (see §3 below). Effort's role here is
   presumably for a future move type; flagged in §11.
3. **R/C Meter** — two independent counters, **R** (Rhetoric
   build-up) and **C** (Consideration build-up), each incremented by
   1 whenever the matching basic move is used, and **spent directly
   as the cost of Facts (R) and Feelings (C)** — e.g. a Fact costing
   "2R" needs the R meter at 2+ and consumes 2 on use. This resolves
   what the meters are *for*: they're the fuel gauge for specials,
   built up by throwing basics first.

## 3. Turn Order

**Enemy always acts first**, every round. No speed stat, no
randomness in who goes first.

Round loop:
1. Enemy turn (move resolves, dialogue line fires).
2. Player turn (move resolves, dialogue line fires).
3. End-of-round upkeep: Effort regen for both sides, any status
   effects (e.g. Defence buffs/debuffs, see §4a) tick or expire.
4. Repeat until a win/loss condition is met.

This keeps enemy dialogue reliably "opening" every round — e.g. Fen
can always land a barbed remark before the player responds to it.

## 4. Move Types

| Move | Cost | Base effect | Meter |
|---|---|---|---|
| **Rhetoric** (basic attack) | 0 | 2 dmg to opponent | +1 R |
| **Consideration** (basic heal) | 0 | 2 HP healed (self) | +1 C |
| **Facts** (costed special) | R meter | Damage (typically more than Rhetoric); may carry a trade-off or side-effect | — |
| **Feelings** (costed special) | C meter | Heal/buff/debuff (typically stronger than Consideration); may carry a trade-off or side-effect | — |

Rhetoric and Consideration are always available to everyone. Facts
and Feelings are where a character's personality and moveset design
lives — see the confirmed test kits in §13.

### 4a. Defence (new modifier, not one of the 3 pools)

Several test moves (§13) reference a **Defence** stat that isn't one
of the three resource pools above — it's a battle-only modifier that
several Facts/Feelings raise or lower (e.g. "-1 enemy Defence," "+2
Fen Defence"). Its exact mechanical effect on damage calculation
(flat reduction? percentage? does it decay per turn or persist for
the rest of the battle?) isn't specified in the brief — flagged in
§11 as something to pin down before implementation.

## 5. Win Condition

Standard win trigger: reduce the opponent's HP to 0.

**Modifier:** HP hitting 0 only counts as an actual win if the
winning side has used **at least one Fact and at least one Feeling**
at some point earlier in the battle. Pure Rhetoric-spam (or Rhetoric
+ Consideration stalling) cannot win on its own, no matter how much
damage it does.

**Recommended handling (flag for confirmation, see §11):** a soft
floor. If a hit would take the opponent to ≤0 HP but the attacker
hasn't used both a Fact and a Feeling yet, clamp their HP at 1
instead of ending the battle, and play a line acknowledging the
near-miss. Once both move types have landed, the next KO-would-be hit
resolves as a real win.

Both confirmed test kits (§13) have exactly one Fact and one Feeling
each, so this condition is satisfiable by design — the player (and
Fen) must each use their one Fact and one Feeling at least once
during the test fight for a win to actually register.

## 6. Loss State

If the **player's** HP hits 0: immediately booted from the battle.
The opponent gets one dismissive closing line (per-character, in
their established voice — Fen's would fit his weary, deflecting tone
from `NPC_DIALOGUE.md`). No mechanical penalty — no Reputation loss,
no stat carryover — the player is simply returned to the overworld.
Recommend resetting HP/Effort to full on being booted, so a loss
doesn't create a death-spiral before the player understands the
system (flagged in §11).

**No retreat once in battle.** The only ways out of a started battle
are win or lose (§5, §6) — there is no flee/retreat move. The one
and only "no penalty" exit is Walk Away (§8), and it's only available
*before* Fight is chosen — see §8.

## 7. Reputation & Save Integration

On a win: increment `game.reputation` (exact amount TBD, see §11),
then call `RatLand.saveGame(game)` immediately — the same
autosave-on-significant-event pattern already used for map
transitions (`js/transitions.js`), so a win is never lost to a
refresh or crash. No new save-file fields are needed: `reputation`
already exists in the save shape (`js/save.js`), and `unlockedMoves`
already exists for whenever combat starts actually unlocking new
player moves (not in this test design — the 4-move starter kit in
§13 is fixed for the whole test fight).

## 8. Pre-Battle Menu (Talk / Fight / Walk Away)

NPCs flagged as **fightable** — for now, just Fen Wicket, the combat
test dummy — get an extra step before anything happens. Interacting
with a fightable NPC opens a three-option menu instead of
immediately showing dialogue the way every other NPC in the game
does today:

- **Talk** — shows the NPC's existing standard dialogue, exactly as
  currently implemented (`RatLand.getNpcLine` cycling through their
  `lines` array from `NPC_DIALOGUE.md` / `js/npc.js`). No new writing
  needed, and no change at all to how that dialogue works — Talk
  from this menu behaves identically to interacting with any
  non-fightable NPC.
- **Fight** — starts the battle transition sequence (§9) against
  that NPC.
- **Walk Away** — closes the menu and returns to normal exploration.
  No penalty, no state recorded — approaching the same NPC again
  later presents the same three options fresh. **Only available
  before Fight is chosen.** Once the battle transition starts, Walk
  Away is no longer an option (see §6 — no retreat mid-battle).

**Talk and Fight must be independent by default, but the system has
to allow that to vary per NPC.** For Fen Wicket specifically, Talk
and Fight are two completely separate paths with zero interaction:
choosing Talk never triggers a fight, choosing Talk repeatedly has no
escalating effect, and choosing Fight doesn't consume or alter his
Talk dialogue in any way. That said, **this independence is Fen's
specific configuration, not a hardcoded universal rule.** A future
NPC might, for example, have Talk eventually provoke a Fight, or gate
Fight behind having Talked first, or something else entirely — the
menu logic needs to check each fightable NPC's own configuration for
how its Talk and Fight relate, rather than assuming "always
independent" is a global constant. Concretely, this means whatever
data structure marks an NPC as fightable should carry its own
Talk/Fight relationship setting (defaulting to independent), not have
that behavior baked into the menu code itself.

This also answers the open trigger-mechanism question from the
previous draft (§11.8 was "battle trigger mechanism" — resolved:
selecting Fight from this menu is the trigger; the menu itself opens
via the same interaction the player already uses to talk to anyone,
i.e. walking adjacent and pressing Talk / the on-screen Talk button).

## 9. Battle Transition Sequence (Pokémon-style)

Battle is a new top-level game mode alongside the existing
`'overworld'` / `'interior'` (see `main.js`), e.g. `'battle-transition'`
→ `'battle'` → back to `'overworld'`.

Sequence beats:
1. **Trigger.** Player selects **Fight** from the pre-battle menu
   (§8) for a fightable NPC — for this test design, Fen Wicket.
2. **Wipe in.** Screen transitions (diagonal wipe or iris — exact
   style left as a rendering detail), overworld freezes underneath.
3. **Battle screen.** Dedicated view: player sprite and opponent
   sprite facing off, HP/Effort/R/C readouts for both. Reuses the
   existing code-drawn sprite renderers (`drawNpcRat` / the
   `spriteAsset` image path for Fen specifically) rather than new art.
4. **Opening line.** Enemy's turn-1 dialogue plays before their first
   move resolves (§10).
5. **Battle loop** runs per §3 until win/loss.
6. **Wipe out.** Reverse transition back to the overworld, player
   restored to their pre-battle tile and facing.

## 10. Per-Move Dialogue Triggers

Every move is tied to a specific line, delivered in the same dialogue
box already used for NPC conversations (`RatLand.showDialogue`),
fired the moment that move is used — so combat stays in-voice with
each character's `NPC_DIALOGUE.md` personality instead of feeling
like a bolted-on separate system.

**Fen Wicket's "Persecution Complex"** is gated by turn number rather
than resources — intended to trigger **around turn 3–4** rather than
being available from turn 1. The precise gating rule (exactly turn 3?
turn 4? first-available-in-that-window?) isn't pinned down — flagged
in §11.

## 11. Open Questions / Assumptions Needing Confirmation

1. **Defence's exact mechanical effect** (§4a) — how much a point of
   Defence reduces/increases damage by, and whether it persists or
   decays.
2. **The "confident opponent" tag** — the player's Fact, "Actually…,"
   has "reduced effect vs confident opponents." Which opponents count
   as confident, and is it a binary tag or a spectrum? Not specified.
3. **What Effort actually does in this test kit** (§2.2) — no
   confirmed move spends it. Presumably reserved for a future move
   type; worth confirming it's not an oversight.
4. **HP-floor handling for the win condition** (§5) — recommended the
   soft-floor-at-1 approach; needs sign-off, plus the exact
   near-miss line(s) to display.
5. **Exact Reputation gain on win** (§7) — not specified; recommend a
   small flat amount (e.g. +1) to start.
6. **Post-loss HP/Effort state** (§6) — recommend resetting to full;
   needs sign-off.
7. **Exact "Persecution Complex" turn-gating rule** (§10) — "around
   turn 3–4" needs to become a precise rule before implementation.
8. ~~Battle trigger mechanism~~ — **resolved in §8:** selecting Fight
   from the pre-battle menu.
9. **Exact numeric values behind "moderate dmg" and "small self-heal"**
   in §13 — given as qualitative in the source spec rather than
   exact numbers; need concrete values before implementation.
10. **Two dialogue lines aren't specified** (§13): Fen's "Someone's
    Going to Drown" Fact, and the player's Rhetoric/Consideration.
    Left blank rather than invented — see the notes in §13.
11. **How "fightable" is marked, and how the per-NPC Talk/Fight
    relationship (§8) is configured** — needs a concrete data shape
    (e.g. a flag plus a relationship setting on the relevant
    `NPC_ROSTER` entry) before implementation; not designed here in
    code terms on purpose, since this doc is pre-implementation.

## 12. Test Combatant Stats (confirmed)

| | HP | Effort | Effort regen |
|---|---|---|---|
| Player | 20 | 10 | +2 / turn |
| Fen Wicket | 18 | 10 | +2 / turn |

## 13. Test Movesets — TEST / THROWAWAY, NOT FINAL

**These movesets are explicitly placeholders for wiring up and
testing the combat system end to end. They are not final character
design and should be discarded/replaced once real move design for
Fen Wicket and the player is done.**

Dialogue lines are reproduced exactly as given where provided. Where
a line wasn't given, it's marked *(no dialogue given)* rather than
invented. Where a move's name itself reads as a natural spoken line
("Actually…", "I just want to understand"), it's used as that move's
dialogue too, on the assumption that's what it was written to be —
flagged here rather than silently assumed.

### Fen Wicket (test dummy) — 5 moves

| Move | Cost | Dialogue | Effect |
|---|---|---|---|
| Rhetoric | 0 | "You're not even listening to me!" | 2 dmg, +1 R |
| Consideration | 0 | "…alright, fair point." | Heals 2 (self), +1 C |
| Fact — "Council Tax Correction" | 2 R | "The Church gets more funding than my street does, and everyone knows it." | Moderate dmg; −1 enemy Defence |
| Fact — "Someone's Going to Drown" | 2 R | *(no dialogue given)* | Moderate dmg; +1 Fen Defence |
| Feeling — "Persecution Complex" (turn 3–4 only) | 3 C | "Everyone's against blokes like me these days." | Lowers enemy Effort significantly; +2 Fen Defence; the next enemy Fact used against Fen deals bonus damage |

Note on "Persecution Complex": the "next enemy Fact deals bonus
damage" clause is a real vulnerability, not a typo — Fen's
defensiveness raises his Defence generally but leaves him specifically
exposed to a well-aimed Fact, which fits his character (per
`NPC_DIALOGUE.md`: "I expect I do know, actually. I just don't like
saying it").

### Player starter — 4 moves

| Move | Cost | Dialogue | Effect |
|---|---|---|---|
| Rhetoric | 0 | *(no dialogue given)* | 2 dmg, +1 R |
| Consideration | 0 | *(no dialogue given)* | Heals 2 (self), +1 C |
| Fact — "Actually…" | 2 R | "Actually…" | Moderate dmg; reduced effect vs. "confident" opponents (§11.2) |
| Feeling — "I just want to understand" | 3 C | "I just want to understand" | −1 enemy Defence; small self-heal |
