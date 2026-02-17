import { createMachine, assign } from 'xstate';
import {
    GamePhase,
    ApexNebulaContext,
    ApexNebulaEvent
} from './types';
import { createHexGrid } from './components/HexGrid';
import { INITIAL_EVENT_DECK } from './components/EventDeck';
import { calculateFitness, checkWinCondition } from './utils';

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
        readyPlayers: input?.readyPlayers ?? [],
        winners: [],
        lastMutationRoll: null,
        lastHarvestRoll: null,
        lastHarvestSuccess: null,
    }),
    states: {
        waitingForPlayers: {
            entry: () => console.log('Machine State: waitingForPlayers'),
            on: {
                START_GAME: {
                    target: 'setupPhase',
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
                FINALIZE_SETUP: [
                    {
                        target: 'mutationPhase',
                        guard: 'allPlayersReady',
                        actions: 'finalizeSetup',
                    },
                    {
                        actions: 'finalizeSetup',
                    }
                ],
            },
        },
        mutationPhase: {
            entry: [
                assign({ gamePhase: 'mutation' }),
                () => console.log('Machine State: mutationPhase')
            ],
            on: {
                NEXT_PHASE: {
                    target: 'phenotypePhase',
                },
            },
        },
        phenotypePhase: {
            entry: [
                assign({ gamePhase: 'phenotype' }),
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
            },
        },
        nextRound: {
            always: {
                target: 'mutationPhase',
                actions: 'incrementRound',
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
            return event.context;
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
            const currentCubes = genome.baseAttributes[attribute];
            const newCubes = currentCubes + amount;

            // Enforce limits
            if (newCubes < 1 || newCubes > 10) return {};
            if (context.gamePhase === 'setup' && newCubes > 6) return {};

            // Check cube pool
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
        finalizeSetup: assign(({ context, event }) => {
            if (event.type !== 'FINALIZE_SETUP') return {};
            if (context.readyPlayers.includes(event.playerId)) return {};
            return {
                readyPlayers: [...context.readyPlayers, event.playerId]
            };
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
                const fitness = calculateFitness(genome, context.currentEvent);
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

            // Power comparison: Use average attribute level
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
        incrementRound: assign(({ context }) => ({
            round: context.round + 1,
            currentPlayerIndex: 0,
        })),
        recordWinner: assign(({ context }) => {
            const winnerIds = context.genomes.filter(checkWinCondition).map(g => g.playerId);
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
            readyPlayers: [],
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
            lastMutationRoll: null,
            lastHarvestRoll: null,
            lastHarvestSuccess: null,
        })),
    },
    guards: {
        allPlayersReady: ({ context }) => {
            return context.readyPlayers.length >= context.players.length;
        },
        checkWin: ({ context }) => {
            return context.genomes.some(checkWinCondition);
        },
    },
});
