import { PlayerGenome, AttributeType } from './types.ts';

// Helper: Calculate fitness score based on attributes
export const calculateFitness = (genome: PlayerGenome, target: { targetAttribute: AttributeType | AttributeType[] } | null): number => {
    if (!target) return 0;
    const attrs = Array.isArray(target.targetAttribute) ? target.targetAttribute : [target.targetAttribute];
    let totalStats = 0;
    attrs.forEach(attr => {
        const base = genome.baseAttributes?.[attr] || 0;
        const mod = genome.mutationModifiers?.[attr] || 0;
        totalStats += base + mod;
    });
    return totalStats;
};

// Helper: Seeded PRNG (Mulberry32)
export const createPRNG = (seed: number) => {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// Helper: Seeded dice roll (1 to sides)
export const rollSeededDice = (prng: () => number, sides: number): number => {
    return Math.floor(prng() * sides) + 1;
};

// Helper: Check win condition (Gen 0: 30 Data Clusters)
export const checkWinCondition = (genome: PlayerGenome): boolean => {
    return genome.dataClusters >= 30;
};
