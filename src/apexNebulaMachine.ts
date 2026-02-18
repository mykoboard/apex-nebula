import { createMachine, assign } from 'xstate';
import {
    GamePhase,
    ApexNebulaContext,
    ApexNebulaEvent,
    AttributeType
} from './types';
import { createHexGrid } from './components/HexGrid';
import { INITIAL_EVENT_DECK } from './components/EventDeck';
import { calculateFitness, checkWinCondition, createPRNG, rollSeededDice } from './utils';

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
        hexGrid: createHexGrid(),
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
                assign({
                    gamePhase: 'phenotype',
                    confirmedPlayers: [] // Reset barrier
                }),
                () => console.log('Machine State: phenotypePhase')
            ],
            on: {
                MOVE_PLAYER: {
                    actions: 'movePlayer',
                },
                COLONIZE_PLANET: {
                    actions: 'colonizePlanet',
                },
                NEXT_PHASE: {
                    target: 'environmentalPhase',
                },
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
            const newGenomes = [...context.genomes];
            newGenomes[genomeIndex] = {
                ...genome,
                insightTokens: genome.insightTokens - amount,
            };
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
                const newGenomes = [...context.genomes];
                newGenomes[genomeIndex] = {
                    ...genome,
                    cubePool: genome.cubePool - amount
                };
                return { genomes: newGenomes };
            }

            const currentCubes = genome.baseAttributes[attribute];
            const newCubes = currentCubes + amount;

            if (newCubes < 1 || newCubes > 10) return {};
            if (context.gamePhase === 'setup' && newCubes > 6) return {};
            if (genome.cubePool - amount < 0 && amount > 0) return {};

            const newGenomes = [...context.genomes];
            newGenomes[genomeIndex] = {
                ...genome,
                baseAttributes: {
                    ...genome.baseAttributes,
                    [attribute]: newCubes
                },
                cubePool: genome.cubePool - amount
            };
            return { genomes: newGenomes };
        }),


        movePlayer: assign(({ context, event }) => {
            if (event.type !== 'MOVE_PLAYER') return {};
            const { playerId, hexId } = event;
            const pieceIndex = context.pieces.findIndex(p => p.playerId === playerId);
            if (pieceIndex === -1) return {};
            const newPieces = [...context.pieces];
            newPieces[pieceIndex] = { ...newPieces[pieceIndex], hexId };
            return { pieces: newPieces };
        }),

        colonizePlanet: assign(({ context, event }) => {
            if (event.type !== 'COLONIZE_PLANET') return {};
            const { playerId } = event;
            const genomeIndex = context.genomes.findIndex(g => g.playerId === playerId);
            const piece = context.pieces.find(p => p.playerId === playerId);
            if (genomeIndex === -1 || !piece) return {};
            const hex = context.hexGrid.find(h => h.id === piece.hexId);
            if (!hex || hex.type === 'HomeNebula') return {};
            const genome = context.genomes[genomeIndex];
            const roll = Math.floor(Math.random() * 6) + 1;
            const interference = roll <= 2 ? -1 : (roll >= 5 ? 1 : 0);
            const attributeSum = calculateFitness(genome, hex);
            const totalScore = attributeSum + interference;
            const success = totalScore >= hex.threshold;
            const newGenomes = [...context.genomes];
            if (success) {
                newGenomes[genomeIndex] = {
                    ...genome,
                    rawMatter: genome.rawMatter + hex.yield.matter,
                    dataClusters: genome.dataClusters + hex.yield.data,
                };
            } else {
                newGenomes[genomeIndex] = {
                    ...genome,
                    insightTokens: genome.insightTokens + 1,
                };
            }
            return {
                genomes: newGenomes,
                lastHarvestRoll: roll,
                lastHarvestSuccess: success
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
            lastHarvestRoll: null,
            lastHarvestSuccess: null,
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
        }
    },
});
