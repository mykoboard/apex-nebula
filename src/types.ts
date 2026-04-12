import { LedgerEntry } from '@mykoboard/integration';

export type Color = 'red' | 'green' | 'blue' | 'yellow';
export type GamePhase = 'waiting' | 'setup' | 'mutation' | 'phenotype' | 'environmental' | 'competitive' | 'optimization';
export type AttributeType = 'NAV' | 'LOG' | 'DEF' | 'SCN';

export type HexType =
    | 'HomeNebula'
    | 'ScrapHeap' | 'SignalPing' | 'GravityEddy' | 'LogicFragment' | 'DataCluster' // Tier 1
    | 'SolarFlare' | 'DeepBuoy' | 'IonCloud' | 'SystemCache' | 'EncryptedRelay' // Tier 2
    | 'Supernova' | 'PulsarArchive' | 'GravityWell' | 'CoreDatabase' | 'SingularityShard' // Tier 3
    | 'Singularity'; // Core

export interface PlayerPiece {
    playerId: string;
    hexId: string;
}

export interface HexCell {
    id: string;
    type: HexType;
    threshold: number;
    yield: {
        matter: number;
        data: number;
    };
    targetAttribute: AttributeType | AttributeType[]; // What is tested here
    x: number;
    y: number;
    depletedUntilRound?: number;
}

export interface PlayerGenome {
    playerId: string;
    stability: number;
    dataClusters: number;
    rawMatter: number;
    insightTokens: number;
    lockedSlots: number[]; // Future use for frozen attributes
    baseAttributes: Record<AttributeType, number>; // Console cubes (0-10)
    mutationModifiers: Record<AttributeType, number>; // Stochastic noise (+/-)
    tempAttributeModifiers: Record<AttributeType, number>; // Environmental effects (-/+)
    cubePool: number; // Remaining cubes to distribute during setup
    hasPassedSingularity?: boolean;
}

export type EventCardType = 'Hazard' | 'Pressure' | 'Shift' | 'Apex Lead' | 'Bonus';
export type EventCheckType = AttributeType | 'TOTAL_SUM' | 'NONE';

export interface EnvironmentalEvent {
    id: string;
    type: EventCardType;
    name: string;
    description: string;
    checkType: EventCheckType;
    threshold: number | 'AVG+2';
    effects: {
        onSuccess?: EventEffect;
        onFailure?: EventEffect;
        global?: EventEffect;
    };
}

export interface EventEffect {
    type:
    | 'stability'
    | 'data'
    | 'matter'
    | 'displacement'
    | 'movement_cost'
    | 'stat_mod_temp'
    | 'stat_mod_perm'
    | 'hard_reboot'
    | 'map_shift'
    | 'transfer'
    | 'gain_insight';
    amount?: number;
    attribute?: AttributeType;
    target?: 'self' | 'all' | 'priority' | 'lowest_sum' | 'most_data' | 'most_matter' | 'highest_stat' | 'sum_26_plus' | 'stat_8_plus';
    details?: any;
}

export interface Player {
    id: string;
    name: string;
    publicKey?: string;
    color: Color;
}

export interface ApexNebulaContext {
    localPlayerId: string;
    players: Player[];
    currentPlayerIndex: number;
    genomes: PlayerGenome[];
    pieces: PlayerPiece[];
    hexGrid: HexCell[];
    eventDeck: EnvironmentalEvent[];
    currentEvent: EnvironmentalEvent | null;
    gamePhase: GamePhase;
    round: number;
    isInitiator: boolean;
    seed?: number;
    mutationResults: Record<string, { attr: AttributeType; magnitude: number; attrRoll: number; magRoll: number }>;
    priorityPlayerId: string;
    turnOrder: string[];
    dataSpentThisRound: Record<string, number>;
    ledger?: LedgerEntry[];
    winners: string[];
    lastMutationRoll: number | null;
    lastHarvestSuccess: boolean | null;
    lastHarvestResults: { playerId: string; success: boolean; attribute: string; roll: number; magnitude: number }[];
    phenotypeActions: Record<string, { movesMade: number; harvestDone: boolean }>;
    confirmedPlayers: string[];
    lastEventResults?: Record<string, { roll: number; modifier: number; success: boolean }>;
}

// ── Game Events ─────────────────────────────────────────────────────────────
// Each event is an individually typed interface grouped by game phase.
// The composite `ApexNebulaEvent` union is derived from them.
//
// Usage:
//   import type { MovePlayerEvent, EventPayload } from '@/types';
//   const payload: EventPayload<'MOVE_PLAYER'> = { playerId, hexId };

// ── Lifecycle ───────────────────────────────────────────────────────────────

/** Initializes the game — creates genomes, places pieces, sets seed. */
export interface StartGameEvent {
    type: 'START_GAME';
    /** PRNG seed for deterministic replay across peers. */
    seed?: number;
    /** Ordered list of players; index determines home nebula slot. */
    players: Player[];
}

/** Resets the game back to mutationPhase with fresh genomes. */
export interface ResetEvent {
    type: 'RESET';
}

// ── Setup Phase ─────────────────────────────────────────────────────────────

/** Distributes cubes from the pool to a genome attribute during setup. */
export interface DistributeCubesEvent {
    type: 'DISTRIBUTE_CUBES';
    playerId: string;
    attribute: AttributeType;
    /** Number of cubes to move from pool → attribute. */
    amount: number;
}

// ── Shared / Multi-Phase ────────────────────────────────────────────────────

/** Player confirms they are done with the current phase. Idempotent. */
export interface ConfirmPhaseEvent {
    type: 'CONFIRM_PHASE';
    playerId: string;
}

/** Advances to the next phase. Used in environmental → competitive → optimization. */
export interface NextPhaseEvent {
    type: 'NEXT_PHASE';
}

// ── Mutation Phase ──────────────────────────────────────────────────────────

/** Triggers the mutation roll sequence (currently auto-applied on phase entry). */
export interface InitiateMutationEvent {
    type: 'INITIATE_MUTATION';
}

// ── Phenotype Phase ─────────────────────────────────────────────────────────

/** Moves the active player's piece to an adjacent hex and triggers harvest. */
export interface MovePlayerEvent {
    type: 'MOVE_PLAYER';
    playerId: string;
    /** Target hex ID (must be adjacent, distance=1). */
    hexId: string;
}

/** Ends the active player's phenotype turn. */
export interface FinishTurnEvent {
    type: 'FINISH_TURN';
    playerId: string;
}

/** Spends insight tokens for a re-roll or bonus. */
export interface SpendInsightEvent {
    type: 'SPEND_INSIGHT';
    playerId: string;
    amount: number;
}

// ── Environmental Phase ─────────────────────────────────────────────────────

/** Forces a specific environmental event card (debug / host override). */
export interface ForceEventEvent {
    type: 'FORCE_EVENT';
    /** ID of the environmental event to force-draw. */
    eventId: string;
}

// ── Competitive Phase ───────────────────────────────────────────────────────

/** One player hustles another — attribute contest resolved by dice. */
export interface HustleEvent {
    type: 'HUSTLE';
    attackerId: string;
    defenderId: string;
    /** Attribute category used for the contest. */
    category: string;
}

// ── Optimization Phase ──────────────────────────────────────────────────────

/** Removes 1 point from an attribute, gaining 2 raw matter. */
export interface PruneAttributeEvent {
    type: 'PRUNE_ATTRIBUTE';
    playerId: string;
    attribute: AttributeType;
}

/** Spends 3 data clusters to gain 1 cube back into the pool. */
export interface OptimizeDataEvent {
    type: 'OPTIMIZE_DATA';
    playerId: string;
}

// ── Composite Union ─────────────────────────────────────────────────────────

export type ApexNebulaEvent =
    | StartGameEvent
    | ResetEvent
    | DistributeCubesEvent
    | ConfirmPhaseEvent
    | NextPhaseEvent
    | InitiateMutationEvent
    | MovePlayerEvent
    | FinishTurnEvent
    | SpendInsightEvent
    | ForceEventEvent
    | HustleEvent
    | PruneAttributeEvent
    | OptimizeDataEvent;

/** Extracts the payload fields (everything except `type`) for a given event type string. */
export type EventPayload<T extends ApexNebulaEvent['type']> = Omit<
    Extract<ApexNebulaEvent, { type: T }>,
    'type'
>;
