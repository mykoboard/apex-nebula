# ADR 010: Hard Reboot Cube Preservation

## Status
Accepted

## Context
The "Hard Reboot" is a catastrophic failure state triggered by losing all Stability or failing certain critical events (like "The Great Filter"). Originally, this reset the player back to the starting state:
- All attributes to 1.
- Cube pool to 8 (Total 12 cubes).
- Position to Home Nebula.
- Data/Matter mostly cleared.

This was found to be too punishing for players who had progressed significantly (e.g., in later rounds), as it completely wiped dozens of turns of optimization with no "legacy" or "memory" of previous growth.

## Decision
We implemented a **Cube Preservation** rule during the Hard Reboot and Stability resets:
1. Calculate the total number of cubes in the player's genome (Base Attributes + Cube Pool).
2. Calculate "Acquired Cubes" as `Total - 12` (baseline).
3. Preserve 50% of these acquired cubes (`floor(Acquired / 2)`).
4. The player resets to the starting position and attributes, but their new `cubePool` is `8 + preserved cubes`.

Example: A player with 20 total cubes (8 acquired) who suffers a Hard Reboot will keep 4 of those cubes, starting their next cycle with a `cubePool` of 12 (Total 16 cubes).

## Consequences

### Positive
- **Reduced Frustration**: Players maintain a portion of their long-term growth even after a failure, encouraging risky play and long-term investment.
- **Dynamic Recovery**: Allows a player who "crashed" to rebuild faster than a brand-new player, reflecting the theme of an evolving architecture.
- **Strategic Depth**: Players can now weigh the risk of stability loss against the "safety net" of their accumulated cube count.

### Negative / Risks
- **Complexity**: Adds another calculation to the state machine's reset logic.
- **Balance**: May require tuning if the preservation rate (50%) makes recovery too easy in the late game.
