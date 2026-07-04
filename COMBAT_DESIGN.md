# Combat Design — Rat Land

**Status: design review draft. No combat code has been written yet.**
This document is for review and revision before any implementation
starts. The two movesets in §14 are explicitly test/throwaway (see
that section) and a handful of smaller mechanics still aren't fully
pinned down — flagged in §12 rather than guessed.

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

### 4a. Defence

**Defence is a flat damage reduction, applied per hit, before any
other modifiers.** Order of operations for incoming damage:

1. Start with the move's base damage.
2. Subtract the defender's current Defence value (flat, not a
   percentage). Result floors at 0 — a hit can't heal someone via
   over-Defence (this floor is an assumption, not stated explicitly;
   flagged in §12).
3. *Then* apply any other situational modifier (e.g. the Confident
   reduction in §4b, or "Persecution Complex"'s bonus-damage clause)
   on top of the Defence-reduced number.

Defence itself is a battle-only modifier, not one of the three
resource pools in §2 — several Facts/Feelings raise or lower it
(e.g. "-1 enemy Defence," "+1 Fen Defence"). Whether a given
Defence change persists for the rest of the battle or decays after
some number of turns isn't specified in general — flagged in §12 —
**except for "Persecution Complex" specifically**, which was found
during extended playtesting to leave its +1 Defence in place
permanently instead of tying it to the 1-turn Confident window it's
meant to share (§4b). Fixed: that specific +1 is now tracked
separately and fully reverts to baseline the moment Confident expires,
regardless of how many times the grant has (re-)happened. "Someone's
Going to Drown"'s own +1 Fen Defence per cast is untouched by this fix
and still persists for the rest of the battle — see the note in §16.

### 4b. Confident (status effect)

**Whenever Fen uses a Fact, he gains Confident for 1 turn.** As of the
Defence fix above, casting **"Persecution Complex" also grants
Confident for 1 turn directly** (previously it didn't — only Facts
triggered it), so its temporary Defence bonus has a Confident window
of its own to expire alongside, rather than needing to borrow one from
whatever Fact happens to follow it. While Confident, the player's Fact
"Actually…" deals reduced damage against him (§14) — this is currently
the *only* defined interaction for Confident. The exact size of that
reduction isn't specified (flat amount? percentage? full negation?) —
flagged in §12.

Confident is documented here as Fen-specific for now, matching how
he's the only fightable NPC — the same "don't hardcode this as
universal" caveat from §8's Talk/Fight independence applies: a future
character could gain Confident differently, or have other status
effects entirely. The status-effect *system* (§9, the on-screen icon
requirement) needs to be generic; only Fen's specific trigger rule is
fixed here.

## 5. Win Condition

Standard win trigger: reduce the opponent's HP to 0.

**Modifier:** HP hitting 0 only counts as an actual win if the
winning side has used **at least one Fact and at least one Feeling**
at some point earlier in the battle. Pure Rhetoric-spam (or Rhetoric
+ Consideration stalling) cannot win on its own, no matter how much
damage it does.

**Recommended handling (flag for confirmation, see §12):** a soft
floor. If a hit would take the opponent to ≤0 HP but the attacker
hasn't used both a Fact and a Feeling yet, clamp their HP at 1
instead of ending the battle, and play a line acknowledging the
near-miss. Once both move types have landed, the next KO-would-be hit
resolves as a real win.

Both confirmed test kits (§14) have exactly one Fact and one Feeling
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

**Every active status effect (Confident, Defence changes, etc.) must
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
  Confident/Defence specifically — this is a general battle-UI
  requirement, not a one-off for Fen's kit.

## 10. Battle Transition Sequence (Pokémon-style)

Battle is a new top-level game mode alongside the existing
`'overworld'` / `'interior'` (see `main.js`), e.g. `'battle-transition'`
→ `'battle'` → back to `'overworld'`.

Sequence beats:
1. **Trigger.** Player selects **Fight** from the pre-battle menu
   (§8) for a fightable NPC — for this test design, Fen Wicket.
2. **Wipe in.** Screen transitions (diagonal wipe or iris — exact
   style left as a rendering detail), overworld freezes underneath.
3. **Battle screen.** Dedicated view: player sprite and opponent
   sprite facing off, HP/Effort/R/C readouts for both, plus status
   icons per §9. Reuses the existing code-drawn sprite renderers
   (`drawNpcRat` / the `spriteAsset` image path for Fen specifically)
   rather than new art.
4. **Opening line.** Enemy's turn-1 dialogue plays before their first
   move resolves (§11).
5. **Battle loop** runs per §3 until win/loss.
6. **Wipe out.** Reverse transition back to the overworld, player
   restored to their pre-battle tile and facing.

## 11. Per-Move Dialogue Triggers

Every move is tied to a specific line, delivered in the same dialogue
box already used for NPC conversations (`RatLand.showDialogue`),
fired the moment that move is used — so combat stays in-voice with
each character's `NPC_DIALOGUE.md` personality instead of feeling
like a bolted-on separate system.

**Fen Wicket's "Persecution Complex"** is gated by turn number rather
than resources — intended to trigger **around turn 3–4** rather than
being available from turn 1. The precise gating rule (exactly turn 3?
turn 4? first-available-in-that-window?) isn't pinned down — flagged
in §12.

## 12. Open Questions / Assumptions Needing Confirmation

1. **Effort cap.** Assumed capped at 10 (its starting value) for
   both test combatants; not stated explicitly. §15's playtest
   analysis holds either way, but the cap should be confirmed.
2. **Defence's floor and persistence** (§4a) — assumed damage can't
   go negative from over-Defence. "Persecution Complex"'s +1 Defence
   is now resolved (ties to Confident, §4a/§4b). **Still open:**
   "Someone's Going to Drown" grants Fen +1 Defence *every* time it's
   cast, with nothing capping or reverting it — confirmed via
   playtesting that over a long fight this climbs indefinitely (e.g.
   defence 9 by turn 58 in one passive-play test), same failure mode
   the Persecution fix just addressed. Needs a decision: cap it,
   make it temporary like Persecution's, or leave it as an
   intentional permanent-stacking mechanic (flagged, not decided,
   since it wasn't named in the bug report that prompted this round
   of fixes).
3. **Exact size of the Confident damage reduction** (§4b) — "Actually…"
   deals reduced damage against a Confident Fen, but not by how much.
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
Fen Wicket and the player is done.**

"Moderate damage" = **3**. "Small self-heal" = **2**. Facts cost their
R amount **+ 3 Effort**; Feelings cost their C amount **+ 4 Effort**
(§4).

### Fen Wicket (test dummy) — 5 moves

| Move | Cost | Dialogue | Effect |
|---|---|---|---|
| Rhetoric | 0 | "You're not even listening to me!" | 2 dmg, +1 R |
| Consideration | 0 | "…alright, fair point." | Heals 2 (self), +1 C |
| Fact — "Council Tax Correction" | 2 R + 3 Effort | "The Church gets more funding than my street does, and everyone knows it." | 3 dmg; −1 enemy Defence |
| Fact — "Someone's Going to Drown" | 2 R + 3 Effort | "If a mouse drowns crossing that river, that's on whoever let them try." | 3 dmg; +1 Fen Defence |
| Feeling — "Persecution Complex" (turn 3–4 only) | 3 C + 4 Effort | "Everyone's against blokes like me these days." | Lowers enemy Effort significantly; **+1 Fen Defence for as long as Confident lasts (reverts fully once it expires — not permanent)**; the next enemy Fact used against Fen deals bonus damage; **grants Fen Confident for 1 turn directly** (in addition to the generic any-Fact trigger, §4b) |

Note on "Persecution Complex": the "next enemy Fact deals bonus
damage" clause is a real vulnerability, not a typo — Fen's
defensiveness raises his Defence generally but leaves him specifically
exposed to a well-aimed Fact, which fits his character (per
`NPC_DIALOGUE.md`: "I expect I do know, actually. I just don't like
saying it").

### Player starter — 4 moves

| Move | Cost | Dialogue | Effect |
|---|---|---|---|
| Rhetoric | 0 | "I just think… we should hear them out?" | 2 dmg, +1 R |
| Consideration | 0 | "Okay. Let me think about that." | Heals 2 (self), +1 C |
| Fact — "Actually…" | 2 R + 3 Effort | "Actually…" | 3 dmg; reduced effect vs. a Confident opponent (§4b, §12.3) |
| Feeling — "I just want to understand" | 3 C + 4 Effort | "I just want to understand" | −1 enemy Defence; small self-heal (2) |

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
above only touches Persecution Complex, per what was explicitly asked
— Drown's permanent stacking is unresolved and now tracked as an open
question (§12.2) rather than fixed unilaterally, since it wasn't the
move named in the report and the same treatment might not be the
right call for it (e.g. permanent stacking on a *reusable* move could
be an intentional escalating-threat mechanic rather than a bug).

**Re-ran the exhaustive win-path search (§16) after both fixes.**
Fastest possible win is now **9 rounds** (down from 10) — capping R/C
and closing off Persecution's permanent Defence both remove player-side
drag, so if anything the fight got slightly faster, not slower.
Confirmed against the live battle code: the 9-round sequence
`consideration ×3, understand, rhetoric ×3, actually, rhetoric` wins
with the player finishing at 13/20 HP. Loss, no-retreat, and Talk/Fight
independence were all re-verified afterward and are unaffected.

**Also noted, not fixed (lower priority per the request):** battle
dialogue lines repeat every time a given move is used, because each
move currently has exactly one line of dialogue defined (§14) — there
is nothing to cycle through. This isn't a bug in the cycling logic
itself; overworld NPC dialogue already has a working cycle-through-
lines mechanism (`RatLand.getNpcLine`, `js/npc.js`) that battle moves
could reuse the same way (an array of lines per move + a lineIndex),
but that requires additional alternate lines to be written for at
least the moves used most often (Rhetoric/Consideration/basics on both
sides) — none exist yet beyond the single confirmed line per move from
§14. Quick fix once those lines are provided; no code changes made
here since there's nothing yet to cycle through.
