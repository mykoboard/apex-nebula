# ADR 008: Replicated State Machine — Event Broadcasting over Full State Sync

## Status
Accepted

## Context
The original multiplayer architecture used a **host-authoritative SYNC_STATE** model:
- The host ran the canonical state machine and broadcast the entire `ApexNebulaContext` (≈15KB deep object) to guests after every transition.
- Guests replaced their full local context on each `SYNC_STATE` message, re-entering the target phase via a global event handler.
- `isInitiator` guards gated deterministic actions (`applyAllMutations`, `drawEnvironmentalEvent`) so only the host computed them.

This created several fundamental problems:
1. **Identity loss**: The guest's `localPlayerId` was overwritten on every sync, causing it to misidentify itself as a remote player and lose the ability to act on its own genome.
2. **Asymmetric machine logic**: `isInitiator` guards meant the host and guest ran different code paths, making the machine non-deterministic across peers and impossible to test as a single unit.
3. **Race conditions**: Optimistic guest dispatches diverged from the host's authoritative state, producing wrong mutation assignments, stale phenotype actions, and double-incremented player indices.
4. **Bandwidth waste**: Broadcasting the full context (~15KB) on every input event was unnecessary when only a small slice changed.

## Decision
We replaced the host-authoritative SYNC_STATE model with a **replicated state machine** where each peer runs identical logic and broadcasts individual game events:

```
Command → Validate → Process locally → Broadcast event → Peer applies same event
```

Concretely:
1. **Removed `SYNC_STATE`** from the event union, the global handler, and the `syncState` action. No full-context broadcast exists.
2. **Removed `isInitiator` guards** from `applyAllMutations` and `drawEnvironmentalEvent`. Both peers compute these deterministically from the same seeded PRNG (`seed + round + index`).
3. **Removed SYNC_STATE entry conditionals** from phase states (`event.type === 'SYNC_STATE' ? {} : {...}`). Phase entry actions now always execute.
4. **Unified `handleAction`** in `ApexNebula.vue`: every peer processes actions locally via `machine.send()` AND broadcasts the event to peers. No host/guest branching.
5. **Simplified `handleMessage`**: received peer events are forwarded directly to the local machine.
6. **START_GAME is broadcast** by the host so the guest machine initializes with identical seed, players, and genome order.

The ownership gate (`localPlayerId` check in `handleAction`) remains to prevent a peer from dispatching actions on behalf of another player.

## Consequences

### Positive
- **Identity preserved**: `localPlayerId` is set once at machine creation and never overwritten. Each peer always knows which player it controls.
- **Symmetric machine**: Both peers run identical XState logic. The machine can be tested as a single unit — the "replicated determinism" test suite creates two independent actors, replays the same events, and asserts identical genomes, mutations, turns, and event draws.
- **No race conditions**: There is no optimistic/deferred dispatch split. Every peer processes every event immediately and consistently.
- **Lower bandwidth**: Individual events (50–200 bytes) replace full context dumps (~15KB).
- **Simpler code**: ~40 lines removed from `ApexNebula.vue`; no `PHASE_CHANGING_EVENTS` set, no host/guest branching, no deep-watch context broadcaster.

### Negative / Risks
- **Determinism is critical**: All stochastic logic must use the seeded PRNG. A single non-deterministic operation (e.g., `Math.random()`, `Date.now()`, or unordered `Object.keys()`) would cause state divergence between peers.
- **No late-join or recovery**: Without SYNC_STATE, a peer that joins after START_GAME or disconnects mid-game cannot catch up. A separate recovery mechanism (event log replay or one-time state snapshot) would need to be added if this becomes a requirement.
- **Event ordering assumption**: The model assumes events are processed in the same order on all peers. For this turn-based game with sequential phenotype turns and commutative setup/confirmation, this holds naturally. A concurrent real-time game would require a consensus protocol or sequence numbering.
