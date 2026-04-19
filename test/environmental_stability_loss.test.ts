import { expect, test, describe } from "bun:test";
import { createActor } from "xstate";
import { apexNebulaMachine } from "../src/apexNebulaMachine";
import { INITIAL_EVENT_DECK } from "../src/eventUtils";

describe("Environmental Stability Loss Reproduction", () => {
    test("Solar Flare stability loss", () => {
        const solarFlare = INITIAL_EVENT_DECK.find(e => e.id === 'hazard-1')!;
        
        // We use a specific seed and round that we know will fail
        // Threshold is 4. DEF is 1.
        // Interference die: 1-2: -1, 3-4: 0, 5-6: +1.
        // Max fitness is 1+1 = 2. So it ALWAYS fails if threshold is 4.
        
        const actor = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'p1',
                isInitiator: true,
                players: [{ publicKey: 'p1', name: 'P1', color: 'red' }],
                genomes: [{
                    playerPublicKey: 'p1',
                    stability: 3,
                    dataClusters: 0,
                    rawMatter: 0,
                    insightTokens: 0,
                    lockedSlots: [],
                    baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                    mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                    tempAttributeModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                    cubePool: 8,
                }],
                currentEvent: solarFlare,
                gamePhase: 'environmental' as const,
                seed: 12345,
                round: 1
            }
        });
        actor.start();

        // The machine starts in 'waitingForPlayers' by default.
        // We need to move it to 'environmentalPhase'.
        // Actually, let's just send the START_GAME event to get it into a real state.
        
        actor.send({ 
            type: 'START_GAME', 
            players: [{ publicKey: 'p1', name: 'P1', color: 'red' }],
            seed: 12345 
        });
        
        // Advance to environmental phase
        // setup -> mutation -> phenotype -> environmental
        
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [] });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' }); // setup done
        
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' }); // mutation done
        
        // Phenotype: p1 is the only player.
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p1' }); // transitions to environmental
        
        // Force the Solar Flare event to be sure
        actor.send({ type: 'FORCE_EVENT', eventId: 'hazard-1' });

        const state = actor.getSnapshot();
        const genome = state.context.genomes[0];
        const results = state.context.lastEventResults?.['p1'];
        
        console.log("Phase:", state.value);
        console.log("Event:", state.context.currentEvent?.name);
        console.log("Results:", results);
        console.log("Stability:", genome.stability);

        expect(results?.success).toBe(false);
        expect(genome.stability).toBe(2);
    });
});
