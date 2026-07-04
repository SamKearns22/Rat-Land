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
2. **Defence's floor and persistence** (§4a) — assumed damage can't
   go negative from over-Defence. "Persecution Complex"'s +1 Defence
   is resolved (ties to Confident, §4a/§4b). **"Someone's Going to
   Drown"'s Defence gain is resolved: capped at +3 total, regardless
   of how many times it's cast** (§14/§17) — further casts past that
   point still deal damage but stop adding Defence, matching the
   capped, non-stacking pattern used elsewhere in the kit (R/C, §2).
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

**Opening:** "Oh, here we go. Another one come to tell me how to
think." **Finishing** (only said if his own HP hits 0): "…fine.
Fine! Maybe I've not thought it all the way through."

| Move | Cost | Effect |
|---|---|---|
| Rhetoric | 0 | 2 dmg, +1 R |
| Consideration | 0 | Heals 2 (self), +1 C |
| Fact — "Council Tax Correction" | 2 R + 3 Effort | 3 dmg; −1 enemy Defence |
| Fact — "Someone's Going to Drown" | 2 R + 3 Effort | 3 dmg; +1 Fen Defence (caps at +3 total across all casts, §17) |
| Feeling — "Persecution Complex" (turn 3–4 only) | 3 C + 4 Effort | Lowers enemy Effort significantly; **+1 Fen Defence for as long as Confident lasts (reverts fully once it expires — not permanent)**; the next enemy Fact used against Fen deals bonus damage; **grants Fen Confident for 1 turn directly** (in addition to the generic any-Fact trigger, §4b) |

**Dialogue** (§11 — random pool used every time for Rhetoric/
Consideration; first-use line once, then random pool, for the rest):

- Rhetoric pool: "You're not even listening to me!" / "Typical." /
  "Here we go again." / "You always do this."
- Consideration pool: "…alright, fair point." / "…s'pose that's
  true." / "Hm. Didn't think of it that way." / "…fine. Whatever."
- Council Tax Correction first use: "You lot always say that, and
  nothing ever changes, does it?" — pool after: "The Church gets
  more funding than my street does." / "Nobody's fixed my drain in
  three years." / "Where's my anniversary money gone, eh?"
- Someone's Going to Drown first use: "You can call it heartless if
  you like. I call it common sense." — pool after: "It's not safe.
  Never has been." / "I'm not being funny, someone's gonna die out
  there."
- Persecution Complex first use: "Don't you dare tell me how I'm
  allowed to feel about this." — pool after (never actually reached
  while it's once-per-battle, see §11): "Everyone's against blokes
  like me these days." / "No one's on my side anymore."

Note on "Persecution Complex": the "next enemy Fact deals bonus
damage" clause is a real vulnerability, not a typo — Fen's
defensiveness raises his Defence generally but leaves him specifically
exposed to a well-aimed Fact, which fits his character (per
`NPC_DIALOGUE.md`: "I expect I do know, actually. I just don't like
saying it").

### Player starter — 4 moves

**Opening:** "Right. Okay. I can do this." **Finishing** (only said
if the player's own HP hits 0): "…maybe he's got a point, actually."

| Move | Cost | Effect |
|---|---|---|
| Rhetoric | 0 | 2 dmg, +1 R |
| Consideration | 0 | Heals 2 (self), +1 C |
| Fact — "Actually…" | 2 R + 3 Effort | 3 dmg; reduced effect vs. a Confident opponent (§4b, §12.3) |
| Feeling — "I just want to understand" | 3 C + 4 Effort | −1 enemy Defence; small self-heal (2) |

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
