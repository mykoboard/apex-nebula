# ADR 005: Environmental Phase & Event System

## Status
Accepted

## Context
The Environmental Phase is a critical synchronization point where the nebula reacts to player presence. Every player must experience the same environmental events and reach identical outcomes to maintain state consistency across a decentralized network.

## Decision
1. **Deterministic Event Selection**: 
    - Events are drawn from a seeded `eventDeck`.
    - The `eventDeck` is shuffled only once at game start using the shared game seed.
    - Subsequent event selection uses a circular index or sequential pull to ensure all clients select the same event.
2. **Unified Attribute Checks**:
    - Every event defines a `checkType` (NAV, LOG, DEF, SCN) and a `threshold`.
    - Players roll a 1D6 and add their specific attribute value (Base + Mutation + Temp Modifiers).
    - If `Roll + Attribute >= Threshold`, the check passes.
3. **Multi-Target Effect Resolution**:
    - Effects are categorized as `onSuccess`, `onFailure`, or `global`.
    - Targets are resolved dynamically based on current game state:
        - `self`: Applies only to the player making the check.
        - `all`: Applies to every genome in the session.
        - `priority`: Applies only to the player holding the Priority Token.
        - `most_data` / `most_matter`: Applies to the player with the highest current resource count.
4. **Hard Reboot Protocol**:
    - If an environmental effect (or phenotype harvest) reduces Stability to 0, the "Hard Reboot" sequence triggers.
    - Player piece is returned to their starting hex.
    - Attributes reset to 1, Stability resets to 3, and `cubePool` resets to 12.
    - Raw Matter is cleared (0) and Data Clusters reset to 1.

## Consequences
- **Fairness**: Seeded randomness prevents "local luck" and ensures all players face the same environmental difficulty.
- **Synchronicity**: Phase transitions (e.g., `NEXT_PHASE`) only occur once the initiator (host) calculates and broadcasts the event outcome.
- **Recovery Mechanic**: Hard Reboot creates a viable mid-game reset for players who fail high-risk environmental checks.
