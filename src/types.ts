import { LedgerEntry } from '@mykoboard/integration';

export type Color = 'red' | 'green' | 'blue' | 'yellow';
export type GamePhase = 'setup' | 'mutation' | 'phenotype' | 'environmental' | 'competitive' | 'optimization';
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
    color: Color;
}

export interface ApexNebulaContext {
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

export type ApexNebulaEvent =
    | { type: 'SYNC_STATE'; context: ApexNebulaContext; seed?: number }
    | { type: 'MOVE_PLAYER'; playerId: string; hexId: string }
    | { type: 'SPEND_INSIGHT'; playerId: string; amount: number }
    | { type: 'DISTRIBUTE_CUBES'; playerId: string; attribute: AttributeType; amount: number }
    | { type: 'INITIATE_MUTATION' }
    | { type: 'FINISH_TURN'; playerId: string }
    | { type: 'CONFIRM_PHASE'; playerId: string }
    | { type: 'HUSTLE'; attackerId: string; defenderId: string; category: string }
    | { type: 'PRUNE_ATTRIBUTE'; playerId: string; attribute: AttributeType }
    | { type: 'OPTIMIZE_DATA'; playerId: string }
    | { type: 'NEXT_PHASE' }
    | { type: 'FORCE_EVENT'; eventId: string }
    | { type: 'START_GAME'; seed?: number }
    | { type: 'RESET' };
