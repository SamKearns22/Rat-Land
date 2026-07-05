# Combat Design — Rat Land

**Status: design review draft. No combat code has been written yet.**
This document is for review and revision before any implementation
starts. The two movesets in §14 are explicitly test/throwaway (see
that section) and a handful of smaller mechanics still aren't fully
pinned down — flagged in §12 rather than guessed.

**§24 supersedes the Defence-stacking system.** Fen's kit was
redesigned from the ground up (§24): the permanent Defence stat,
"Someone's Going to Drown," "Council Tax Correction," and Persecution
Complex are all removed entirely, replaced by a single move (Big
Swing) and a single status pair (Exposed / Primed). §4a, §4b, and §14
below now describe the *current* system post-redesign. §15–§23 are
left as-is as a historical record of the Defence-era playtesting that
led up to it — their specific round-count and Defence/Confident/
Persecution/Drown claims describe that earlier system, not the
current one; see §24 for the current numbers and verification.

## 1. Concept

Turn-based "debate combat." Rat Land's whole setting is an argument
(per `WORLD.md` and `NPC_DIALOGUE.md`), so fights are framed the same
way: **Rhetoric** (basic jabs) and **Consideration** (basic
conciliation) are free, always-available moves, while **Facts** and
**Feelings** are costed specials standing in for hard evidence and
emotional appeal. The thematic point (see §5) is that out-shouting or
out-soothing someone isn't a real win — landing both a Fact and a
Feeling is what actually convinces anyone.

## 1a. Standing Progression & Moveset Design Rules

Documentation only — no implementation yet. These are **standing
constraints on all future fight and move design** across the planned
15-fight arc (including the 4 bosses within it), not a one-off note
about Fen Wicket. Any new fight, move, or enemy added later must be
checked against both rules below before it's considered done.

**Progression rule.** Each new move/skill the player unlocks from
defeating an opponent must be the key mechanic needed to solve the
*next* fight in the sequence — not a nice-to-have, the actual answer
to that fight's specific challenge. Difficulty rises across the
15-fight arc through three levers together, not just raw numbers:
- more aggressive enemy movesets (more moves in rotation, more
  frequent/earlier use of their strongest options),
- stronger move potency (bigger numbers on both sides — damage,
  healing, Defence, meter costs), and
- more advanced move/status combinations required to win (later
  fights ask the player to sequence and combine tools, not just spam
  whichever move currently hits hardest).

**Player moveset rule.** The player's moveset must grow over the
course of the 15-fight arc — later fights add new moves rather than
replacing earlier ones. Two things must both hold at every point in
that growth:
- **No obsolescence:** every previously-unlocked move stays viable in
  later fights. A move earned from fight 2 should still have a real
  reason to be pressed by fight 14, even if it's no longer the star.
- **No power creep:** no move should become overpowered relative to
  the others in the player's kit. A newer, flashier move must not
  strictly dominate an older one across the board — each move keeps
  its own niche (cost, condition, or combo it's best suited for)
  rather than the moveset collapsing into "always use the newest one."

Fen Wicket (§13–§21) is the test dummy for the underlying engine
mechanics, not an example of the full 15-fight arc's balance — it's a
single fight, so the progression rule (which is inherently about the
*sequence* of fights) doesn't yet have anything to apply to. Both
rules above take effect starting with whatever content actually builds
out that sequence.

## 2. Resource Pools

Three pools, tracked per combatant:

1. **HP** — depletes toward zero. Reaching zero ends the battle,
   subject to the win-condition rule in §5.
2. **Effort** (MP equivalent) — 10 for both test combatants,
   regenerates +2 per turn, every round, for both sides regardless of
   which move was used (§3). Assumed capped at its starting value of
   10 (a stat pool that regens "toward" a max, same convention as
   HP) — this isn't stated explicitly but §15's playtest analysis
   depends on it being capped somewhere; flagged in §12.
3. **R/C Meter** — two independent counters, **R** (Rhetoric
   build-up) and **C** (Consideration build-up), each incremented by
   1 whenever the matching basic move is used. **Capped at 10**, same
   as Effort — previously uncapped, which let a meter climb without
   bound over a long fight (found during extended playtesting; fixed).

## 3. Turn Order

**Enemy always acts first**, every round. No speed stat, no
randomness in who goes first.

Round loop:
1. Enemy turn (move resolves, dialogue line fires).
2. Player turn (move resolves, dialogue line fires).
3. End-of-round upkeep: Effort regen (+2) for both sides, any status
   effects (Confident, Defence changes — §4a/§4b) tick or expire.
4. Repeat until a win/loss condition is met.

This keeps enemy dialogue reliably "opening" every round — e.g. Fen
can always land a barbed remark before the player responds to it.

## 4. Move Types

| Move | Cost | Base effect | Meter |
|---|---|---|---|
| **Rhetoric** (basic attack) | 0 | 2 dmg to opponent | +1 R |
| **Consideration** (basic heal) | 0 | 2 HP healed (self) | +1 C |
| **Facts** (costed special) | R meter (as specified per move) **+ 3 Effort** | Damage (typically more than Rhetoric); may carry a trade-off or side-effect | — |
| **Feelings** (costed special) | C meter (as specified per move) **+ 4 Effort** | Heal/buff/debuff (typically stronger than Consideration); may carry a trade-off or side-effect | — |

Rhetoric and Consideration are always available to everyone and never
cost Effort. Facts and Feelings now spend **both** their R/C amount
*and* a flat Effort cost (3 for any Fact, 4 for any Feeling) — see the
confirmed test kits in §14 for exact per-move numbers.

### 4a. Exposed & Primed (status effects, replacing Defence — §24)

**Defence-stacking is gone entirely.** In its place, damage math for
every hit is now:

1. Start with the move's base damage.
2. If the attacker is **Primed** (granted by the player's Feeling,
   "I just want to understand"), add its flat bonus (+2) — then clear
   Primed, whether or not this hit actually landed for damage.
3. If the defender is **Exposed** (granted by Fen's Big Swing landing
   on his opponent — it exposes *Fen*, not whoever he hit), double the
   running total — then clear Exposed.

Both statuses are one-shot: each is consumed by the very next attack
that checks for it, regardless of which move that attack was, and
neither persists past that. A Primed hit landed during an Exposed
window benefits from both at once (add the flat bonus, then double).
Unlike the old Defence stat, neither status is itself a resource pool
(§2) or something a move can "raise" incrementally — a combatant
either currently has the status or doesn't.

### 4b. Confident — removed (§24)

Confident (the temporary status the old Persecution Complex granted,
which halved the player's "Actually…" for a turn) no longer exists —
it was tied entirely to Persecution Complex and the old "any Fen Fact
grants Confident" rule, both removed in the §24 redesign along with
the rest of the Defence-stacking kit. See §4a for the current status
pair (Exposed / Primed) and §24 for the full redesign writeup.

## 5. Win Condition

**HP hitting 0 always ends the battle immediately as a win for
whoever landed the hit — no exceptions, no soft floor.** (Revised in
§21; the original design used a hard Fact+Feeling gate with a 1-HP
clamp on any would-be KO that didn't satisfy it — removed entirely,
including its "nearly went down" log line.)

Fact+Feeling is no longer a *rule* the engine enforces — it's the
*practically necessary* strategy given Fen's numbers. As of the §24
redesign, this no longer rests on a permanent Defence stat: Fen's
reactive AI switches to pure self-heal (Consideration) the moment his
own HP drops below 30%, and Rhetoric/Consideration-only play can't
reliably out-pace that heal on its own — see §24 for the current
exhaustive-search confirmation (basics-only cannot win within a
depth-45 search) and the human-heuristic verification.

## 6. Loss State

If the **player's** HP hits 0: immediately booted from the battle.
The opponent gets one dismissive closing line (per-character, in
their established voice — Fen's would fit his weary, deflecting tone
from `NPC_DIALOGUE.md`). No mechanical penalty — no Reputation loss,
no stat carryover — the player is simply returned to the overworld.
Recommend resetting HP/Effort to full on being booted, so a loss
doesn't create a death-spiral before the player understands the
system (flagged in §12).

**No retreat once in battle.** The only ways out of a started battle
are win or lose (§5, §6) — there is no flee/retreat move. The one
and only "no penalty" exit is Walk Away (§8), and it's only available
*before* Fight is chosen — see §8.

## 7. Reputation & Save Integration

On a win: increment `game.reputation` (exact amount TBD, see §12),
then call `RatLand.saveGame(game)` immediately — the same
autosave-on-significant-event pattern already used for map
transitions (`js/transitions.js`), so a win is never lost to a
refresh or crash. No new save-file fields are needed: `reputation`
already exists in the save shape (`js/save.js`), and `unlockedMoves`
already exists for whenever combat starts actually unlocking new
player moves (not in this test design — the 4-move starter kit in
§14 is fixed for the whole test fight).

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

## 9. Status Effect Display (mobile requirement)

**Every active status effect (Exposed, Primed, etc. — §4a/§24) must
show an on-screen icon during battle.** Tapping/selecting an icon
shows a plain-text explanation of what it does. This is required
because the game is played on mobile with no hover state (per the
project's existing touch-first design — see `style.css` /
`js/input.js`) — a player can't discover a status's meaning by
mousing over it the way a desktop game might.

Implementation notes for whoever builds this (not fixed here, since
this doc is pre-implementation):
- Icons need to be simple and code-drawn, consistent with the rest of
  the game's sprite/UI style (no new external art pipeline).
- The tap target needs to be usable on a phone screen — same
  concern already solved for the on-screen D-pad/Talk button
  (`style.css`), reuse that sizing convention.
- Applies to *any* status effect the system supports, not just
  Exposed/Primed specifically — this is a general battle-UI
  requirement, not a one-off for Fen's kit.

## 10. Battle Transition Sequence (Pokémon-style)

**Implemented.** No separate `'battle-transition'` game mode was
needed — `main.js`'s frame loop already freezes player movement for
any mode that isn't `'overworld'`/`'interior'`, and the pre-battle
menu (`'battle-menu'`) already qualifies, so the wipe just plays while
the mode is still `'battle-menu'`/`'battle'` as normal.

`RatLand.playBattleWipe(onCovered)` (`js/combat.js`) drives a plain
CSS "Venetian blinds" wipe (`#battle-wipe`, `style.css`) — 8 vertical
bars, alternating top/bottom `transform-origin`, staggered
`animation-delay` — with no canvas or sprite art involved:

1. **Trigger.** Player selects **Fight** from the pre-battle menu
   (§8) for a fightable NPC — for this test design, Fen Wicket.
2. **Wipe in.** The bars close over ~0.27s (animation + stagger),
   covering the frozen overworld underneath.
3. **Content swap**, at the moment of full cover: `RatLand.startBattle`
   runs (builds the fresh battle state, shows the battle screen,
   plays the opening lines per §11, resolves Fen's first move).
4. **Wipe out.** The bars open over ~0.27s, revealing the battle
   screen. Total round trip ≈0.6s, confirmed by direct timing —
   comfortably under the 1s ceiling so repeated testing isn't slowed
   down.
5. **Battle loop** runs per §3 until win/loss.
6. **Exit wipe.** Tapping **Continue** after a win or loss plays the
   same wipe in reverse: covers the (still-visible) result screen,
   swaps to `RatLand.exitBattle` (back to `'overworld'`) at full
   cover, then uncovers onto the overworld. Also ≈0.6s round trip.
   **Walk Away** (§8) does *not* trigger the wipe — no battle ever
   started, so there's nothing to transition into.

Still no player/opponent sprite art in the battle screen itself (§9's
"no illustrated art" decision) — the wipe is the only animation;
everything else in the battle screen is the existing static DOM
layout.

## 11. Contextual & Randomized Battle Dialogue

Dialogue is delivered in the battle log (not the overworld dialogue
box — battle needs a scrolling history, not a single line), one line
per move as it resolves, so combat stays in-voice with each
character's `NPC_DIALOGUE.md` personality instead of feeling like a
bolted-on separate system. As of this update, each combatant's
dialogue has four parts instead of one static line per move:

1. **Opening line** — fires once, at battle start, before the turn
   loop's first move resolves. Both combatants get one, back to back
   (enemy's, then the player's), as a pre-fight beat independent of
   move selection.
2. **Finishing line** — fires once, for whichever combatant's HP
   actually hits 0 (the real KO per §5's win-condition gate — the
   soft-floor near-miss line is unrelated and unchanged). It's that
   combatant's own line, not the winner's.
3. **First-use line** — each Fact or Feeling has one unique line that
   plays the first time *that specific combatant* casts *that
   specific move*. Rhetoric and Consideration don't have one — every
   use of a basic move goes straight to its pool (below).
4. **Random pool** — 3-4 lines per move (2-4 for the ones actually
   written so far — see §14), randomly selected on every use of
   Rhetoric or Consideration, and on every use of a Fact/Feeling
   *after* its first-use line has already played once for that
   combatant.

Tracking is per-combatant, not global — the player and Fen each have
their own "has this move's first-use line played yet" state, so e.g.
Fen's first "Council Tax Correction" still shows his first-use line
even after the player has already used "Actually" several times.

**Fen Wicket's "Persecution Complex"** is also gated by turn number —
intended to trigger **around turn 3–4** rather than being available
from turn 1 (implemented: usable turns 3-4, once per battle, per
§14). Because it's once-per-battle, its random pool is defined for
completeness but never actually gets exercised in the current test
kit — only relevant if that constraint is ever lifted.

## 12. Open Questions / Assumptions Needing Confirmation

1. **Effort cap.** Assumed capped at 10 (its starting value) for
   both test combatants; not stated explicitly. §15's playtest
   analysis holds either way, but the cap should be confirmed.
2. ~~Defence's floor and persistence~~ — **moot as of §24**: Defence
   was removed entirely and replaced by the one-shot Exposed/Primed
   pair (§4a), neither of which has a "floor" or persistence question
   in the same sense (each is consumed by the very next qualifying
   attack, full stop).
3. ~~Exact size of the Confident damage reduction~~ — **moot as of
   §24**: Confident was removed entirely (§4b).
4. **HP-floor handling for the win condition** (§5) — recommended the
   soft-floor-at-1 approach; needs sign-off, plus the exact
   near-miss line(s) to display.
5. **Exact Reputation gain on win** (§7) — not specified; recommend a
   small flat amount (e.g. +1) to start.
6. **Post-loss HP/Effort state** (§6) — recommend resetting to full;
   needs sign-off.
7. **Exact "Persecution Complex" turn-gating rule** (§11) — "around
   turn 3–4" needs to become a precise rule before implementation.
8. **How "fightable" is marked, and how the per-NPC Talk/Fight
    relationship (§8) and Confident-style status triggers (§4b) are
    configured** — needs a concrete data shape (e.g. flags/settings
    on the relevant `NPC_ROSTER` entry) before implementation; not
    designed here in code terms on purpose, since this doc is
    pre-implementation.

*(Resolved by this update, no longer open: Defence's basic mechanism,
what counts as "Confident" and how it's triggered, what Effort is
for, the moderate-damage/small-heal numbers, and the two previously
missing dialogue lines — all folded into §4a, §4b, §14.)*

## 13. Test Combatant Stats (confirmed)

| | HP | Effort | Effort regen |
|---|---|---|---|
| Player | 20 | 10 | +2 / turn |
| Fen Wicket | 14 | 10 | +2 / turn |

Fen's HP was reduced from an earlier value of 18 (see §15) after an
exhaustive win-path search showed 18 made this tutorial-style first
fight too much of a grind — the fastest possible win took 18 rounds.
Below 14 HP, the fight reliably ends before Fen's Defence-stacking
moves (Drown, on top of Persecution Complex) ever compound, keeping
the player's damage effective for the whole fight; 14 was the highest
HP value that still cleared a "well under 15 rounds" target with real
margin (fastest win: 10 rounds), rather than just barely scraping
under it.

## 14. Test Movesets — TEST / THROWAWAY, NOT FINAL

**These movesets are explicitly placeholders for wiring up and
testing the combat system end to end. They are not final character
design and should be discarded/replaced once real move design for
Fen Wicket and the player is done.** Replaced in full by the §24
redesign — Fen's kit went from 5 moves down to 3, and the player's
Feeling was reworked. Facts cost their R amount **+ 3 Effort**;
Feelings cost their C amount **+ 4 Effort** (§4); Fen's Big Swing
costs Effort only, no meter (§24).

### Fen Wicket (test dummy) — 3 moves

**Opening:** "Oh, here we go. Another one come to tell me how to
think." **Finishing** (only said if his own HP hits 0): "…fine.
Fine! Maybe I've not thought it all the way through."

| Move | Cost | Effect |
|---|---|---|
| Rhetoric | 0 | 2 dmg, +1 R |
| Consideration | 0 | Heals 2 (self), +1 C |
| Big Swing | 9 Effort | 5 dmg; leaves Fen Exposed for 1 turn (next attack against him deals double damage, §4a) |

**Dialogue** (§11 — random pool used every time for Rhetoric/
Consideration; first-use line once, then random pool, for the rest):

- Rhetoric pool: "You're not even listening to me!" / "Typical." /
  "Here we go again." / "You always do this."
- Consideration pool: "…alright, fair point." / "…s'pose that's
  true." / "Hm. Didn't think of it that way." / "…fine. Whatever."
- Big Swing first use: "Right, that's it — you want a proper answer?
  Here." — pool after: "No, listen — actually listen —" / "You want
  to go on about it? Fine." (Placeholder lines — not a dialogue-polish
  pass; §24 explicitly deferred further writing on these.)

### Player starter — 4 moves

**Opening:** "Right. Okay. I can do this." **Finishing** (only said
if the player's own HP hits 0): "…maybe he's got a point, actually."

| Move | Cost | Effect |
|---|---|---|
| Rhetoric | 0 | 2 dmg, +1 R |
| Consideration | 0 | Heals 2 (self), +1 C |
| Fact — "Actually…" | 2 R + 3 Effort | 3 dmg |
| Feeling — "I just want to understand" | 3 C + 4 Effort | Heals self 3 (up from 2); primes next attack for +2 damage (§4a/§24) |

**Dialogue** (§11):

- Rhetoric pool: "I just think… we should hear them out?" / "That's
  not — that's not quite fair, is it?" / "Um. I disagree, actually."
  / "I don't think that's right."
- Consideration pool: "Okay. Let me think about that." / "…huh. Fair
  enough." / "You might be right." / "I hadn't thought of it like
  that."
- Actually first use: "Actually — sorry, I looked this up — that's
  not quite true." — pool after: "Actually, I think the numbers say
  otherwise." / "I checked, and, um, that's not right."
- I just want to understand first use: "I'm not trying to attack
  you. I just — I want to understand." — pool after: "I just want to
  get where you're coming from." / "Can you help me see it your
  way?"

## 15. Internal Playtest: Does Stockpiling Break the Move-Mix Skill Test?

*(This playtest predates the Fen HP 18→14 change in §13/§16 — it ran
against the older stats. The finding is unaffected: it's about the
Effort regen-vs-cost ratio, not Fen's HP, so lowering his HP afterward
doesn't change the conclusion below.)*

**Question asked:** does banking free Rhetoric/Consideration uses to
stockpile Effort/R/C, then unloading Facts/Feelings back-to-back,
beat playing specials the instant they're affordable — i.e. does it
let a player skip the intended "mix your moves" skill test?

**Method:** simulated both strategies turn-by-turn against a fixed
Fen rotation (player HP 20/Effort 10, Fen HP 18/Effort 10, both
regen +2/turn, Facts costing 2R+3 Effort, Feelings 3C+4 Effort,
Defence applied as a flat pre-modifier reduction per §4a), tracking
total damage dealt and turns elapsed:

| Strategy | Turns | Total dmg dealt | Dmg/turn |
|---|---|---|---|
| Immediate (use specials the instant affordable) | 15 | 32 | 2.13 |
| Stockpile 6 turns of pure Rhetoric, then burst | 15 | 32 | 2.13 |
| Stockpile 12 turns of pure Rhetoric, then burst | 15 | 30 | 2.00 |
| Immediate, Effort artificially uncapped | 15 | 32 | 2.13 |
| Stockpile (12t), Effort artificially uncapped | 15 | 30 | 2.00 |

**Finding: stockpiling does not become a dominant strategy — at best
it ties immediate play, and over-banking is actually slightly worse.**
The reason is Effort, specifically because of the cost added in this
update: a Fact costs 3 Effort and a Feeling costs 4, against only +2
regen per turn. That ratio means the *long-run* rate of specials a
combatant can sustain is capped by the regen rate, not by how much R,
C, or Effort was banked ahead of time — over any sufficiently long
stretch of the fight, total Effort spent can't exceed total Effort
regenerated (plus the fixed starting pool), so clumping casts into a
burst now just means fewer casts are available later; it doesn't
increase the total. This held even when Effort's cap was removed
entirely in the test, confirming the regen-vs-cost *ratio* is what's
doing the throttling, not the cap specifically.

**This is a direct result of this update's change, not a coincidence.**
Under the *previous* draft (Facts/Feelings costing only R/C, no
Effort), there was no such throttle — R/C had no stated cap, so
stockpiling them indefinitely would have let a player fire an
unlimited burst of specials back-to-back with nothing to stop them,
which *would* have been a genuine dominant-strategy problem. Adding
the flat Effort cost closes that loophole.

**Not flagged as a problem, but worth knowing:** a player might still
rationally bank a little heading into a turn where they specifically
want to guarantee landing a Fact *and* a Feeling in quick succession
(e.g. to close out the win condition in §5). That's a legitimate
timing/tactics choice most turn-based games embrace, not a
throughput exploit — it doesn't let them deal more total damage or
finish the fight faster than disciplined immediate play, per the
table above.

## 16. Internal Playtest: Fastest Possible Win (Tutorial Pacing)

**Question asked:** this is meant to be a tutorial-style first fight,
not a grind — how many rounds does the *fastest possible* skilled win
actually take, and is that reasonable?

**Method:** an exhaustive search (not a heuristic playthrough) over
every legal player move at every turn, using Fen's real deterministic
AI (§11/§14) as the opponent, with iterative deepening to guarantee
the *shortest* winning sequence is the one reported, not just "a"
winning sequence. Each candidate sequence was then replayed against
the actual implemented battle code (not just the search's own model of
it) to confirm the two agree.

**Finding, round 1 (Persecution Complex at +2 Defence, Fen HP 18):**
fastest possible win took **40 rounds** — far too long for a tutorial
fight. Persecution Complex's Defence gain compounding with Drown's own
Defence gain made the player's basic attacks nearly worthless for most
of the fight, forcing a long grind of repeated "I just want to
understand" casts just to keep Fen's Defence in check.

**Finding, round 2 (Persecution Complex reduced to +1 Defence, Fen HP
still 18):** fastest possible win dropped to **18 rounds** — better,
but still above a "well under 15 rounds" target.

**Finding, round 3 (Fen HP reduced 18→14, Persecution Complex still
+1):** fastest possible win dropped to **10 rounds**. Comparison of
single-number changes tested at this stage, all starting from the
18-round baseline:

| Change | Fastest win |
|---|---|
| (baseline) Fen HP 18 | 18 rounds |
| Fen HP → 16 | 17 rounds |
| **Fen HP → 14 (adopted)** | **10 rounds** |
| Fen HP → 12 or 10 | 10 rounds (no further gain) |
| Player's "Actually" damage 3→5 instead | 11 rounds |
| Player's "I just want to understand" C-cost 3→2 instead | 14 rounds (barely clears target) |

There's a sharp cliff between Fen HP 16 (17 rounds) and 14 (10 rounds):
below 14 HP, the fight reliably ends before Fen's Defence-stacking
moves (Drown, on top of Persecution Complex) ever get a chance to
compound, so the player's damage stays effective for the whole fight
instead of getting ground down partway through. Fen's HP was the
cleanest lever — a pure stat change rather than a move redesign — and
the only one of the tested options that cleared the target with real
margin rather than barely scraping under it.

**Adopted: Fen HP 14** (§13). Fastest possible win is now 10 rounds,
confirmed against the live battle code, not just this search's model
of it.

## 17. Bugfixes From Extended Playtesting (R/C Cap, Persecution Defence)

Two bugs surfaced during longer playtest sessions, fixed here:

1. **R/C meters were uncapped.** A passive-play test pushed the
   player's C meter to 57 before the fight ended — no bound at all.
   Fixed: both meters now cap at 10, same as Effort (§2).
2. **"Persecution Complex"'s +1 Defence never reverted.** It's meant
   to be a temporary buff tied to Fen's 1-turn Confident window
   (§4a/§4b), but the code just added it permanently. Fixed: the
   bonus is now tracked separately from Fen's overall Defence and
   fully subtracted back out the moment Confident expires, regardless
   of how many times the grant happens (moot today, since Persecution
   Complex is once-per-battle, but the fix doesn't depend on that).

**Investigation note:** the bug report described this as Defence
"stacking indefinitely across multiple uses," but Persecution Complex
can only ever be cast once per battle (§14), so its own contribution
was never literally capable of stacking — confirmed by tracing a full
passive-play fight turn-by-turn before writing the fix: Persecution's
+1 landed exactly once, at turn 4, and never moved again all fight.
The indefinite stacking that's actually reproducible comes from
**"Someone's Going to Drown"**, which grants Fen +1 Defence *every*
time it's cast (unlimited reuse, no cap, no reversion) — in that same
traced fight, Defence climbed to 9 by turn 58 purely from repeated
Drown casts. This is very likely what was actually observed. The fix
above only touched Persecution Complex at the time, per what was
explicitly asked; Drown's stacking was initially left as a recorded
decision to revisit later (§12.2).

**Follow-up: Drown's Defence gain is now also capped, at +3 total.**
Regardless of how many times "Someone's Going to Drown" is cast, once
Fen's Drown-sourced Defence reaches +3 further casts still deal damage
but stop adding Defence — the same capped, non-stacking pattern now
used for R/C (§2) and Persecution Complex (§4a/§4b). Re-traced the
same long passive-play fight: Defence climbs 1/1/1 on the first three
casts then plateaus at 3 for the rest of the fight (through turn 58),
instead of climbing to 9.

**Re-ran the exhaustive win-path search (§16) after the R/C cap and
both Defence fixes.** Fastest possible win is still **9 rounds** —
capping Drown's Defence gain doesn't change it, since the fastest win
doesn't involve Fen casting Drown enough times to hit the new +3 cap
anyway. Confirmed against the live battle code: the 9-round sequence
`consideration ×3, understand, rhetoric ×3, actually, rhetoric` wins
with the player finishing at 13/20 HP. Loss, no-retreat, and Talk/Fight
independence were all re-verified afterward and are unaffected.

**Noted here, resolved in §11/§18:** battle dialogue used to repeat
every time a given move was used, since each move had exactly one
line defined. Fixed by the contextual/randomized dialogue system
added in §11 — opening/finishing lines, a first-use line per Fact/
Feeling, and a random 3-4 line pool for every repeat use.

## 18. Verification: Contextual & Randomized Dialogue (§11)

Confirmed against the live battle code, not just by reading the code:

- **Opening lines:** the first two log entries on battle start were
  Fen's opening line, then the player's, in that order, before any
  move resolves — matches every battle started during testing.
- **Finishing lines:** a win test (the confirmed 9-round sequence
  from §16) ended with Fen's finishing line as the last log entry
  the instant his HP hit 0. A separate loss test (passive player,
  always Consideration) ended with the player's finishing line as
  the last entry the instant *their* HP hit 0. Both fire only on the
  real KO — the unrelated soft-floor near-miss line (§5) is untouched.
- **First-use lines:** driving the player's "Actually" twice in a row
  (rebuilding R between casts) showed the unique first-use line on
  the first cast and a *different* line (from the pool) on the
  second — never the first-use line repeating. A separate run let
  Fen's AI play out naturally (player passively using Consideration)
  and confirmed all three of his Fact/Feeling first-use lines fired
  exactly once each, followed by pool lines on any subsequent casts
  of the same move (Council Tax Correction and Someone's Going to
  Drown were each cast more than once in that run; Persecution
  Complex only ever fires once regardless, per its own once-per-
  battle limit).
- **Random pool rotation:** casting the player's Rhetoric 25 times in
  a row surfaced all 4 pool lines in non-sequential order, confirming
  it's genuinely randomized rather than stuck on one line or cycling
  in a fixed sequence.

No regressions: re-ran the existing loss, no-retreat, and Talk/Fight-
independence checks afterward — all still pass.

## 19. Battle Sound Effects

Four short SFX, one per move category, triggered every time either
combatant uses a move of that category:

| Category | File | Triggers on |
|---|---|---|
| Rhetoric ("hurt") | `assets/sfx/rhetoric.wav` | Rhetoric (either side) |
| Consideration ("book"/page-flip) | `assets/sfx/consideration.wav` | Consideration (either side) |
| Facts ("spell") | `assets/sfx/fact.wav` | Any Fact (either side) |
| Feelings ("spell — fire") | `assets/sfx/feeling.wav` | Any Feeling (either side) |

**These four files are locally-synthesized placeholders, not the real
CC0 pack.** The request was to source them from the free "80 CC0 RPG
SFX" pack (opengameart.org/content/80-cc0-rpg-sfx), but this
environment's network policy blocks that host (and general web
hosts generally — only a small allowlist like npm/PyPI/GitHub is
reachable), confirmed via both a direct request and the WebFetch tool
returning a policy-level 403. Per the user's own choice among the
options offered, `js/audio.js`'s four `.wav` files were generated
locally instead (pure-stdlib Python DSP — short noise/tone synthesis,
no external assets), clearly labeled as stand-ins in that file's
header comment, to be swapped for the real pack's "hurt" / "book" /
"spell" / "spell (fire)" files whenever they're available — the
filenames and trigger wiring don't need to change when that happens.

A mute toggle (🔊/🔇, top-right HUD, next to Reset Save) was added
since none existed; it's a global on/off, persisted to localStorage,
not scoped to just battle.

## 20. Fen's Battle Sprite & Move Animations

Fen's existing overworld sprite (`assets/fenwicket-sprite.png`, no new
art) is now displayed in the opponent panel, scaled up (58px wide,
`image-rendering: pixelated` to stay crisp) and laid out beside his
name/HP/EF bars and status icons via a flex row. The player's side
stays text/stat-only, as no player sprite exists yet.

Two short CSS keyframe animations stand in for real attack/hit art:

| Trigger | Class | Effect | Duration |
|---|---|---|---|
| Fen uses any move | `sprite-attack` | shifts down/forward then back | 0.28s |
| Fen takes damage (dmg > 0) | `sprite-hurt` | shifts up/back + brightness flash | 0.3s |

Both are re-triggered by removing the class, forcing a reflow, then
re-adding it, so back-to-back triggers of the same animation restart
cleanly instead of no-op'ing.

**Turn-order timing change.** Since turn order is enemy-first (§3),
Fen's next move previously ran in the same synchronous tick as the
player's move resolving — so a damaging hit's `sprite-hurt` trigger and
Fen's immediately-following `sprite-attack` trigger would stomp each
other before either was ever painted, silently swallowing the hurt
flash on every non-fatal hit. Fixed by deferring Fen's turn behind a
320ms gap (`ENEMY_TURN_GAP_MS`) after the player's move resolves and
renders: the player sees their own hit (and Fen's hurt-flash, if it
landed) immediately, then Fen's turn — and his attack-bounce — plays
after the gap. Move buttons are disabled for the duration
(`battle.turnGapPending`) so the player can't queue a second move
mid-gap. Total added latency per round is 320ms, well under the "keep
turns snappy" bar the wipe transition (§10) was held to.

## 21. Win-Condition Rebalance, Controls-Overlap Follow-Up, Fen Move Explanations, Scrollable Log

Four fixes, verified independently.

**1. Win condition: instant KO, no soft floor (§5 rewritten).** The
Fact+Feeling gate — clamp any would-be KO at 1 HP unless the attacker
had already used both a Fact and a Feeling — is deleted entirely,
including the "nearly went down" log line and the `usedFact`/
`usedFeeling` tracking that only existed to serve that gate. HP
hitting 0 now always ends the battle immediately, symmetrically for
both sides.

Removing the gate outright would have let pure Rhetoric spam win in 7
rounds (faster than any Fact+Feeling path), so Fen's numbers were
rebalanced to make Fact+Feeling the *practically* fastest strategy
instead of a hard requirement: **Fen now has a flat +1 baseline
Defence that never wears off on its own** — only the player's Feeling
("I just want to understand," which lowers a target's Defence by 1)
can strip it. Everything else (Rhetoric 2 dmg, Actually 3 dmg, Fen's
14 HP) is unchanged.

Re-ran the exhaustive iterative-deepening win-path search (offline
mirror of the real engine, replayed against the browser to confirm no
drift) under three player-moveset restrictions:

| Player restricted to | Result |
|---|---|
| Rhetoric + Consideration only (no Facts, no Feelings) | **No win found within 60 moves** (52,975+ states explored) — Fen's heal (+2 whenever he drops ≤40% HP) can't be reliably outpaced through 1 net point of Defence, so the fight settles into a permanent stand-off rather than a loss or a stall the player could push through by grinding longer. |
| Facts allowed, Feelings excluded | **No win found within 60 moves** either (23,121 states) — Actually's extra damage isn't enough on its own to break past the same Defence-soaked heal-loop. |
| Full moveset | **Win in 10 rounds**: `consideration ×3, understand, rhetoric ×4, actually, rhetoric` — banks Consideration→Feeling meter, strips Fen's Defence with the Feeling once, then finishes with Rhetoric/Actually at full (un-reduced) damage. |

So under the new numbers, a Fact+Feeling strategy isn't just faster —
it's the *only* strategy that terminates in a search up to 60 player
moves; basics-only and facts-only both provably stall forever against
Fen's current AI. The full-moveset fastest win (10 rounds) is
confirmed against the live browser engine: `enemyHp: 0`, `+1
Reputation`, persists after reload. (Previously 9 rounds under the
old gate — the one extra round is the cost of the required Consideration
→Understand setup.)

**2. Controls-overlap follow-up: the battle-wipe transition itself
was still leaking the D-pad (§10, §20 follow-up).** The earlier fix
(hide `#controls` via `#dialogue-box.visible ~`, `#prebattle-menu.visible ~`,
`#battle-screen.visible ~`) missed a real transitional window: pressing
Fight closes `#prebattle-menu` synchronously, but `#battle-screen`
doesn't get `.visible` until the wipe's `onCovered` callback fires
~300ms later. For that whole window neither overlay's CSS rule
applies, so the D-pad reappeared underneath the wipe — and since the
wipe is a staggered "Venetian blinds" scale-in (bars growing from 0 to
full height over 0.22s with up to 0.054s of stagger between them),
there are real gaps between bars while they're still animating, which
is when the D-pad showed through. Confirmed by sampling
`getComputedStyle(#controls).display` every 25ms through the whole
transition: 11 of 27 samples (t=6ms–282ms) showed `block` before the
fix, 0 of 27 after. A fixed-viewport Playwright check that waits for
the transition to finish before sampling (as the original verification
did) would never observe this — it only shows up sampling mid-animation,
which is exactly what a real device does by just being on-screen the
whole time. Fixed by adding `#battle-wipe.visible ~ #controls` to the
same hiding rule, so controls stay hidden for the wipe's full covered
window regardless of which specific overlay's class state lags behind.
The exit-transition direction was already correct (samples confirmed
0 leaks before and after).

**3. Tap-to-reveal explanations extended to Fen's moves.** Previously
only the player's own moves got a plain-text description (via the
select-then-confirm flow, §9). Fen's moves now carry the same kind of
`description` string, and his status-icon row (§9) gets one more
always-present, tappable icon — 💬 — showing "Fen's last move — <label>:
<description>" in the same shared explanation area the R/C/Defence/
Confident icons use. No new UI surface or event wiring: it reuses the
existing delegated tap handler. Verified across a full fight that the
text updates correctly turn to turn (Consideration → Persecution
Complex → Rhetoric → Council Tax Correction, matching Fen's actual AI
choices) rather than getting stuck on his first move.

**4. Battle log made genuinely scrollable.** The log already had
`overflow-y: auto` in CSS, but `renderBattleUI` was force-scrolling it
to the bottom on *every* render — including ones that don't even add a
line, like just highlighting a move — which fought any manual scroll-up
before the player could read it. Fixed with a "sticky bottom" pattern:
the log only auto-scrolls to the newest line when (a) new lines
actually arrived and (b) the player was already reading near the
bottom; if they'd scrolled up to review earlier lines, a new line no
longer yanks them back down. Verified: scrolling to the top and then
triggering a no-op render (move highlight) leaves `scrollTop` at 0;
executing an actual move while scrolled up also leaves it at 0 instead
of snapping to the bottom; scrolling back to the bottom and executing
another move re-engages the auto-follow.

Full existing regression suite (Walk Away, Talk, Fight-after-Talk,
no-retreat, loss, win, sprite/animation, mobile layout) re-run and
passing after all four fixes.

## 22. Transparency Pass: Auto-Reveal, Intent Hints, Affordability, Cap/Regen Visuals, Rules Overlay

Seven changes, all aimed at making the *mechanics* fully legible while
leaving the *winning strategy* (Fact+Feeling) for the player to
discover through play — none of the additions below name or hint at
it anywhere.

**1. Auto-reveal.** What Fen's move just did is now logged
automatically as a plain-text line under his dialogue every turn, no
tap required — e.g. `Fen Wicket: "…alright, fair point." (Consideration
— Heals Fen a little and gives him 1 🧠.)`. The 💬 tap-to-reveal status
icon this replaces is removed (along with the now-dead `lastMoveId`
tracking and `FEN_MOVES_BY_ID` lookup it existed for) rather than kept
alongside a redundant auto-reveal.

**2. Vague enemy-intent hint.** At the start of each player turn, a
line above the log gives a category-level hint of Fen's next move —
"Fen Wicket seems to be just deflecting" (basic), "…looks like he's
gathering a comeback" (Fact), "…seems to be getting worked up"
(Feeling) — never the exact move name. Built as a reusable function,
`buildEnemyIntentHint(battle, npcName, chooseMoveFn, hintPools)`: any
future enemy can reuse it by passing its own display name and its own
move-choosing function (already required for its turn logic), with an
optional custom hint-phrase pool falling back to a generic
basic/Fact/Feeling default. The hint is generated by calling that same
chooseMoveFn as a pure preview (no state mutation) — the exact function
that will actually pick the enemy's move — so the category shown is
always accurate, and, critically, always about a move that enemy can
currently afford, since chooseFenMove (and the runEnemyTurn backstop in
§3 below) never returns anything else. Confirmed by direct test: at
every point in an extended playthrough the hint's category matched
what Fen actually did next.

**3. Enemy affordability rule (audited, not found broken).** Checked
explicitly whether Fen's scripted Persecution Complex timing (turn
window 3–4) could fire "on credit": `canAfford` checks the turn window
and the resource/Effort cost together in one call, and `chooseFenMove`
only ever returns Persecution Complex when `canAfford` approves it —
the window is an *additional* restriction stacked on top of the normal
cost check, never a way to bypass it. Verified directly (not just by
reading the code): forced `battle.enemy.c = 0` (unaffordable) at both
turn 3 and turn 4 — Persecution Complex did not fire either turn, Fen
fell back to Consideration then Rhetoric instead; then forced `c = 3,
effort = 4` (exactly affordable) at turn 3 — it fired correctly. No
bug existed, but added a defensive backstop in `runEnemyTurn` anyway
(`if (!canAfford(...)) move = FEN_MOVES[0]`, his own always-free
fallback) as a standing invariant for future enemy AI, not a fix for
an actual bug in this one. Fen's fixed-pattern AI (banking toward a
signature move, scripted turn windows) stays a **documented tutorial-
fight exception**, not a precedent — §1a's progression rules govern
future enemy design, not Fen's script.

**4. Resource cap visuals.** R/C were already numerically clamped at
10 (`METER_CAP`, §17) — this only adds a visual cue: at 10, the icon
turns red and plays a looping wobble+brightness-flash
(`.icon-capped`/`meter-cap-wobble`), instead of ever needing to
visually exceed 10.

**5. Regen flash.** A transient "+2" (or "+1", or nothing if already
full) pops up next to each Effort bar, reflecting the *actual* amount
just regenerated — computed in `upkeep()` from a per-combatant
`effortRegenRate` field (default 2) rather than hardcoded in the UI, so
a future move that changes the regen rate is reflected automatically
without a UI change. Applied symmetrically: both player and enemy
Effort get their own flash from the same upkeep call. Verified the
clamp case directly: with only 1 point of headroom below max, the
flash correctly shows "+1", not "+2".

**6. Win condition, confirmed explicit.** Re-confirmed in code (§21's
`applyDamage`): HP reaching 0 is the *only* condition that ends the
battle — no other check gates it. Audited every player-facing string
added in this pass (auto-reveal lines, intent hints, the Rules
overlay) to confirm none of them state or hint at the Fact+Feeling
strategy; the Rules overlay in particular says Effort is "spent on
Facts and Feelings" (what the resource is *for*) but never that both
are *required* to win.

**7. Rules overlay.** A genuinely full-screen reference (`.fullscreen-
overlay`, not the smaller centered-modal treatment `.overlay-menu`
uses elsewhere — a centered modal here would leave gaps where a move
button underneath could still be tapped by accident while reading),
opened via a "?" button in the battle screen's corner and closed via
its own Back button. Covers: turn order (enemy-first), what each
resource does (HP, Effort, 👄, 🧠, 🛡️ Defence, 😤 Confident), the goal
(reduce opponent's HP to 0), and the standard numeric rules (Effort
+2/round, R/C +1/basic move, R/C capped at 10) — deliberately omits
the Fact+Feeling requirement. Opening/closing it never touches battle
state (verified: turn count and move buttons work identically before
and after opening/closing it mid-battle).

**Re-ran the exhaustive win-path search after all seven changes**
(none of which touch damage, cost, Defence, or affordability numbers)
to confirm the fastest win is unaffected: still **10 rounds**, not 9 —
`consideration ×3, understand, rhetoric ×4, actually, rhetoric`,
confirmed both by the offline mirror and replayed against the live
engine (`enemyHp: 0`, turn 10). This 10-round figure is the number
established in §21's win-condition rebalance (9 was the fastest win
*before* that rebalance, under the old Fact+Feeling gate) — flagging
this in case "9" was expected from that earlier figure rather than the
current one.

Full existing regression suite (Walk Away, Talk, Fight-after-Talk,
no-retreat, loss, win, dialogue soft-lock, sprite animation, mobile
layout, label overlaps) re-run and passing after all seven changes.

## 23. HP Damage/Heal Flash

A transient "-3"/"+2" pops up next to either combatant's HP bar,
mirroring the Effort regen flash's structure (§22) — additive only;
the R/C-at-cap wobble/flash and sprite-hurt's brightness pulse are
untouched. Red for damage, green for healing, ~0.5s (faster than the
Effort flash's 1.4s, since a hit landing reads faster than a turn's
regen tick). Applied symmetrically: player damage/heal and Fen
damage/heal both flash their own HP bar.

One deliberate structural difference from the Effort flash: instead of
restarting the animation when the *displayed text changes*
(`renderRegenFlash`'s approach), the HP flash restarts off a nonce
incremented on every real damage/heal event, stored on the element via
a `data-nonce` attribute. Damage amounts repeat constantly in practice
(Rhetoric always deals the same 2 damage), and a text-comparison
retrigger would silently skip re-showing the flash whenever the same
amount landed twice in a row — confirmed this empirically before
settling on the nonce approach. `renderRegenFlash` itself is left as-is
(this section doesn't touch it), even though it likely has the same
latent gap for repeated identical regen amounts — worth a look if it's
ever reported as an issue, but out of scope for an additive change.

Verified:
- Damage and heal each correctly flash the correct side, correct sign,
  correct color, checked immediately after each move resolves (not
  after waiting through the whole round, which can let the enemy's own
  following move overwrite what's being inspected — a real trap this
  testing ran into and had to correct for).
- Two identical-magnitude hits in a row (Rhetoric always dealing the
  same damage) each get their own flash — nonce advances both times.
- Healing at full HP correctly shows nothing (actual delta is 0,
  clamped by maxHp) rather than a misleading "+2" for a heal that did
  nothing; healing from a real deficit correctly shows the true
  positive delta.
- Timing alongside sprite-hurt: both trigger from the same `applyDamage`
  call when Fen takes damage, confirmed via computed styles they run
  independent animations (`hp-flash-pop` 0.5s vs `battle-sprite-hurt`
  0.3s) on separate elements — no shared property or class name to
  fight over, so no visual clash between them.
- Exiting a battle clears the flash spans' text and `data-nonce`
  attribute, so the first damage/heal of the *next* battle can't land
  on a nonce the previous battle already displayed and get silently
  treated as "unchanged."

Full existing regression suite re-run and passing; the exhaustive
win-path search still finds the fastest win at 10 rounds (unchanged,
since this section adds tracking only — no damage/cost/Defence numbers
were touched).

## 24. Full Kit Redesign: Defence-Stacking Removed, Big Swing/Exposed Added

**Motivation.** Player reports of losing repeated fights while playing
well — timing Facts against Fen's temporary Defence windows, using
Feelings when sensible — traced back to a structural problem, not a
single bad number: Fen's Defence could permanently stack to +4
(baseline +1, "Someone's Going to Drown" capped at +3), which zeroed
out the player's Rhetoric entirely and blunted Actually for most of a
long fight, while a "good but not perfectly optimal" human strategy
reliably lost regardless of exactly how the remaining Defence-related
numbers were tuned (root-caused across several rounds of diagnosis —
Defence stacking, not player damage or the Effort economy, was the
dominant driver). Rather than patch individual numbers on a system
whose core mechanic was the problem, the whole Defence-stacking system
was removed and replaced.

**The new kit.**
- **Fen: 3 moves instead of 5.** Rhetoric and Consideration unchanged.
  "Council Tax Correction," "Someone's Going to Drown," and
  "Persecution Complex" are all removed, replaced by a single move,
  **Big Swing** (5 dmg, costs 9 Effort, leaves Fen **Exposed** for 1
  turn — his opponent's next attack against him deals double damage,
  §4a).
- **Player's Feeling redesigned.** "I just want to understand" no
  longer lowers the opponent's Defence (nothing left to lower). It now
  heals slightly more (2 → 3) and **Primes** the player's next attack
  for +2 flat damage (§4a) instead.
- **Fen's AI replaced with pure reactive logic (no scripted turn
  numbers, no once-per-battle gating, no held-back/no-op turns):**
  heal (Consideration) the instant his own HP drops below 30%,
  otherwise swing big whenever Effort allows, otherwise Rhetoric.
  Because Big Swing's Effort cost (9) is high relative to his +2/turn
  regen, in practice he only ever manages it once, right at the start
  of a fight while at full Effort — after that, once his HP is low
  enough to trigger the heal-priority branch, Big Swing is locked out
  for the rest of the fight regardless of Effort, since the heal check
  is evaluated first.

**Balance verification method.** Per the request, all three checks
were run *before* finalizing any numbers, and re-run after every
change to the tunable numbers (Big Swing's damage/cost, the Exposed
multiplier) — never assumed one fix was sufficient without
re-checking all three:
1. **Computer-optimal exhaustive search** (iterative-deepening DFS,
   identical technique to §16/§21) — fastest possible win.
2. **Human heuristic** — default Rhetoric; heal (Consideration or the
   Feeling) whenever HP < 30%; between 30–50% HP, attack if it would
   do worthwhile damage, otherwise heal; always capitalize on Fen's
   Exposed window the instant it's active; use Actually whenever
   affordable above 50% HP. Meant to model "simple, intuitive
   first-fight play," not optimal play.
3. **Basics-only restricted search** (Rhetoric/Consideration only,
   ever) to the same depth-45 search used previously — must find no
   winning path.

**A methodology bug caught mid-testing, worth recording.** An early
version of the balance-testing mirror closure-captured the Exposed
multiplier as a plain variable inside each move's `effect` function at
module-load time; patching the exported constant from outside silently
failed to affect Rhetoric/Actually's own damage calculation (only Big
Swing's, which never actually checks its own exposed flag). Every
"Exposed multiplier" sweep run before this was caught was silently
using the hardcoded default (×2) regardless of what was passed —
caught by manually tracing a single hit's damage against an
intentionally different override value and noticing it didn't change.
Fixed by refactoring the mirror to route every move's damage
calculation through one shared, mutable config object read at call
time, then every affected sweep was re-run from scratch. (Mentioned
here in case a future balance pass hits the same class of bug — it's
an easy one to reintroduce.)

**Sweep findings.** Across an exhaustive grid of Big Swing damage
(3–7) × Effort cost (4–10) at the Exposed multiplier fixed to exactly
×2 (the literal "double damage" spec), every safe, clean-win
configuration for the human heuristic converged to a **hard plateau
at 12 rounds** — below the "roughly 15-20" target. The reason: once
Fen's own HP drops under 30%, his AI locks into pure self-heal, and
that endgame (Fen heals 2/turn against the player's ~2.3 average DPS)
is a fixed-length grind independent of Big Swing's numbers, since Big
Swing only ever fires once before the lockout. Pushing the Exposed
multiplier above ×2 does stretch the round count further (e.g. ×2.5
reaches turn 15), but **breaks the basics-only invariant starting
exactly at ×2.5** — confirmed via the depth-45 search: basics-only
cannot win at ×2 or below, but can at ×2.5 and above, at every damage/
cost combination tested. Raising Fen's own heal-threshold from 30% to
40% (not one of the three sanctioned tuning knobs — an AI parameter
the request specified directly) was also tested informationally and
would land the heuristic at turn 18 with basics-only still safe, but
changes a value the request specified explicitly rather than left open
to iterate on.

**Decision: ship the 12-round result.** Given the choice between
accepting the 12-round plateau (exactly the specified numbers: Big
Swing 5 dmg / 9 Effort, Exposed ×2, Fen heal-threshold 30%) or
deviating from a directly-specified value to reach the 15-20 target,
the 12-round result was chosen. Final verified numbers:

| Check | Result |
|---|---|
| 1. Computer-optimal | Wins in **5 moves**: `rhetoric, rhetoric, rhetoric, consideration, actually` |
| 2. Human heuristic | **WIN at turn 12**, player HP 9/20 remaining |
| 3. Basics-only (depth 45) | **Cannot win** |

All three checks were re-verified directly against the live
`js/combat.js` (not just the offline balance-testing mirror) by
driving its real public API (`RatLand.startBattle` /
`RatLand.playerUseMove`) inside a stubbed DOM-less sandbox, with
`setTimeout` forced synchronous to avoid needing real wall-clock waits
for the enemy-turn-gap delay — confirmed to produce identical results
to the mirror.

**Status icons updated (§9).** The 🛡️ Defence and 😤 Confident icons
are removed; a single 💥 icon now shows Exposed (for whichever side
currently has it) or Primed (for the player's pending next-attack
bonus), reusing the existing always-visible/tap-to-explain pattern —
no new UI system, just the existing icon slot repurposed for the new
status pair. The Rules overlay (§22.7) and the icon-inactive CSS
comment (§9) were updated to match; no other UI/dialogue polish was
done this round, per the request's explicit scope.

## 25. Big Swing/Understand Dialogue, Status-Icon Explanations, Debate Confirmation Screen

Two changes, the UI/dialogue polish explicitly deferred by §24.

**1. Dialogue.** Big Swing (§24) and the player's Feeling now have real
first-use/pool lines instead of the placeholders §24 flagged as
throwaway. Big Swing's lines lean into Fen's actual grievance (boat
crossings) rather than generic aggression, matching his established
voice. The Exposed/Primed status icon's tap explanation (§4a, added
mechanically but tersely in §24) was rewritten to match the R/C icons'
style: it now always states what Exposed/Primed generically mean, not
just the current on/off state, whether or not either is currently
active.

**2. Debate confirmation screen.** The top-level pre-battle menu is
now **Talk / Debate** — "Fight" is renamed to "Debate," and the
top-level **Walk Away** option is removed. Choosing Debate no longer
starts the battle directly; it opens a new confirmation screen
showing the NPC's opening opinion (a new `battleOpinion` field on the
`NPC_ROSTER` entry — Fen's: "These boat crossings are never justified.
The Mice are just putting all of us in danger!") with two options:
**Debate** (commits — same battle-wipe-into-`startBattle` sequence the
old top-level Fight used to trigger directly) and **Walk Away**
(cancels, no penalty — functionally identical to the old top-level
Walk Away, just relocated one screen deeper).

`game.mode` gains a new value, `'battle-opinion'`, for the
confirmation screen — freezes player movement automatically (`main.js`
only special-cases `'overworld'`/`'interior'`, so any other mode value
already freezes movement with no changes needed there) and was added
to the D-pad-hiding CSS rule (§10's `#prebattle-menu.visible ~
#controls` pattern) alongside the existing entries — the exact class
of soft-lock bug §21 found and fixed for the battle-wipe transition,
now pre-empted for this new overlay rather than found the same way
later.

Verified end-to-end in a real browser: top-level menu shows Talk/
Debate only (no Fight/Walk Away elements at all); Debate opens the
opinion screen with the correct name and opinion text, `game.mode` set
to `'battle-opinion'`, D-pad hidden; Walk Away from the opinion screen
returns to `'overworld'` with no battle started and the D-pad visible
again; re-approaching Fen afterward shows a fresh Talk/Debate menu and
Talk still shows his normal dialogue correctly — confirming the
existing "Talk always available after Walk Away" behavior (tested
under the old top-level Walk Away) still holds under the relocated
one. A full Debate → Debate path was also driven through to confirm
the battle actually starts.
