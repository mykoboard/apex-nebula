# 4. End-of-Round Win Condition Evaluation

Date: 2026-02-22

## Status
Accepted

## Context
In Apex Nebula, the win conditions (accumulating 30 Data Clusters or successfully passing the Singularity Core check) were originally being tracked, but the exact moment the game machine should transition into the `won` state was not adequately defined, leading to players not triggering the end-game state when conditions were met mid-round.

If the game ends immediately upon a player meeting the condition, players who act later in the turn order are placed at a significant disadvantage, as they do not get an equal number of turns to complete their objectives. 

## Decision
We will evaluate the win condition strictly at the end of the round, specifically during the `optimizationPhase` after all players have confirmed their actions. 

This is implemented in `apexNebulaMachine.ts` via an `always` transition array that evaluates the new `allConfirmedAndWin` guard:
1. `allConfirmedAndWin` checks if all players have confirmed the phase AND if any player's genome satisfies `checkWinCondition()`.
2. If true, the machine transitions to the `won` state.
3. If false, it falls back to checking `allPlayersConfirmed` and loops to `nextRound`.

## Consequences
- **Fairness:** All players receive the same number of turns before the game ends, preserving competitive integrity.
- **Multiple Winners / Tie-Breakers:** Because multiple players could theoretically achieve the win condition in the same round, the game can now successfully record all players who passed the check into the `winners` array.
- **State Machine Clarity:** The state machine has a single, deterministic exit point to the `won` state, centralized at the end of the round rather than scattered across phenotype and optimization actions.
