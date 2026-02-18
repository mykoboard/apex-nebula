# ADR 003: Player Priority and Turn Order

## Status
Proposed

## Context
Apex Nebula requires a deterministic turn order to handle sequential actions like the Mutation Phase and Phenotype Phase maneuvers. This order should be dynamic and influenced by player decisions.

## Decision
1. **Initial Priority (Start of Game)**:
   - Rank = `Navigation (NAV)` + `Sensors (SCN)`.
   - **Tie-breaker 1**: Highest `Logic (LOG)`.
   - **Tie-breaker 2**: Roll a seeded `1d6` (Interference roll).
   - The player with the highest result receives the **Priority Token** and goes first in the first cycle.

2. **Priority Update (End of Cycle)**:
   - The Priority Token is reassigned at the end of the `Optimization Phase`.
   - The token goes to the player who **spent the most Data Cluster tokens** during that cycle's optimization/evolution steps.
   - **Tie-breaker**: If tied, the token remains with the current holder (or the player closest to the holder in alphabetical/ID order). 

3. **Sequential Mutation**:
   - The Mutation Phase will now be processed sequentially according to the current Turn Order.
   - Each player must manually click "Initiate Mutation" when it is their turn.
   - Results are broadcasted and applied before passing the "focus" to the next player.

## Consequences
- **Strategic Depth**: Players can choose to spend Data not just for upgrades, but to secure a better turn order in the next round.
- **Fairness**: Initial priority favors players who invested in speed (NAV) and awareness (SCN) during setup.
- **Synchronization**: Turn order must be recalculated and synchronized across all clients at the start of the `mutationPhase`.
