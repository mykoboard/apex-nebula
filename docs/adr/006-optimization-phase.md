# ADR 006: Optimization Phase & Resource Management

## Status
Accepted

## Context
The Optimization Phase (Phase 6) serves as the "cleanup and maintenance" stage of a round. It allows players to prepare their genomes for the next round and creates a resource sink to prevent excessive hoarding of Matter and Data.

## Decision
1. **Resource Conversion**:
    - **Data Optimization**: Players can spend 3 Data Clusters to gain 1 Attribute Cube in their `cubePool`. This allows for mid-game power spikes.
    - **Attribute Leveling**: Gained cubes can be spent to increase attributes at any time during the phase.
        - **Rule**: Attributes can only be increased, not decreased (except via the dedicated "Prune Attribute" action).
        - **Rule**: The initial setup limit of 6 is lifted; attributes can go up to 10.
    - **Attribute Pruning**: Players can reduce a Base Attribute by 1 level (minimum 1) to gain 2 Matter. This enables emergency repairs or pivoting strategies.
2. **Round Maintenance Cost**:
    - A player must pay **1 Matter** to finalize their optimization and systems check.
    - If a player lacks Matter, they must prune an attribute to afford the maintenance.
3. **System Reset**:
    - Upon finalizing the phase (Maintenance), the player's Stability is automatically restored to **3**.
    - All **Mutation Modifiers** are removed, returning the genome to its base attributes for the next round.
    - All **Harvest Results** from the previous Phenotype phase are cleared.
4. **Resouce Capping**:
    - To maintain a high-paced "lean" economy, any remaining Data Clusters or Raw Matter exceeding **2** are discarded at the end of the phase.
    - Resulting state: `data = min(2, data)`, `matter = min(2, matter - 1)`.
5. **UI Interaction**:
    - Optimization controls are grouped in the sidebar.
6. **Phase Flow**:
    - The game moves from **Optimization** back to the **Mutation Phase** of the next round.
    - Important: `confirmedPlayers` is reset upon entering the Mutation phase to ensure a fresh confirmation cycle for stochastic mutation application.

## Consequences
- **Strategic Recovery**: Players who suffered heavily in the Phenotype phase can use Pruning to afford Maintenance and survive the next round.
- **Resource Velocity**: The cap at 2 ensures players must spend resources every round rather than hoarding for a single massive turn.
- **Genome Flexiblity**: Data Optimization provides a non-event path to increasing the total attribute count, rewarding consistent exploration and harvesting.
