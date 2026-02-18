import { createMachine, assign } from 'xstate';
import {
    GamePhase,
    ApexNebulaContext,
    ApexNebulaEvent,
    AttributeType
} from './types';
import { createHexGrid } from './components/HexGrid';
import { INITIAL_EVENT_DECK } from './components/EventDeck';
import { calculateFitness, checkWinCondition, createPRNG, rollSeededDice, getHexDistance } from './utils';

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
                    currentPlayerIndex: 0
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
            },
            always: {
                target: 'phenotypePhase',
                guard: 'allPlayersConfirmed',
            },
        },
        phenotypePhase: {
            entry: [
                assign({ gamePhase: 'phenotype', confirmedPlayers: [], currentPlayerIndex: 0 }),
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
            entry: assign({ gamePhase: 'optimization' }),
            on: {
                NEXT_PHASE: [
                    { target: 'won', guard: 'checkWin' },
                    { target: 'nextRound' },
                ],
                // Add spending data cluster here if needed, for now we just track it in types
            },
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
            const results: { success: boolean; attribute: string; roll: number; magnitude: number }[] = [];

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

                results.push({ success, attribute: attr, roll, magnitude });

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

            const newGenomes = context.genomes.map((g, idx) => {
                if (idx !== genomeIndex) return g;
                return {
                    ...g,
                    rawMatter: g.rawMatter + (isDoubleAward ? (successMatter ? targetHex.yield.matter : 0) : (!anyFailure ? targetHex.yield.matter : 0)),
                    dataClusters: g.dataClusters + (isDoubleAward ? (successData ? targetHex.yield.data : 0) : (!anyFailure ? targetHex.yield.data : 0)),
                    stability: Math.max(0, g.stability - stabilityLoss)
                };
            });

            // 3. Update phenotype actions tracking
            const currentActions = context.phenotypeActions[playerId] || { movesMade: 0, harvestDone: false };

            return {
                pieces: newPieces,
                genomes: newGenomes,
                lastHarvestResults: results,
                phenotypeActions: {
                    ...context.phenotypeActions,
                    [playerId]: { ...currentActions, movesMade: currentActions.movesMade + 1 }
                }
            };
        }),

        drawEnvironmentalEvent: assign(({ context }) => {
            const event = context.eventDeck[0];
            const newDeck = context.eventDeck.slice(1);
            return {
                currentEvent: event || null,
                eventDeck: newDeck.length > 0 ? newDeck : [...INITIAL_EVENT_DECK],
            };
        }),

        evaluateEnvironmentalFitness: assign(({ context }) => {
            if (!context.currentEvent) return {};
            const newGenomes = context.genomes.map(genome => {
                const fitness = calculateFitness(genome, context.currentEvent!);
                if (fitness < context.currentEvent!.threshold) {
                    const penalty = typeof context.currentEvent!.penalty === 'number'
                        ? context.currentEvent!.penalty
                        : context.currentEvent!.penalty.amount;
                    return {
                        ...genome,
                        stability: Math.max(0, genome.stability - penalty),
                        insightTokens: genome.insightTokens + 1,
                    };
                }
                return genome;
            });
            return { genomes: newGenomes };
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
            return {
                confirmedPlayers: newConfirmed
            };
        }),

        incrementRound: assign(({ context }) => ({
            round: context.round + 1,
            currentPlayerIndex: 0,
            mutationResults: {}, // Reset for next round
        })),

        recordWinner: assign(({ context }) => {
            const winnerIds = context.genomes.filter(g => checkWinCondition(g)).map(g => g.playerId);
            return { winners: winnerIds };
        }),

        resetGame: assign(({ context }) => ({
            genomes: context.players.map(p => ({
                playerId: p.id,
                stability: 5,
                dataClusters: 0,
                rawMatter: 4,
                insightTokens: 0,
                lockedSlots: [],
                baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                cubePool: 12,
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
