# ADR 009: Competitive Phase Auto-Skip

## Status
Accepted

## Context
The "Competitive Phase" (The Hustle) is intended to be a phase where players can engage in direct interaction or resource battles. However, the logic for resolving these interactions (especially in a multiplayer, event-sourced environment) was not yet fully implemented or tested, leading to potential hangs or desynchronization in the game loop.

## Decision
We decided to auto-skip the Competitive Phase for now to ensure a smooth transition between the Environmental Phase and the Optimization Phase. 

Concretely:
1. Updated the `environmentalPhase` in `apexNebulaMachine.ts` to transition directly to `optimizationPhase` upon completion (either via `NEXT_PHASE` or when all players confirm).
2. Added an `always` transition to the `competitivePhase` state that immediately redirects to `optimizationPhase`, acting as a safety valve.
3. Removed the "Resolve Competitive" button from the `CommandProtocol.vue` UI.
4. Updated the full round lifecycle tests to account for the direct transition from Environmental to Optimization.

## Consequences

### Positive
- **Stable Game Loop**: Players can now complete full rounds (Generation 1 to 2, etc.) without hitting unimplemented phase logic.
- **Improved UX**: Reduces friction by removing a phase that currently lacks interactive content.
- **Testing Clarity**: Simplifies the test expectations for round transitions.

### Negative / Risks
- **Placeholder State**: The `competitivePhase` still exists in the state machine definitions and type system to avoid breaking existing references, but it is functionally bypassed.
- **Interaction Gap**: Temporarily removes the primary mechanism for direct player-vs-player resource "hustling".
