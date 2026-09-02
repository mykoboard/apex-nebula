# Board Game Wallet Integration Guide

This document outlines the architecture, ABI specification, packaging standard, and execution model for integrating **Apex Nebula** into the [Board Game Wallet](https://github.com/board-game-wallet) ecosystem.

---

## 1. Architectural Overview

Board Game Wallet executes games within an untrusted, sandboxed Web Worker container (`GameRuntimeHost`). Game logic is fully isolated from the browser DOM, IndexedDB, and network stack. Communication between the Wallet host and the game engine occurs strictly via capability-bounded message passing and WASM linear memory.

```
┌─────────────────────────────────────────────────────────────┐
│                    Board Game Wallet Host                   │
│                                                             │
│  ┌──────────────────────┐        ┌───────────────────────┐  │
│  │  P2P Action Sync &   │        │ Storage & Entitlement │  │
│  │  Signed Action Logs  │        │   Manager (IndexedDB) │  │
│  └──────────┬───────────┘        └───────────┬───────────┘  │
│             │                                │              │
│             ▼                                ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       GameRuntimeHost (Capability-Bounded Bridge)      │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ postMessage (JSON RPC)
┌─────────────────────────────▼───────────────────────────────┐
│              Web Worker / WASM Sandbox Container             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Game Runtime ABI v0.1.0 Exports (`apex_nebula.wasm`) │  │
│  │                                                       │  │
│  │   • init()                                            │  │
│  │   • apply_action(ptr, len) -> (ptr << 32) | len       │  │
│  │   • get_state() -> (ptr << 32) | len                  │  │
│  │   • get_state_hash() -> (ptr << 32) | 32              │  │
│  │   • serialize_snapshot() -> (ptr << 32) | len         │  │
│  │   • load_snapshot(ptr, len) -> u32                    │  │
│  │   • get_valid_actions() -> (ptr << 32) | len          │  │
│  │   • alloc(size) / dealloc(ptr, size)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Deterministic Rules Engine (Rust `engine/`)         │  │
│  │   • 37-Hex Galaxy Generator                           │  │
│  │   • Mulberry32 PRNG with Deterministic Offsets        │  │
│  │   • 5-Phase State Machine & 18-Card Event Deck        │  │
│  │   • Hard Reboot & Metabolic Downclocking              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Game Runtime ABI v0.1.0 Specification

The Rust engine in `engine/` compiles to `wasm32-unknown-unknown` and exports the following C-ABI functions:

### 2.1 Memory Management

| Function | Signature | Description |
|---|---|---|
| `alloc` | `(size: usize) -> *mut u8` | Allocates linear memory buffer in WASM heap for host $\to$ guest data transfer. |
| `dealloc` | `(ptr: *mut u8, size: usize)` | Frees previously allocated buffer from WASM linear memory. |

### 2.2 Lifecycle & State Machine

| Function | Signature | Description |
|---|---|---|
| `init` | `() -> ()` | Initialises fresh game state waiting for `START_GAME`. |
| `apply_action` | `(ptr: *const u8, len: usize) -> u64` | Decodes JSON action from linear memory, validates and applies state transition, and returns packed `(ptr << 32) \| len` pointing to `ActionResult` JSON `{ valid: bool, error: Option<String> }`. |
| `get_state` | `() -> u64` | Serialises canonical `GameState` to JSON and returns packed `(ptr << 32) \| len`. |
| `get_state_hash` | `() -> u64` | Calculates 32-byte SHA-256 digest of canonical state JSON and returns packed `(ptr << 32) \| 32`. Used by P2P layer for desync detection and verification. |
| `serialize_snapshot` | `() -> u64` | Returns complete serialised snapshot of the game state for persistence and savegame storage. |
| `load_snapshot` | `(ptr: *const u8, len: usize) -> u32` | Deserialises snapshot JSON from memory into the active engine instance. Returns `1` on success or `0` on error. |
| `get_valid_actions` | `() -> u64` | Returns packed `(ptr << 32) \| len` containing a JSON array of `ValidAction` descriptors for the current phase. |

---

## 3. Data Models & Action Payloads

### 3.1 Game Actions (`GameAction`)

Actions dispatched via `apply_action` are tagged JSON objects:

```jsonc
// 1. Initialize Game
{
  "type": "START_GAME",
  "seed": 12345,
  "players": [
    { "publicKey": "0xabc...", "name": "Player 1", "color": "red" },
    { "publicKey": "0xdef...", "name": "Player 2", "color": "blue" }
  ]
}

// 2. Setup / Optimization Distribution
{
  "type": "DISTRIBUTE_CUBES",
  "playerPublicKey": "0xabc...",
  "distributions": [
    { "attribute": "NAV", "amount": 2 },
    { "attribute": "LOG", "amount": 1 }
  ]
}

// 3. Confirm Phase
{
  "type": "CONFIRM_PHASE",
  "playerPublicKey": "0xabc..."
}

// 4. Move Player & Trigger Harvest
{
  "type": "MOVE_PLAYER",
  "playerPublicKey": "0xabc...",
  "hexId": "H-1-0"
}

// 5. Finish Phenotype Turn
{
  "type": "FINISH_TURN",
  "playerPublicKey": "0xabc..."
}

// 6. Prune Attribute (Downclocking)
{
  "type": "PRUNE_ATTRIBUTE",
  "playerPublicKey": "0xabc...",
  "attribute": "DEF"
}

// 7. Optimize Data (Upgrade)
{
  "type": "OPTIMIZE_DATA",
  "playerPublicKey": "0xabc..."
}
```

### 3.2 Action Result (`ActionResult`)

```json
{
  "valid": true,
  "error": null
}
```

---

## 4. Package Specification (`manifest.json` & `.bgw.json`)

Games in the Board Game Wallet ecosystem are packaged into a self-contained `.bgw.json` bundle containing manifest metadata and asset checksums.

### 4.1 Manifest Structure

```json
{
  "manifestVersion": 1,
  "gameId": "apex-nebula",
  "version": "0.1.0",
  "title": "Apex Nebula",
  "description": "Strategic evolutionary board game. Balance gradient descent stats against metabolic downclocking on a 37-hex galaxy grid to reach the Singularity.",
  "publisher": {
    "name": "MykoBoard",
    "publicKey": "b5c6d7e8f9a0123456789abcdef0123456789abcdef0123456789abcdef01234",
    "homepage": "https://github.com/mykoboard"
  },
  "engine": {
    "entry": "apex_nebula.wasm",
    "wasmHash": "be18ae717de2b179b7365500a0d8c80947b20234c859424ad5fce0f92354e141",
    "apiVersion": "0.1.0"
  },
  "assets": [
    {
      "path": "apex_nebula.wasm",
      "hash": "be18ae717de2b179b7365500a0d8c80947b20234c859424ad5fce0f92354e141",
      "mimeType": "application/wasm",
      "size": 420040
    }
  ],
  "permissions": [],
  "storageBudget": 2097152,
  "players": {
    "min": 2,
    "max": 4,
    "default": 2
  },
  "categories": ["strategy", "sci-fi", "evolutionary"],
  "languages": ["en"]
}
```

---

## 5. Build, Test & Packaging Workflow

All toolchains run within containerized Docker environments (`rust:1-slim` and `oven/bun:1-alpine`) via the repository `justfile`.

### 5.1 Commands

```bash
# 1. Run native Rust unit and integration test suite (9 tests)
just test-wasm

# 2. Build size-optimized release WASM binary
just build-wasm

# 3. Build WASM, compute SHA-256 digest, and package into dist/apex-nebula.bgw.json
just package

# 4. Run TypeScript tests
just test

# 5. Type-check Vue/TypeScript application
just check
```

### 5.2 Distributable Artifacts

Running `just package` produces:
1. `dist/apex-nebula.bgw.json` — The uploadable manifest bundle for the Wallet Game Library.
2. `dist/apex_nebula.wasm` — The raw compiled WebAssembly module (420 KB).

---

## 6. Determinism & P2P Replay Safety

To guarantee synchronized replication across all peers:
1. **Mulberry32 Bit Arithmetic**: Implemented in Rust with explicit 32-bit wrapping arithmetic (`wrapping_add`, `wrapping_mul`, `wrapping_sub`) mirroring JavaScript `Math.imul`.
2. **Deterministic Player Offsets**: PRNG seeds for player actions are offset by `get_deterministic_offset(publicKey)` to prevent turn or mutation collisions.
3. **Sorted Player Ordering**: Player arrays are sorted by `publicKey` string comparison upon initialization, ensuring that player index iterations never diverge between hosts and guests.
4. **State Hash Verification**: `get_state_hash()` returns a SHA-256 digest of canonical state JSON after each action to immediately catch desynchronization.
