import { describe, it, expect } from 'bun:test';
import { createActor } from 'xstate';
import { apexNebulaMachine } from '../src/apexNebulaMachine';

describe('Apex Nebula Deterministic Mutations', () => {
    const playerA = { publicKey: 'pub-A', name: 'Player A', color: 'red' as const };
    const playerB = { publicKey: 'pub-B', name: 'Player B', color: 'blue' as const };
    const seed = 12345;

    it('should produce identical mutation results regardless of initial player order', () => {
        // Machine 1: Started with [A, B]
        const actor1 = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'pub-A',
                players: [playerA, playerB],
                isInitiator: true,
                seed
            }
        });
        actor1.start();
        actor1.send({ type: 'START_GAME', seed, players: [playerA, playerB] });

        // Machine 2: Started with [B, A] (simulating Guest's local-first view)
        const actor2 = createActor(apexNebulaMachine, {
            input: {
                localPublicKey: 'pub-B',
                players: [playerB, playerA],
                isInitiator: false,
                seed
            }
        });
        actor2.start();
        // Even if Guest receives the same START_GAME payload
        actor2.send({ type: 'START_GAME', seed, players: [playerA, playerB] });

        // Both machines should now be in mutationPhase (after confirming setup)
        // Wait, we need to confirm setup first to reach mutationPhase
        actor1.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'pub-A' });
        actor1.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'pub-B' });
        
        actor2.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'pub-A' });
        actor2.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'pub-B' });

        const state1 = actor1.getSnapshot();
        const state2 = actor2.getSnapshot();

        expect(state1.matches('mutationPhase')).toBe(true);
        expect(state2.matches('mutationPhase')).toBe(true);

        const results1 = state1.context.mutationResults;
        const results2 = state2.context.mutationResults;

        // Verify results for Player A are identical
        expect(results1['pub-A']).toEqual(results2['pub-A']);
        // Verify results for Player B are identical
        expect(results1['pub-B']).toEqual(results2['pub-B']);
        
        // Ensure they didn't just get the same roll by accident (they should be different)
        expect(results1['pub-A']).not.toEqual(results1['pub-B']);
    });
});
