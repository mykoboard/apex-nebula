# ADR 004: Phenotype Phase Mechanics

## Status
Proposed

## Context
The Phenotype Phase is the primary interaction phase where players move across the galaxy and harvest resources. These actions must be deterministic and synchronized across all peer clients.

## Decision
1. **Priority-Based Turn Order**: Players execute their turns sequentially according to the `turnOrder` array determined by the Priority Token.
2. **Step-by-Step Movement**: 
    - Movement is not a single teleport but a series of individual moves to adjacent tiles.
    - The maximum number of moves is equal to the `NAV` attribute (Base + Mutation).
    - `MOVE_PLAYER` events are restricted to Distance=1.
    - Movement costs vary based on the destination tile: standard tiles cost **1 NAV**, while Double Award tiles cost **2 NAV** to enter.
3. **Harvest-on-Entry**:
    - A fitness check is triggered automatically every time a player moves into a tile.
    - The check result determines reward or stability loss *before* the player can proceed with their next move.
4. **Tile-Specific Harvest Rules**:
    - **Standard Tiles**: Single check. Success awards yields; Failure costs 1 Stability. Requires 1 NAV point to enter.
    - **Double Award Tiles** (Both Matter and Data > 0): Two independent checks. The first for Matter, second for Data. Stability is lost for each failed check. Requires 2 NAV points to enter.
    - **Multi-Attribute Tiles** (Array of attributes): Sequential checks. Success for ALL attributes is required to gain any resources. Failure in any check costs 1 Stability.
    - **Singularity Tiles**: Requires 10 Data Clusters to enter. This amount is immediately consumed as an entry fee. Successfully passing the check immediately ends all remaining movement points for that turn.
5. **Round Initialization**:
    - At the start of each Phenotype phase, all player move counts are reset to zero.
    - Available move units for the round are dynamically calculated: `NAV (Base) + Mutation Modifiers`.
    - This ensures that attribute increases gained in the Optimization phase are immediately impactful in the following round.

## Consequences
- **Strategic Depth**: Navigation choices become critical as movement range is tied to genome evolution.
- **Risk/Reward**: Double-award and Multi-attribute tiles offer higher potential gains but significantly higher risk to Stability.
- **Decentralization**: PRNG seeding ensures all clients compute the same harvest results.
