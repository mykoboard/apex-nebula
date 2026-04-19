import { describe, test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { apexNebulaMachine } from '../src/apexNebulaMachine';

describe('Competitive Phase Auto-Skip (TDD)', () => {
    test('should transition from environmentalPhase directly to optimizationPhase when all players confirm', () => {
        const actor = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'p1',
                isInitiator: true,
                seed: 12345,
                players: [
                    { publicKey: 'p1', name: 'Player 1' },
                    { publicKey: 'p2', name: 'Player 2' }
                ]
            }
        });
        actor.start();

        // 1. Advance to environmentalPhase
        actor.send({ type: 'START_GAME', seed: 12345, players: [
            { publicKey: 'p1', name: 'Player 1' },
            { publicKey: 'p2', name: 'Player 2' }
        ] });
        
        // Complete Setup
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'NAV', amount: 8 }] });
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p2', distributions: [{ attribute: 'NAV', amount: 8 }] });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
        
        // Complete Mutation
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
        
        // Complete Phenotype (Finish all turns)
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p1' });
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p2' });

        // Assert we are now in environmentalPhase
        expect(actor.getSnapshot().value).toBe('environmentalPhase');
        
        // 2. Player 1 confirms
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        expect(actor.getSnapshot().value).toBe('environmentalPhase');

        // 3. Player 2 confirms
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

        // TDD EXPECTATION: Should transition to optimizationPhase, skipping competitivePhase
        expect(actor.getSnapshot().value).toBe('optimizationPhase');
        
        actor.stop();
    });

    test('should also transition to optimizationPhase via NEXT_PHASE if sent during environmentalPhase', () => {
        const actor = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'p1',
                isInitiator: true,
                seed: 12345,
                players: [
                    { publicKey: 'p1', name: 'Player 1' },
                    { publicKey: 'p2', name: 'Player 2' }
                ]
            }
        });
        actor.start();

        // Advance to environmentalPhase
        actor.send({ type: 'START_GAME', seed: 12345, players: [
            { publicKey: 'p1', name: 'Player 1' },
            { publicKey: 'p2', name: 'Player 2' }
        ] });
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'NAV', amount: 8 }] });
        actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p2', distributions: [{ attribute: 'NAV', amount: 8 }] });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p1' });
        actor.send({ type: 'FINISH_TURN', playerPublicKey: 'p2' });

        expect(actor.getSnapshot().value).toBe('environmentalPhase');

        // Send NEXT_PHASE
        actor.send({ type: 'NEXT_PHASE' });

        // TDD EXPECTATION: Should transition to optimizationPhase
        expect(actor.getSnapshot().value).toBe('optimizationPhase');

        actor.stop();
    });
});
