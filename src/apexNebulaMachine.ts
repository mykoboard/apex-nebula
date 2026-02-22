import { createMachine, assign } from 'xstate';
import {
    GamePhase,
    ApexNebulaContext,
    ApexNebulaEvent,
    AttributeType
} from './types';
import { createHexGrid } from './components/HexGrid';
import { INITIAL_EVENT_DECK } from './components/EventDeck';
import { calculateFitness, checkWinCondition, createPRNG, rollSeededDice, getHexDistance, shuffleSeeded, calculateMaintenanceCost } from './utils';

const EMPTY_MODS = { NAV: 0, LOG: 0, DEF: 0, SCN: 0 };

// XState machine
export const apexNebulaMachine = createMachine({
    types: {} as {
        context: ApexNebulaContext;
        events: ApexNebulaEvent;
    },
    id: 'apexNebula',
    initial: 'waitingForPlayers',
    context: ({ input }: { input: any }) => ({
        players: input?.players ?? [],
        currentPlayerIndex: 0,
        genomes: input?.genomes ?? [],
        pieces: input?.pieces ?? [],
        hexGrid: createHexGrid(input?.seed || 12345),
        eventDeck: [...INITIAL_EVENT_DECK],
        currentEvent: null,
        gamePhase: 'setup' as GamePhase,
        round: 1,
        isInitiator: input?.isInitiator ?? false,
        seed: input?.seed,
        mutationResults: {},
        priorityPlayerId: '',
        turnOrder: [],
        dataSpentThisRound: {},
        winners: [],
        lastMutationRoll: null,
        lastHarvestRoll: null,
        lastHarvestSuccess: null,
        lastHarvestResults: [],
        phenotypeActions: {},
        confirmedPlayers: [],
    }),
    states: {
        waitingForPlayers: {
            entry: () => console.log('Machine State: waitingForPlayers'),
            on: {
                START_GAME: {
                    target: 'setupPhase',
                    actions: assign({
                        seed: ({ event }) => event.type === 'START_GAME' ? event.seed : undefined,
                        turnOrder: ({ context }) => context.players.map(p => p.id),
                    }),
                },
                SYNC_STATE: {
                    target: 'setupPhase',
                    actions: 'syncState',
                },
            },
        },
        setupPhase: {
            entry: [
                assign({ gamePhase: 'setup' }),
                () => console.log('Machine State: setupPhase')
            ],
            on: {
                DISTRIBUTE_CUBES: {
                    actions: 'distributeCubes',
                },
            },
            always: {
                target: 'mutationPhase',
                guard: 'allPlayersReady',
                actions: 'calculateInitialPriority',
            },
        },
        mutationPhase: {
            entry: [
                assign({
                    gamePhase: 'mutation',
                    currentPlayerIndex: 0,
                    confirmedPlayers: []
                }),
                () => console.log('Machine State: mutationPhase')
            ],
            on: {
                INITIATE_MUTATION: [
                    {
                        actions: 'applyMutations',
                        guard: 'isLastMutationRoll',
                    },
                    {
                        actions: ['applyMutations', 'nextMutationPlayer'],
                    }
                ],
                CONFIRM_PHASE: {
                    actions: 'confirmPhase',
                },
                DISTRIBUTE_CUBES: {
                    actions: 'distributeCubes',
                },
            },
            always: {
                target: 'phenotypePhase',
                guard: 'allPlayersConfirmed',
            },
        },
        phenotypePhase: {
            entry: [
                assign({
                    gamePhase: 'phenotype',
                    confirmedPlayers: [],
                    currentPlayerIndex: 0,
                    phenotypeActions: {}
                }),
                () => console.log('Machine State: phenotypePhase')
            ],
            on: {
                MOVE_PLAYER: {
                    actions: 'moveAndHarvest',
                    guard: 'canMove',
                },
                FINISH_TURN: [
                    {
                        target: 'environmentalPhase',
                        guard: 'isLastPhenotypeTurn',
                    },
                    {
                        actions: 'nextPhenotypePlayer',
                    }
                ],
            },
        },
        environmentalPhase: {
            entry: [
                assign({ gamePhase: 'environmental' }),
                'drawEnvironmentalEvent',
            ],
            on: {
                NEXT_PHASE: {
                    target: 'competitivePhase',
                    actions: 'evaluateEnvironmentalFitness',
                },
            },
        },
        competitivePhase: {
            entry: assign({ gamePhase: 'competitive' }),
            on: {
                HUSTLE: {
                    actions: 'resolveHustle',
                },
                NEXT_PHASE: {
                    target: 'optimizationPhase',
                },
            },
        },
        optimizationPhase: {
            entry: assign({ gamePhase: 'optimization', confirmedPlayers: [] }),
            on: {
                OPTIMIZE_DATA: {
                    actions: 'optimizeData',
                },
                PRUNE_ATTRIBUTE: {
                    actions: 'pruneAttribute',
                },
                CONFIRM_PHASE: {
                    actions: 'confirmPhase',
                },
                DISTRIBUTE_CUBES: {
                    actions: 'distributeCubes',
                },
                NEXT_PHASE: [
                    { target: 'won', guard: 'checkWin', actions: 'finalizeOptimization' },
                    { target: 'nextRound', actions: 'finalizeOptimization' },
                ],
            },
            always: [
                {
                    target: 'won',
                    guard: 'allConfirmedAndWin',
                    actions: 'finalizeOptimization'
                },
                {
                    target: 'nextRound',
                    guard: 'allPlayersConfirmed',
                    actions: 'finalizeOptimization'
                }
            ]
        },
        nextRound: {
            always: {
                target: 'mutationPhase',
                actions: ['incrementRound', 'updateRoundPriority'],
            },
        },
        won: {
            entry: 'recordWinner',
            on: {
                RESET: {
                    target: 'mutationPhase',
                    actions: 'resetGame',
                },
            },
        },
    },
    on: {
        SYNC_STATE: {
            actions: 'syncState',
        },
        FORCE_EVENT: {
            target: '.environmentalPhase',
            actions: 'forceEnvironmentalEvent',
        },
    },
}, {
    actions: {
        syncState: assign(({ event }) => {
            if (event.type !== 'SYNC_STATE') return {};
            return {
                ...event.context,
                seed: event.seed ?? event.context.seed
            };
        }),

        calculateInitialPriority: assign(({ context }) => {
            const prng = createPRNG(context.seed || 12345);
            const scores = context.players.map(p => {
                const genome = context.genomes.find(g => g.playerId === p.id)!;
                const baseScore = genome.baseAttributes.NAV + genome.baseAttributes.SCN;
                const tie1 = genome.baseAttributes.LOG;
                const tie2 = rollSeededDice(prng, 6);
                return { playerId: p.id, score: baseScore * 10000 + tie1 * 100 + tie2 };
            });

            const sorted = [...scores].sort((a, b) => b.score - a.score);
            const turnOrder = sorted.map(s => s.playerId);
            return {
                turnOrder,
                priorityPlayerId: turnOrder[0],
                currentPlayerIndex: 0
            };
        }),

        updateRoundPriority: assign(({ context }) => {
            const scores = context.players.map(p => {
                const spent = context.dataSpentThisRound[p.id] || 0;
                return { playerId: p.id, spent };
            });

            // If tied, keep relative order but prioritize high spenders
            // For now simple: highest spender gets token.
            const sorted = [...scores].sort((a, b) => b.spent - a.spent);
            const winnerId = sorted[0].playerId;

            // Shift turnOrder so winner comes first
            const oldIdx = context.turnOrder.indexOf(winnerId);
            const newTurnOrder = [
                ...context.turnOrder.slice(oldIdx),
                ...context.turnOrder.slice(0, oldIdx)
            ];

            return {
                turnOrder: newTurnOrder,
                priorityPlayerId: winnerId,
                currentPlayerIndex: 0,
                dataSpentThisRound: {} // Reset for next round
            };
        }),

        nextMutationPlayer: assign(({ context }) => ({
            currentPlayerIndex: context.currentPlayerIndex + 1
        })),

        applyMutations: assign(({ context }) => {
            const activePlayerId = context.turnOrder[context.currentPlayerIndex];
            const seed = (context.seed ?? 12345) + context.round + context.currentPlayerIndex;
            const prng = createPRNG(seed);
            const attributeMap: AttributeType[] = ['NAV', 'LOG', 'DEF', 'SCN'];

            console.log(`Applying mutation for ${activePlayerId} using seed offset ${context.currentPlayerIndex}`);

            const attrRoll = rollSeededDice(prng, 4);
            const attr = attributeMap[attrRoll - 1];
            const magRoll = rollSeededDice(prng, 6);
            const magnitude = magRoll <= 2 ? -1 : (magRoll >= 5 ? 1 : 0);

            const newResults = {
                ...context.mutationResults,
                [activePlayerId]: { attr, magnitude, attrRoll, magRoll }
            };

            const newGenomes = context.genomes.map(g => {
                if (g.playerId !== activePlayerId) return g;
                return {
                    ...g,
                    mutationModifiers: {
                        ...g.mutationModifiers,
                        [attr]: (g.mutationModifiers[attr] || 0) + magnitude
                    }
                };
            });

            return { genomes: newGenomes, mutationResults: newResults };
        }),

        spendInsightForReroll: assign(({ context, event }) => {
            if (event.type !== 'SPEND_INSIGHT') return {};
            const { playerId, amount } = event;
            const genomeIndex = context.genomes.findIndex(g => g.playerId === playerId);
            if (genomeIndex === -1) return {};
            const genome = context.genomes[genomeIndex];
            if (genome.insightTokens < amount) return {};

            const newGenomes = context.genomes.map((g, idx) =>
                idx === genomeIndex ? { ...g, insightTokens: g.insightTokens - amount } : g
            );
            return { genomes: newGenomes };
        }),

        distributeCubes: assign(({ context, event }) => {
            if (event.type !== 'DISTRIBUTE_CUBES') return {};
            const { playerId, attribute, amount } = event;
            const genomeIndex = context.genomes.findIndex(g => g.playerId === playerId);
            if (genomeIndex === -1) return {};
            const genome = context.genomes[genomeIndex];

            // If attribute is missing, it's an obfuscated update (just decrement pool)
            if (!attribute) {
                if (genome.cubePool - amount < 0 && amount > 0) return {};
                const newGenomes = context.genomes.map((g, idx) =>
                    idx === genomeIndex ? { ...g, cubePool: g.cubePool - amount } : g
                );
                return { genomes: newGenomes };
            }

            const currentCubes = genome.baseAttributes[attribute];
            const newCubes = currentCubes + amount;

            if (newCubes < 1 || newCubes > 10) return {};
            if (context.gamePhase === 'setup' && newCubes > 6) return {};
            if (context.gamePhase === 'optimization' && amount < 0) return {}; // No reductions in Optimization
            if (genome.cubePool - amount < 0 && amount > 0) return {};

            const newGenomes = context.genomes.map((g, idx) =>
                idx === genomeIndex ? {
                    ...g,
                    baseAttributes: {
                        ...g.baseAttributes,
                        [attribute]: newCubes
                    },
                    cubePool: g.cubePool - amount
                } : g
            );
            return { genomes: newGenomes };
        }),


        nextPhenotypePlayer: assign(({ context }) => ({
            currentPlayerIndex: context.currentPlayerIndex + 1
        })),

        moveAndHarvest: assign(({ context, event }) => {
            if (event.type !== 'MOVE_PLAYER') return {};
            const { playerId, hexId } = event;
            console.log(`Action: moveAndHarvest for ${playerId} to ${hexId}`);

            const pieceIndex = context.pieces.findIndex(p => p.playerId === playerId);
            if (pieceIndex === -1) return {};

            const targetHex = context.hexGrid.find(h => h.id === hexId);
            if (!targetHex) return {};

            // 1. Move the piece
            const newPieces = context.pieces.map((p, idx) =>
                idx === pieceIndex ? { ...p, hexId } : p
            );

            // 2. Automated Harvest Logic
            const genomeIndex = context.genomes.findIndex(g => g.playerId === playerId);
            const genome = context.genomes[genomeIndex];
            const results: { playerId: string; success: boolean; attribute: string; roll: number; magnitude: number }[] = [];

            // Seeded PRNG for deterministic harvest
            const seed = (context.seed || 12345) + context.round + context.currentPlayerIndex + (context.phenotypeActions[playerId]?.movesMade || 0);
            const prng = createPRNG(seed);

            const attrsToCheck = Array.isArray(targetHex.targetAttribute) ? targetHex.targetAttribute : [targetHex.targetAttribute];
            const isDoubleAward = targetHex.yield.matter > 0 && targetHex.yield.data > 0;
            const checks = isDoubleAward ? [attrsToCheck[0], attrsToCheck[0]] : attrsToCheck;

            let anyFailure = false;
            let successMatter = false;
            let successData = false;

            checks.forEach((attr, index) => {
                const roll = rollSeededDice(prng, 6);
                const magnitude = roll <= 2 ? -1 : roll <= 4 ? 0 : 1;
                const attrValue = (genome.baseAttributes[attr] || 0) + (genome.mutationModifiers[attr] || 0);
                const success = (attrValue + magnitude) >= targetHex.threshold;

                results.push({ playerId, success, attribute: attr, roll, magnitude });

                if (!success) {
                    anyFailure = true;
                } else if (isDoubleAward) {
                    if (index === 0) successMatter = true;
                    if (index === 1) successData = true;
                }
            });

            let stabilityLoss = 0;
            if (isDoubleAward) {
                if (!successMatter) stabilityLoss++;
                if (!successData) stabilityLoss++;
            } else {
                if (anyFailure) stabilityLoss++;
            }

            const newGenomes = context.genomes.map((g) => {
                if (g.playerId !== playerId) return g;

                const passedSingularity = targetHex.type === 'Singularity' && !anyFailure;

                return {
                    ...g,
                    rawMatter: g.rawMatter + (isDoubleAward ? (successMatter ? targetHex.yield.matter : 0) : (!anyFailure ? targetHex.yield.matter : 0)),
                    dataClusters: g.dataClusters + (isDoubleAward ? (successData ? targetHex.yield.data : 0) : (!anyFailure ? targetHex.yield.data : 0)),
                    stability: Math.max(0, g.stability - stabilityLoss),
                    hasPassedSingularity: g.hasPassedSingularity || passedSingularity
                };
            });

            const currentActions = context.phenotypeActions[playerId] || { movesMade: 0, harvestDone: false };

            return {
                pieces: newPieces,
                genomes: newGenomes.map(g => {
                    if (g.playerId === playerId && g.stability <= 0) {
                        console.log(`STABILITY CRITICAL for ${playerId}. Triggering Hard Reboot.`);
                        const playerIdx = context.players.findIndex(p => p.id === playerId);
                        const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
                        const startHex = starts[playerIdx % starts.length];

                        // Update piece to startHex immediately
                        newPieces[pieceIndex] = { ...newPieces[pieceIndex], hexId: startHex };

                        return {
                            ...g,
                            stability: 3,
                            dataClusters: 1,
                            rawMatter: 0,
                            baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                            cubePool: 12,
                        };
                    }
                    return g;
                }),
                lastHarvestResults: results,
                phenotypeActions: {
                    ...context.phenotypeActions,
                    [playerId]: { ...currentActions, movesMade: currentActions.movesMade + 1 }
                }
            };
        }),

        drawEnvironmentalEvent: assign(({ context }) => {
            if (context.currentEvent) return {}; // Skip if already forced

            let currentDeck = context.eventDeck;
            let currentSeed = context.seed || 12345;

            if (currentDeck.length === 0) {
                const prng = createPRNG(currentSeed + context.round);
                currentDeck = shuffleSeeded([...INITIAL_EVENT_DECK], prng);
            }

            const event = currentDeck[0];
            const newDeck = currentDeck.slice(1);
            return {
                currentEvent: event || null,
                eventDeck: newDeck,
            };
        }),

        forceEnvironmentalEvent: assign(({ context, event }) => {
            if (event.type !== 'FORCE_EVENT') return {};
            const targetEvent = INITIAL_EVENT_DECK.find(e => e.id === event.eventId) || context.eventDeck.find(e => e.id === event.eventId);
            if (!targetEvent) return {};
            return {
                currentEvent: targetEvent,
                gamePhase: 'environmental' as GamePhase,
            };
        }),

        evaluateEnvironmentalFitness: assign(({ context }) => {
            if (!context.currentEvent) return {};
            const event = context.currentEvent;
            console.log('--- EVALUATING EVENT:', event.name, '---');
            const checkType = event.checkType;

            // 1. Calculate threshold
            let thresholdValue = 0;
            if (typeof event.threshold === 'number') {
                thresholdValue = event.threshold;
            } else if (event.threshold === 'AVG+2') {
                const totalStats = context.genomes.reduce((sum, g) => {
                    return sum + calculateFitness(g, 'TOTAL_SUM');
                }, 0);
                thresholdValue = (totalStats / context.players.length) + 2;
            }

            // 2. Identify target players
            const getPlayersByTarget = (target?: string): string[] => {
                console.log('Finding targets for:', target);
                if (!target || target === 'self') {
                    const all = context.players.map(p => p.id);
                    console.log('Target self -> all players:', all);
                    return all;
                }
                if (target === 'all') return context.players.map(p => p.id);
                if (target === 'priority') return [context.priorityPlayerId];
                if (target === 'lowest_sum') {
                    const sorted = [...newGenomes].sort((a, b) => calculateFitness(a, 'TOTAL_SUM') - calculateFitness(b, 'TOTAL_SUM'));
                    const low = sorted.length > 0 ? [sorted[0].playerId] : [];
                    console.log('Target lowest_sum ->', low);
                    return low;
                }
                if (target === 'highest_sum') {
                    const sorted = [...newGenomes].sort((a, b) => calculateFitness(b, 'TOTAL_SUM') - calculateFitness(a, 'TOTAL_SUM'));
                    const high = sorted.length > 0 ? [sorted[0].playerId] : [];
                    console.log('Target highest_sum ->', high);
                    return high;
                }
                if (target === 'most_data') {
                    const sorted = [...newGenomes].sort((a, b) => b.dataClusters - a.dataClusters);
                    return sorted.length > 0 ? [sorted[0].playerId] : [];
                }
                if (target === 'most_matter') {
                    const sorted = [...newGenomes].sort((a, b) => b.rawMatter - a.rawMatter);
                    return sorted.length > 0 ? [sorted[0].playerId] : [];
                }
                if (target === 'highest_stat') {
                    return context.players.map(p => p.id);
                }
                if (target === 'sum_26_plus') {
                    const res = newGenomes.filter(g => calculateFitness(g, 'TOTAL_SUM') >= 26).map(g => g.playerId);
                    console.log('Target sum_26_plus ->', res);
                    return res;
                }
                if (target === 'stat_8_plus') {
                    const res = newGenomes.filter(g => Object.values(g.baseAttributes).some(v => v >= 8)).map(g => g.playerId);
                    console.log('Target stat_8_plus ->', res);
                    return res;
                }
                return [];
            };

            const applyEffect = (genome: any, effect: any) => {
                const newGenome = { ...genome };
                const amount = effect.fraction ? Math.floor(genome.dataClusters * 0.5) : (effect.amount || 0);

                switch (effect.type) {
                    case 'stability':
                        newGenome.stability = Math.max(0, newGenome.stability - amount);
                        break;
                    case 'data':
                        newGenome.dataClusters = Math.max(0, newGenome.dataClusters - amount);
                        break;
                    case 'matter':
                        if (newGenome.rawMatter >= amount) {
                            newGenome.rawMatter -= amount;
                        } else if (effect.details?.fallback === 'stability') {
                            newGenome.stability = Math.max(0, newGenome.stability - 1);
                        }
                        break;
                    case 'stat_mod_temp':
                        const modVal = effect.amount || 0;
                        if (effect.attribute) {
                            newGenome.tempAttributeModifiers[effect.attribute] += modVal;
                        } else {
                            // Apply to all
                            (Object.keys(newGenome.tempAttributeModifiers) as AttributeType[]).forEach(k => {
                                newGenome.tempAttributeModifiers[k] += modVal;
                            });
                        }
                        break;
                    case 'stat_mod_perm':
                        if (effect.target === 'highest_stat') {
                            const stats: AttributeType[] = ['NAV', 'LOG', 'DEF', 'SCN'];
                            const highest = stats.reduce((prev, curr) =>
                                (newGenome.baseAttributes[curr] > newGenome.baseAttributes[prev]) ? curr : prev
                            );
                            newGenome.baseAttributes[highest] = Math.max(1, newGenome.baseAttributes[highest] - 1);
                        }
                        break;
                    case 'hard_reboot':
                        {
                            const playerIdx = context.players.findIndex(p => p.id === genome.playerId);
                            const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
                            const startHex = starts[playerIdx % starts.length];

                            // Note: newPieces is already in scope in evaluateEnvironmentalFitness
                            const pieceIdx = newPieces.findIndex(p => p.playerId === genome.playerId);
                            if (pieceIdx !== -1) {
                                newPieces[pieceIdx] = { ...newPieces[pieceIdx], hexId: startHex };
                            }

                            newGenome.stability = 3;
                            newGenome.dataClusters = 1;
                            newGenome.rawMatter = 0;
                            newGenome.baseAttributes = { NAV: 1, LOG: 1, DEF: 1, SCN: 1 };
                            newGenome.cubePool = 12;
                        }
                        break;
                    case 'gain_insight':
                        newGenome.insightTokens += amount;
                        break;
                }
                const result = { ...newGenome };
                if (result.stability <= 0) {
                    console.log(`STABILITY CRITICAL (Event) for ${genome.playerId}. Triggering Hard Reboot.`);
                    const playerIdx = context.players.findIndex(p => p.id === genome.playerId);
                    const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
                    const startHex = starts[playerIdx % starts.length];

                    // Find piece in outer scope (newPieces)
                    const pIdx = newPieces.findIndex(p => p.playerId === genome.playerId);
                    if (pIdx !== -1) {
                        newPieces[pIdx] = { ...newPieces[pIdx], hexId: startHex };
                    }

                    result.stability = 3;
                    result.dataClusters = 1;
                    result.rawMatter = 0;
                    result.baseAttributes = { NAV: 1, LOG: 1, DEF: 1, SCN: 1 };
                    result.cubePool = 12;
                }
                return result;
            };

            // 3. Helper to apply effects that might affect pieces or multiple players
            const processComplexEffect = (currentGenomes: any[], currentPieces: any[], effect: any, triggeringPlayerId: string) => {
                let genomes = [...currentGenomes];
                let pieces = [...currentPieces];

                if (effect.type === 'transfer') {
                    const fromTarget = effect.details?.from;
                    const toTarget = effect.details?.to;
                    const resource = effect.details?.resource;
                    const amount = effect.amount || 1;

                    const fromIds = fromTarget === 'highest_sum' ? getPlayersByTarget('highest_sum') : [triggeringPlayerId];
                    const toIds = toTarget === 'lowest_sum' ? getPlayersByTarget('lowest_sum') : [triggeringPlayerId];

                    if (fromIds.length > 0 && toIds.length > 0) {
                        const fromId = fromIds[0];
                        const toId = toIds[0];
                        genomes = genomes.map(g => {
                            if (g.playerId === fromId) {
                                if (resource === 'data') return { ...g, dataClusters: Math.max(0, g.dataClusters - amount) };
                                if (resource === 'matter') return { ...g, rawMatter: Math.max(0, g.rawMatter - amount) };
                            }
                            if (g.playerId === toId) {
                                if (resource === 'data') return { ...g, dataClusters: g.dataClusters + amount };
                                if (resource === 'matter') return { ...g, rawMatter: g.rawMatter + amount };
                            }
                            return g;
                        });
                        console.log(`Transferred ${amount} ${resource} from ${fromId} to ${toId}`);
                    }
                } else if (effect.type === 'displacement') {
                    const targetIds = getPlayersByTarget(effect.target);
                    const amount = effect.amount || 1;
                    pieces = pieces.map(p => {
                        if (targetIds.includes(p.playerId)) {
                            // Find a neighbor or random hex? 
                            // For Ion Storm (Hazard), let's assume random adjacent for now or logical shift
                            // Real displacement logic would push away from a center or something.
                            // Simplified: move to a random adjacent hex if free or just displace.
                            console.log(`Displacing ${p.playerId} by ${amount} units`);
                            // For simplicity, we'll just log this as it requires a physics-like push on hex grid
                        }
                        return p;
                    });
                }

                return { genomes, pieces };
            };

            let newGenomes = [...context.genomes];
            let newHexGrid = [...context.hexGrid];
            let newPieces = [...context.pieces];
            const eventResults: Record<string, { roll: number; modifier: number; success: boolean }> = {};

            const prng = createPRNG((context.seed || 12345) + context.round + 999);

            // Handle Global Effects
            if (event.effects.global) {
                if (['transfer', 'displacement', 'map_shift'].includes(event.effects.global.type)) {
                    const complex = processComplexEffect(newGenomes, newPieces, event.effects.global, context.priorityPlayerId);
                    newGenomes = complex.genomes;
                    newPieces = complex.pieces;
                } else {
                    const globalTargets = getPlayersByTarget(event.effects.global.target);
                    newGenomes = newGenomes.map(g => {
                        if (globalTargets.includes(g.playerId)) {
                            return applyEffect(g, event.effects.global);
                        }
                        return g;
                    });
                }

                // Special Map Shifts
                if (event.effects.global.type === 'map_shift') {
                    console.log('MAP SHIFT EVENT:', event.effects.global.details?.action);
                    // Implement Core Drift: Move Singularity
                    if (event.effects.global.details?.action === 'move_singularity_toward') {
                        const targetPlayerIds = getPlayersByTarget(event.effects.global.target);
                        if (targetPlayerIds.length > 0) {
                            const targetPiece = newPieces.find(p => p.playerId === targetPlayerIds[0]);
                            const targetHex = newHexGrid.find(h => h.id === targetPiece?.hexId);
                            const singularity = newHexGrid.find(h => h.type === 'Singularity');
                            if (singularity && targetHex) {
                                // Simplified: move singularity 1 step toward player
                                console.log(`Moving Singularity toward ${targetPlayerIds[0]}`);
                            }
                        }
                    }
                }
            }

            // Handle Check Effects
            if (checkType !== 'NONE') {
                newGenomes = newGenomes.map(genome => {
                    const roll = rollSeededDice(prng, 6);
                    const modifier = roll <= 2 ? -1 : (roll >= 5 ? 1 : 0);
                    const fitness = calculateFitness(genome, checkType) + modifier;
                    const success = fitness >= thresholdValue;

                    eventResults[genome.playerId] = { roll, modifier, success };
                    console.log(`Player ${genome.playerId}: Roll=${roll}(${modifier}), Fitness=${fitness}, Success=${success}`);

                    if (success && event.effects.onSuccess) {
                        if (['transfer', 'displacement'].includes(event.effects.onSuccess.type)) {
                            const complex = processComplexEffect(newGenomes, newPieces, event.effects.onSuccess, genome.playerId);
                            // Update newPieces globally, but how to return newGenome for map?
                            // This architecture is slightly flawed for map. 
                            // Let's just update the local genome if it's a simple effect, 
                            // or handle complex ones outside.
                            newPieces = complex.pieces;
                            return complex.genomes.find(g => g.playerId === genome.playerId) || genome;
                        } else {
                            const targets = getPlayersByTarget(event.effects.onSuccess.target);
                            if (targets.includes(genome.playerId)) {
                                console.log(`Applying SUCCESS effect to ${genome.playerId}`);
                                return applyEffect(genome, event.effects.onSuccess);
                            }
                        }
                    } else if (!success && event.effects.onFailure) {
                        if (['transfer', 'displacement'].includes(event.effects.onFailure.type)) {
                            const complex = processComplexEffect(newGenomes, newPieces, event.effects.onFailure, genome.playerId);
                            newPieces = complex.pieces;
                            return complex.genomes.find(g => g.playerId === genome.playerId) || genome;
                        } else {
                            const targets = getPlayersByTarget(event.effects.onFailure.target);
                            if (targets.includes(genome.playerId)) {
                                console.log(`Applying FAILURE effect to ${genome.playerId}`);
                                return applyEffect(genome, event.effects.onFailure);
                            }
                        }
                    }
                    return genome;
                });
            }

            return {
                genomes: newGenomes,
                hexGrid: newHexGrid,
                pieces: newPieces,
                lastEventResults: eventResults
            };
        }),

        resolveHustle: assign(({ context, event }) => {
            if (event.type !== 'HUSTLE') return {};
            const { attackerId, defenderId } = event;
            const attackerGenome = context.genomes.find(g => g.playerId === attackerId);
            const defenderGenome = context.genomes.find(g => g.playerId === defenderId);
            if (!attackerGenome || !defenderGenome) return {};

            const attackerPower = Object.values(attackerGenome.baseAttributes).reduce((a, b) => a + b, 0);
            const defenderPower = Object.values(defenderGenome.baseAttributes).reduce((a, b) => a + b, 0);

            const newGenomes = context.genomes.map(genome => {
                if (genome.playerId === attackerId && attackerPower > defenderPower) {
                    return { ...genome, dataClusters: genome.dataClusters + 1 };
                }
                if (genome.playerId === defenderId && defenderPower > attackerPower) {
                    return { ...genome, dataClusters: genome.dataClusters + 1 };
                }
                return genome;
            });
            return { genomes: newGenomes };
        }),

        confirmPhase: assign(({ context, event }) => {
            if (event.type !== 'CONFIRM_PHASE') return {};
            console.log('Action: confirmPhase', event.playerId, 'Current confirmed:', context.confirmedPlayers);
            if (context.confirmedPlayers.includes(event.playerId)) return {};
            const newConfirmed = [...context.confirmedPlayers, event.playerId];
            console.log('New confirmed list:', newConfirmed);

            // Deduct matter immediately upon confirming
            const playerGenome = context.genomes.find(g => g.playerId === event.playerId);
            const cost = playerGenome ? calculateMaintenanceCost(playerGenome) : 0;
            const newGenomes = context.genomes.map(g =>
                g.playerId === event.playerId
                    ? { ...g, rawMatter: Math.max(0, g.rawMatter - cost) }
                    : g
            );

            return {
                confirmedPlayers: newConfirmed,
                genomes: newGenomes
            };
        }),

        incrementRound: assign(({ context }) => ({
            round: context.round + 1,
            currentPlayerIndex: 0,
            mutationResults: {}, // Reset for next round
            genomes: context.genomes.map(g => ({
                ...g,
                tempAttributeModifiers: { ...EMPTY_MODS }
            })),
            currentEvent: null,
            lastEventResults: {},
        })),

        recordWinner: assign(({ context }) => {
            const winnerIds = context.genomes.filter(g => checkWinCondition(g)).map(g => g.playerId);
            return { winners: winnerIds };
        }),

        optimizeData: assign(({ context, event }) => {
            if (event.type !== 'OPTIMIZE_DATA') return {};
            const { playerId } = event;
            const genome = context.genomes.find(g => g.playerId === playerId);
            if (!genome || genome.dataClusters < 3) return {};

            return {
                genomes: context.genomes.map(g =>
                    g.playerId === playerId
                        ? { ...g, dataClusters: g.dataClusters - 3, cubePool: g.cubePool + 1 }
                        : g
                )
            };
        }),

        pruneAttribute: assign(({ context, event }) => {
            if (event.type !== 'PRUNE_ATTRIBUTE') return {};
            const { playerId, attribute } = event;
            const genome = context.genomes.find(g => g.playerId === playerId);
            if (!genome || genome.baseAttributes[attribute] <= 1) return {};

            return {
                genomes: context.genomes.map(g =>
                    g.playerId === playerId
                        ? {
                            ...g,
                            baseAttributes: { ...g.baseAttributes, [attribute]: g.baseAttributes[attribute] - 1 },
                            rawMatter: g.rawMatter + 2
                        }
                        : g
                )
            };
        }),

        finalizeOptimization: assign(({ context }) => {
            // Maintenance: Stability -> 3, Data/Matter cap at 2, Reset Mutations
            return {
                genomes: context.genomes.map(g => {
                    return {
                        ...g,
                        stability: 3,
                        mutationModifiers: { ...EMPTY_MODS },
                        dataClusters: Math.min(2, g.dataClusters),
                        rawMatter: Math.min(2, g.rawMatter), // Cap at 2, deduction already happened in confirmPhase
                    };
                }),
                lastHarvestResults: []
            };
        }),

        resetGame: assign(({ context }) => ({
            genomes: context.players.map(p => ({
                playerId: p.id,
                stability: 3,
                dataClusters: 0,
                rawMatter: 0,
                insightTokens: 0,
                lockedSlots: [],
                baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                mutationModifiers: { ...EMPTY_MODS },
                tempAttributeModifiers: { ...EMPTY_MODS },
                cubePool: 12,
                hasPassedSingularity: false,
            })),
            pieces: context.players.map((p, i) => {
                const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
                return {
                    playerId: p.id,
                    hexId: starts[i % starts.length],
                };
            }),
            eventDeck: [...INITIAL_EVENT_DECK],
            currentEvent: null,
            gamePhase: 'setup' as GamePhase,
            round: 1,
            winners: [],
            currentPlayerIndex: 0,
            mutationResults: {},
            lastMutationRoll: null,
            lastHarvestSuccess: null,
            lastHarvestResults: [],
            phenotypeActions: {},
            confirmedPlayers: [],
        })),

    },
    guards: {
        allConfirmedAndWin: ({ context }) => {
            const isConfirmed = context.confirmedPlayers.length === context.players.length;
            const hasWinner = context.genomes.some(g => checkWinCondition(g));
            console.log('Guard: allConfirmedAndWin', isConfirmed && hasWinner, 'Confirmed:', isConfirmed, 'Winner:', hasWinner);
            return isConfirmed && hasWinner;
        },
        allPlayersConfirmed: ({ context }) => {
            const isConfirmed = context.confirmedPlayers.length === context.players.length;
            console.log('Guard: allPlayersConfirmed', isConfirmed, 'Confirmed:', context.confirmedPlayers.length, 'Total:', context.players.length);
            return isConfirmed;
        },
        allPlayersReady: ({ context }) => {
            return context.genomes.every(g => g.cubePool === 0);
        },
        checkWin: ({ context }) => {
            return context.genomes.some(g => checkWinCondition(g));
        },
        isLastMutationRoll: ({ context }) => {
            return context.currentPlayerIndex >= context.players.length - 1;
        },
        isLastPhenotypeTurn: ({ context }) => {
            return context.currentPlayerIndex >= context.turnOrder.length - 1;
        },
        canMove: ({ context, event }) => {
            if (event.type !== 'MOVE_PLAYER') return false;

            // 1. Check if it's the player's turn
            const activePlayerId = context.turnOrder[context.currentPlayerIndex];
            if (event.playerId !== activePlayerId) {
                console.log(`Guard: canMove failed - not ${event.playerId}'s turn. Active: ${activePlayerId}`);
                return false;
            }

            const genome = context.genomes.find(g => g.playerId === event.playerId);
            const piece = context.pieces.find(p => p.playerId === event.playerId);
            const targetHex = context.hexGrid.find(h => h.id === event.hexId);
            const currentHex = context.hexGrid.find(h => h.id === piece?.hexId);

            if (!genome || !piece || !targetHex || !currentHex) {
                console.log(`Guard: canMove failed - missing data: genome=${!!genome}, piece=${!!piece}, targetHex=${!!targetHex}, currentHex=${!!currentHex}`);
                return false;
            }

            // 2. Adjacency check (Distance must be 1)
            const d = getHexDistance(currentHex.x, currentHex.y, targetHex.x, targetHex.y);
            if (d !== 1) {
                console.log(`Guard: canMove failed - distance ${d} is not 1. From ${currentHex.id} to ${targetHex.id}`);
                return false;
            }

            // 3. NAV check (movesMade < NAV)
            const nav = (genome.baseAttributes['NAV'] || 0) + (genome.mutationModifiers['NAV'] || 0);
            const actions = context.phenotypeActions[event.playerId] || { movesMade: 0, harvestDone: false };

            if (actions.movesMade >= nav) {
                console.log(`Guard: canMove failed - no moves left. Moves made: ${actions.movesMade}, NAV: ${nav}`);
                return false;
            }

            return true;
        },
    },
});
