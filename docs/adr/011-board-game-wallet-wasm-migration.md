# ADR 011: Board Game Wallet Integration & Rust WASM Rules Engine Migration

## Status
Accepted

## Context
Apex Nebula was originally implemented with its game rules tightly integrated into TypeScript and XState v5 (`apexNebulaMachine.ts`) within the main frontend thread.

Integrating Apex Nebula into the **Board Game Wallet** ecosystem imposes strict runtime, security, and portability constraints:
1. **Runtime Isolation**: Game rules must execute inside an untrusted Web Worker WASM container with zero DOM, storage, or network privileges (`GameRuntimeHost`).
2. **Deterministic Replay Parity**: The game must support deterministic action log replay and state verification across multiple P2P peers.
3. **C-ABI Export Standard**: Games must conform to the Board Game Wallet Game Runtime ABI v0.1.0 (`init`, `apply_action`, `get_state`, `get_state_hash`, `serialize_snapshot`, `load_snapshot`, `get_valid_actions`, `alloc`, `dealloc`).
4. **Self-Contained Packaging**: Games must be packageable into a standard `.bgw.json` bundle with SHA-256 asset verification.

## Decision
We implemented a pure Rust rules engine in `engine/` and configured the package build workflow directly within the `apex-nebula` repository:

1. **Rust Engine (`engine/`)**:
   - Implemented domain types (`types.rs`), 37-hex grid generation (`grid.rs`), 18-card environmental selection deck (`events.rs`), and game state transitions (`engine.rs`).
   - Implemented exact `Mulberry32` bit-arithmetic PRNG and deterministic public-key offset calculation (`prng.rs`) matching JavaScript runtime math.
   - Implemented Game Runtime ABI v0.1.0 exports (`lib.rs`) with linear memory allocators and JSON serialization.

2. **Automated Packaging (`scripts/package-game.ts` & `manifest.json`)**:
   - `manifest.json` defines metadata, player bounds (2–4), storage budgets, and engine entry (`apex_nebula.wasm`).
   - `scripts/package-game.ts` calculates the SHA-256 digest of the compiled WASM binary and produces `dist/apex-nebula.bgw.json`.

3. **Containerized Tooling (`justfile`)**:
   - Added containerized tasks (`just build-wasm`, `just test-wasm`, `just package`) using `rust:1-slim` and `oven/bun:1-alpine` to ensure reproducible builds on any host system.

## Consequences

### Positive
- **High Performance & Portability**: Pure Rust rules engine compiles to a single 420 KB size-optimized WASM binary.
- **Strict Determinism**: Replay safety and state verification are backed by 32-byte SHA-256 state hashes.
- **Board Game Wallet Compatibility**: Directly installable into any Board Game Wallet library instance.
- **Independent Repository Lifecycle**: The package can be built, tested, and distributed directly from the `apex-nebula` repository without external monorepo dependencies.

### Negative / Trade-offs
- **WASM Memory Boundary**: State serialization across linear memory requires allocating JSON buffers for complex queries.
- **Dual Engine Maintenance**: Changes to game rules must be maintained in the Rust engine, which serves as the canonical source of truth.
