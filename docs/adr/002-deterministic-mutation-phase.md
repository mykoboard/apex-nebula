# ADR 002: Deterministic Mutation Phase

## Status
Proposed

## Context
In the Mutation Phase of Apex Nebula, players' genomes undergo stochastic changes. This must be deterministic across all peer clients to maintain game state synchronization without a central server.

## Decision
1. **Shared Seed**: The host will generate a cryptographically secure random seed and broadcast it to all players when transitioning the game to the `mutationPhase`.
2. **Pseudo-Random Number Generator (PRNG)**: All clients will use a seeded PRNG (e.g., a simple LCG or Mulberry32) to ensure that the dice rolls generated on each machine are identical for the same sequence of events.
3. **Manual Trigger**: 
   - Instead of mutations happening automatically upon entering the phase, a player must click an **"Initiate Mutation"** button.
   - This sends the `INITIATE_MUTATION` event to all peers.
   - Upon receiving this event, all clients execute the same deterministic roll logic.
4. **Sequential Processing**: 
   - **Attribute**: 1=NAV, 2=LOG, 3=DEF, 4=SCN.
   - **Magnitude**: 1-2 = -1, 3-4 = 0, 5-6 = +1.
5. **Applied State**: The results will be stored in the `mutationModifiers` record within each player's `PlayerGenome`.
6. **Phase Confirmation Barrier**:
    - Moving from `mutationPhase` to `phenotypePhase` requires collective confirmation.
    - Each player must click **"Confirm & Continue"**, sending a `CONFIRM_PHASE` event.
    - The machine tracks confirmed players in the `confirmedPlayers` context.
    - Transition to the next phase happens automatically once `confirmedPlayers.length === players.length`.

## Consequences
- **Fairness**: All players see the same results for everyone, preventing "local-only" luck.
- **Verification**: Any client can verify the results of another player by re-running the PRNG with the same seed.
- **Complexity**: Adds a dependency on a deterministic PRNG and requires careful management of the "random state" across machine transitions.
