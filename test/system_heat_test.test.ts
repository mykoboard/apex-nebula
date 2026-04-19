import { expect, test, describe } from "bun:test";
import { createActor } from "xstate";
import { apexNebulaMachine } from "../src/apexNebulaMachine";
import { INITIAL_EVENT_DECK } from "../src/eventUtils";

describe("Environmental Stability Loss Reproduction - System Heat", () => {
    test("System Heat stability loss fallback", () => {
        const systemHeat = INITIAL_EVENT_DECK.find(e => e.id === 'pressure-3')!;
        
        const actor = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'p1',
                isInitiator: true,
                players: [{ publicKey: 'p1', name: 'P1', color: 'red' }],
                genomes: [{
                    playerPublicKey: 'p1',
                    stability: 3,
                    dataClusters: 0,
                    rawMatter: 0, // No matter
                    insightTokens: 0,
                    lockedSlots: [],
                    baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                    mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                    tempAttributeModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                    cubePool: 8,
                }],
                currentEvent: systemHeat,
                gamePhase: 'environmental' as const,
                seed: 12345,
                round: 1
            }
        });
        actor.start();

        actor.send({ 
            type: 'START_GAME', 
            players: [{ publicKey: 'p1', name: 'P1', color: 'red' }],
            seed: 12345 
        });
        
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [] });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p1' });
        
        actor.send({ type: 'FORCE_EVENT', eventId: 'pressure-3' });

        const state = actor.getSnapshot();
        const genome = state.context.genomes[0];
        const results = state.context.lastEventResults?.['p1'];
        
        console.log("Phase:", state.value);
        console.log("Event:", state.context.currentEvent?.name);
        console.log("Results:", results);
        console.log("Stability:", genome.stability);
        console.log("Matter:", genome.rawMatter);

        expect(results?.success).toBe(false);
        // Hit twice: 3 -> 2 -> 1
        expect(genome.stability).toBe(1);
    });
});
