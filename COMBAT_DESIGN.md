# Combat Design — Rat Land

**Status: design review draft. No combat code has been written yet.**
This document is for review and revision before any implementation
starts. Section 12 (the test movesets) is incomplete — see the note
at the top of that section.

## 1. Concept

Turn-based "debate combat." Rat Land's whole setting is an argument
(per `WORLD.md` and `NPC_DIALOGUE.md`), so fights are framed the same
way: **Rhetoric** (basic jabs) and **Consideration** (basic
conciliation) are the free, always-available moves, while **Facts**
and **Feelings** are costed special moves standing in for hard
evidence and emotional appeal. The thematic point (see §5) is that
out-shouting or out-soothing someone isn't a real win — you have to
land both a Fact and a Feeling to actually convince anyone.

## 2. Resource Pools

Three pools, tracked per combatant:

1. **HP** — depletes toward zero. Reaching zero ends the battle,
   subject to the win-condition rule in §5.
2. **Effort** (MP equivalent) — spent on Facts/Feelings. Regenerates
   automatically at the start of each of that combatant's turns.
3. **R/C Meter** — two independent counters, **R** (Rhetoric
   build-up) and **C** (Consideration build-up), each incremented by
   1 whenever the matching basic move is used. See §10 for what these
   are assumed to gate.

## 3. Turn Order

**Enemy always acts first**, every round. No speed stat, no
randomness in who goes first.

Round loop:
1. Enemy turn (move resolves, dialogue line fires).
2. Player turn (move resolves, dialogue line fires).
3. End-of-round upkeep: Effort regen for both sides, any status
   effects tick.
4. Repeat until a win/loss condition is met.

This keeps enemy dialogue reliably "opening" every round — e.g. Fen
can always land a barbed remark before the player gets to respond to
it, which matters for a character whose whole thing is deflection.

## 4. Move Types

| Move | Cost | Base effect | Meter |
|---|---|---|---|
| **Rhetoric** (basic attack) | 0 Effort | 2 dmg to opponent | +1 R |
| **Consideration** (basic heal) | 0 Effort | 2 HP healed (self) | +1 C |
| **Facts** (costed special) | Effort cost, per-character | Damage, typically higher than Rhetoric; may include self-damage as a trade-off | — |
| **Feelings** (costed special) | Effort cost, per-character | Heal/buff/debuff, typically stronger than Consideration; may include self-damage or another trade-off | — |

Rhetoric and Consideration are always available to everyone regardless
of resources. Facts and Feelings are where a character's personality
and moveset design actually lives — their exact costs, effects, and
trade-offs are per-character (§12) and the two test movesets are not
yet filled in.

## 5. Win Condition

Standard win trigger: reduce the opponent's HP to 0.

**Modifier:** HP hitting 0 only counts as an actual win if the winning
side has used **at least one Fact and at least one Feeling** at some
point earlier in the battle. Pure Rhetoric-spam (or Rhetoric +
Consideration stalling) cannot win a fight on its own, no matter how
much damage it does — mechanically enforcing the theme that winning
an argument takes both evidence and empathy.

**Recommended handling (flag for confirmation, see §10):** treat this
as a soft floor. If a hit would take the opponent to ≤0 HP but the
attacker hasn't used both a Fact and a Feeling yet, clamp their HP at
1 instead of ending the battle, and play a line acknowledging the
near-miss (e.g., Fen: *"You're not wrong. But you haven't said why it
matters."*). Once both move types have landed, the next KO-would-be
hit resolves as a real win.

## 6. Loss State

If the **player's** HP hits 0: immediately booted from the battle.
The opponent gets one dismissive closing line (per-character, in
their established voice). No mechanical penalty — no Reputation
loss, no stat carryover — the player is simply returned to the
overworld. (Whether HP/Effort reset to full or stay as they were:
recommend resetting to full so a loss doesn't create a death-spiral
before the player even understands the system — flagged in §10.)

## 7. Reputation & Save Integration

On a win: increment `game.reputation` (exact amount TBD, see §10),
then call `RatLand.saveGame(game)` immediately — the same
autosave-on-significant-event pattern already used for map
transitions (`js/transitions.js`), so a win is never lost to a
refresh or crash. No new save-file fields are needed: `reputation`
already exists in the save shape (`js/save.js`), and `unlockedMoves`
already exists for whenever combat starts actually unlocking new
player moves (not yet, in this test design — the starter kit in §12
is fixed for the whole test fight).

## 8. Battle Transition Sequence (Pokémon-style)

Battle is a new top-level game mode alongside the existing
`'overworld'` / `'interior'` (see `main.js`), e.g. `'battle-transition'`
→ `'battle'` → back to `'overworld'`.

Sequence beats:
1. **Trigger.** Player interacts with (or, later, randomly
   encounters) a combat-flagged NPC. For the Fen Wicket test dummy,
   this will be an explicit trigger while final design is pending —
   exact trigger mechanism (walk-into vs. Talk-button prompt vs. debug
   hook) is an implementation detail, not fixed here.
2. **Wipe in.** Screen transitions (classic diagonal wipe or iris —
   exact style is a rendering detail, left open), overworld freezes
   underneath.
3. **Battle screen.** Dedicated view: player sprite and opponent
   sprite facing off, HP and Effort bars for both. Reuses the
   existing code-drawn sprite renderers (`drawNpcRat` /
   `drawMouseNpc` / the `spriteAsset` image path) rather than new art,
   consistent with how the rest of the game is built.
4. **Opening line.** Enemy's turn-1 dialogue plays before their first
   move resolves (ties into §9).
5. **Battle loop** runs per §3 until win/loss.
6. **Wipe out.** Reverse transition back to the overworld, player
   restored to their pre-battle tile and facing.

## 9. Per-Move Dialogue Triggers

Every move a character has is tied to a specific line, delivered in
the same dialogue box already used for NPC conversations
(`RatLand.showDialogue`), fired the moment that move is used. This
keeps a character's combat behavior in-voice with their
`NPC_DIALOGUE.md` personality rather than combat feeling like a
bolted-on separate system.

**Special case — Fen Wicket's "Persecution Complex":** gated by turn
number rather than by resources, intended to trigger **around turn
3–4** rather than being available from turn 1. Exact gating rule
(fixed turn 3? turn 4? first-available-turn-in-that-window with some
condition?) is not yet specified — flagged in §10.

## 10. Open Questions / Assumptions Needing Confirmation

These are places where the brief implies a mechanic but doesn't pin
down the exact number or rule. Flagging rather than guessing:

1. **What do the R/C meters actually do once built up?** Working
   assumption: they gate access to Facts/Feelings (e.g., a Fact
   requires R ≥ some threshold, a Feeling requires C ≥ some
   threshold), on top of their Effort cost — mirroring a "build up,
   then spend" rhythm common to turn-based combat. This is *not*
   stated explicitly in the brief and needs confirming before
   implementation; the meters could instead just be a visible stat
   with no gating effect at all.
2. **HP-floor handling for the win condition (§5).** Recommended the
   soft-floor-at-1 approach; needs sign-off, and the exact
   near-miss line(s) need writing per opponent.
3. **Exact Reputation gain on win.** Not specified — recommend a
   small flat amount (e.g. +1) to start, adjustable per-opponent
   later once there's more than one fight to balance against.
4. **Post-loss HP/Effort state.** Recommend resetting to full on
   being booted from battle; needs sign-off.
5. **Exact "Persecution Complex" turn-gating rule.** "Around turn
   3–4" needs to become a precise rule (fixed turn, range, or
   conditional) before implementation.
6. **Battle trigger mechanism** for the Fen Wicket test fight
   specifically (§8, beat 1) — walk-into-NPC, a Talk-button prompt,
   or a manual debug hook.

## 11. Test Combatant Stats (confirmed)

| | HP | Effort | Effort regen |
|---|---|---|---|
| Player | 20 | 10 | +2 / turn |
| Fen Wicket | 18 | 10 | +2 / turn |

Shared basic moves (both combatants):
- **Rhetoric:** 2 dmg, 0 Effort cost, +1 R
- **Consideration:** 2 heal (self), 0 Effort cost, +1 C

## 12. Test Movesets — TEST / THROWAWAY, NOT FINAL

**These movesets are explicitly placeholders for wiring up and
testing the combat system end to end. They are not final character
design and should be discarded/replaced once real move design for
Fen Wicket and the player is done.**

**This section is currently incomplete.** The exact 5 moves +
dialogue for Fen Wicket and the exact 4 moves + dialogue for the
player's starter kit were referenced as being pasted in from an
earlier point, but that text didn't come through — it isn't in this
conversation and isn't recorded anywhere in the repo
(`NPC_DIALOGUE.md`, `js/npc.js`, etc. all checked). Rather than invent
exact numbers and dialogue lines that were asked to be precise, this
section is left as a placeholder pending that text.

### Fen Wicket (test dummy) — 5 moves

- Rhetoric and Consideration as per the shared basics in §11.
- One Fact move — cost/effect/dialogue: **TBD.**
- One Feeling move — cost/effect/dialogue: **TBD.**
- **Persecution Complex** — Fen's turn-3–4-gated special (see §9,
  §10.5) — cost/effect/dialogue: **TBD.**

### Player starter — 4 moves

- Rhetoric and Consideration as per the shared basics in §11.
- One Fact move — cost/effect/dialogue: **TBD.**
- One Feeling move — cost/effect/dialogue: **TBD.**
