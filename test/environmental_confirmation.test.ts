import { describe, test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { apexNebulaMachine } from '../src/apexNebulaMachine';

/**
 * TDD Test for Environmental Phase Confirmation.
 * 
 * BUG: The environmental phase currently transitions on a single NEXT_PHASE event
 * (usually from the host). It should instead require all players to CONFIRM_PHASE
 * before moving to the next phase, ensuring everyone has seen the event result.
 */
describe('Environmental Phase Confirmation (TDD)', () => {
    test('requires all players to confirm before transitioning from environmentalPhase', () => {
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
        
        // BUG VERIFICATION: confirmedPlayers should be reset on entry
        expect(actor.getSnapshot().context.confirmedPlayers).toEqual([]);

        // 2. Player 1 confirms
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
        
        // TDD EXPECTATION: Should still be in environmentalPhase
        expect(actor.getSnapshot().context.confirmedPlayers).toContain('p1');
        expect(actor.getSnapshot().value).toBe('environmentalPhase');

        // 3. Player 2 confirms
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

        // TDD EXPECTATION: Should transition to competitivePhase
        expect(actor.getSnapshot().value).toBe('competitivePhase');
        
        actor.stop();
    });
});
