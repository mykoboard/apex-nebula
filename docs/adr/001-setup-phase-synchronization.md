# ADR 001: Setup Phase Synchronization

## Status
Proposed

## Context
In the early "Setup Phase" of Apex Nebula, players distribute 12 points among four core attributes (NAV, LOG, DEF, SCN). In a decentralized, local-first environment, real-time synchronization of every point change can be unnecessarily "chatty" and might reveal tactical intent before the game officially begins.

## Decision
We will implement a multi-stage synchronization flow for the Setup Phase:
1. **Local Distribution**: Attribute adjustments (`DISTRIBUTE_CUBES`) will be processed locally on each player's node without immediate broadcast to other peers.
2. **Ready Signaling**: When a player is satisfied with their distribution, they emit a `FINALIZE_SETUP` event. This event signals "Readiness" to all peers but **does not** contain the actual attribute values.
3. **Barrier Synchronization**: The game state machine will track the "Ready" status of all participants.
4. **Final Revelation**: Only when *all* players have signaled readiness will the game transition to the `mutationPhase`. At this point, the final attribute sets are synchronized across the peer network (typically via the Initiator's state sync or a batch update).

## Consequences
- **Reduced Network Traffic**: Eliminates dozens of minor WebRTC messages during the setup phase.
- **Tactical Privacy**: Players can adjust their "build" without revealing it to opponents mid-process.
- **Deterministic Transitions**: Ensures the game only proceeds when every participant is fully prepared.
- **Sync Requirement**: Requires a robust final-state synchronization mechanism at the end of the phase to ensure all nodes have consistent views of all genomes.
