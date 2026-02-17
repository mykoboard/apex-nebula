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

// Helper: Check win condition (Gen 0: 30 Data Clusters)
export const checkWinCondition = (genome: PlayerGenome): boolean => {
    return genome.dataClusters >= 30;
};
