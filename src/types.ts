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
    cubePool: number; // Remaining cubes to distribute during setup
}

export interface EnvironmentalEvent {
    id: string;
    name: string;
    description: string;
    targetAttribute: AttributeType;
    threshold: number;
    penalty: number | { type: 'stability' | 'data' | 'matter' | 'displacement' | 'mutation' | 'blindness', amount: number };
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
    ledger?: LedgerEntry[];
    winners: string[];
    lastMutationRoll: number | null;
    lastHarvestRoll: number | null;
    lastHarvestSuccess: boolean | null;
}

export type ApexNebulaEvent =
    | { type: 'SYNC_STATE'; context: Partial<ApexNebulaContext> }
    | { type: 'MOVE_PLAYER'; playerId: string; hexId: string }
    | { type: 'SPEND_INSIGHT'; playerId: string; amount: number }
    | { type: 'DISTRIBUTE_CUBES'; playerId: string; attribute: AttributeType; amount: number }
    | { type: 'FINALIZE_SETUP'; playerId: string }
    | { type: 'COLONIZE_PLANET'; playerId: string; resourceType?: 'Matter' | 'Data' }
    | { type: 'HUSTLE'; attackerId: string; defenderId: string; category: string }
    | { type: 'NEXT_PHASE' }
    | { type: 'RESET' };
