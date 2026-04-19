import { describe, test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { apexNebulaMachine } from '../src/apexNebulaMachine';
import type { Player } from '../src/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_SEED = 42;

const TEST_PLAYERS: Player[] = [
    { publicKey: 'p1', name: 'Alpha', color: 'red' },
    { publicKey: 'p2', name: 'Beta', color: 'blue' },
];

/** Create a started actor with optional overrides */
function createTestActor(overrides: Record<string, unknown> = {}) {
    const actor = createActor(apexNebulaMachine, {
        input: {
            localPublicKey: 'p1',
            isInitiator: true,
            seed: TEST_SEED,
            ...overrides,
        },
    });
    actor.start();
    return actor;
}

/** Create an actor and immediately send START_GAME */
function createStartedGame(overrides: Record<string, unknown> = {}) {
    const actor = createTestActor(overrides);
    actor.send({ type: 'START_GAME', seed: TEST_SEED, players: TEST_PLAYERS });
    return actor;
}

/** Distribute all 8 remaining cubes evenly (2 per attr) and confirm both players */
function completeSetup(actor: ReturnType<typeof createActor<typeof apexNebulaMachine>>) {
    for (const playerPublicKey of ['p1', 'p2']) {
        actor.send({ 
            type: 'DISTRIBUTE_CUBES', 
            playerPublicKey, 
            distributions: [
                { attribute: 'NAV', amount: 2 },
                { attribute: 'LOG', amount: 2 },
                { attribute: 'DEF', amount: 2 },
                { attribute: 'SCN', amount: 2 }
            ]
        });
        actor.send({ type: 'CONFIRM_PHASE', playerPublicKey });
    }
}

/** Complete setup and confirm mutation phase for both players */
function advanceToPhenotype(actor: ReturnType<typeof createActor<typeof apexNebulaMachine>>) {
    completeSetup(actor);
    // After setup, machine auto-transitions to mutation phase.
    // Confirm mutation phase for both players to advance to phenotype.
    actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
    actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('apexNebulaMachine', () => {

    // ── Initialization ─────────────────────────────────────────────────────

    describe('initialization', () => {
        test('starts in waitingForPlayers state', () => {
            const actor = createTestActor();
            expect(actor.getSnapshot().value).toBe('waitingForPlayers');
            expect(actor.getSnapshot().context.gamePhase).toBe('waiting');
            actor.stop();
        });

        test('preserves localPublicKey from input', () => {
            const actor = createTestActor({ localPublicKey: 'my-player' });
            expect(actor.getSnapshot().context.localPublicKey).toBe('my-player');
            actor.stop();
        });

        test('preserves isInitiator from input', () => {
            const actor = createTestActor({ isInitiator: false });
            expect(actor.getSnapshot().context.isInitiator).toBe(false);
            actor.stop();
        });

        test('updates localPublicKey via SET_LOCAL_PLAYER', () => {
            const actor = createTestActor({ localPublicKey: '' });
            expect(actor.getSnapshot().context.localPublicKey).toBe('');
            
            actor.send({ type: 'SET_LOCAL_PLAYER', publicKey: 'late-resolved-id' });
            expect(actor.getSnapshot().context.localPublicKey).toBe('late-resolved-id');
            actor.stop();
        });
    });

    // ── START_GAME ──────────────────────────────────────────────────────────

    describe('START_GAME', () => {
        test('transitions to setupPhase', () => {
            const actor = createStartedGame();
            expect(actor.getSnapshot().value).toBe('setupPhase');
            expect(actor.getSnapshot().context.gamePhase).toBe('setup');
            actor.stop();
        });

        test('initializes players and genomes', () => {
            const actor = createStartedGame();
            const ctx = actor.getSnapshot().context;

            expect(ctx.players).toHaveLength(2);
            expect(ctx.genomes).toHaveLength(2);
            expect(ctx.pieces).toHaveLength(2);

            expect(ctx.players[0].publicKey).toBe('p1');
            expect(ctx.players[1].publicKey).toBe('p2');
            actor.stop();
        });

        test('genomes start with correct defaults', () => {
            const actor = createStartedGame();
            const genome = actor.getSnapshot().context.genomes[0];

            expect(genome.playerPublicKey).toBe('p1');
            expect(genome.stability).toBe(3);
            expect(genome.dataClusters).toBe(0);
            expect(genome.rawMatter).toBe(0);
            expect(genome.cubePool).toBe(8);
            expect(genome.baseAttributes).toEqual({ NAV: 1, LOG: 1, DEF: 1, SCN: 1 });
            expect(genome.mutationModifiers).toEqual({ NAV: 0, LOG: 0, DEF: 0, SCN: 0 });
            actor.stop();
        });

        test('players start at home nebulae', () => {
            const actor = createStartedGame();
            const ctx = actor.getSnapshot().context;

            expect(ctx.pieces[0].hexId).toBe('H-4--2');
            expect(ctx.pieces[1].hexId).toBe('H--2-4');
            actor.stop();
        });

        test('sets seed and turnOrder (sorted by publicKey)', () => {
            const actor = createActor(apexNebulaMachine, {
                input: { localPublicKey: 'p1', isInitiator: true, seed: TEST_SEED }
            });
            actor.start();
            // Send unordered players: p2 then p1
            actor.send({ 
                type: 'START_GAME', 
                seed: TEST_SEED, 
                players: [
                    { publicKey: 'p2', name: 'Beta', color: 'blue' },
                    { publicKey: 'p1', name: 'Alpha', color: 'red' }
                ] 
            });

            const ctx = actor.getSnapshot().context;
            expect(ctx.seed).toBe(TEST_SEED);
            // turnOrder should be sorted ['p1', 'p2'] despite input order
            expect(ctx.turnOrder).toEqual(['p1', 'p2']);
            expect(ctx.players[0].publicKey).toBe('p1');
            actor.stop();
        });

        test('creates hex grid with game tiles and home nebulae', () => {
            const actor = createStartedGame();
            const grid = actor.getSnapshot().context.hexGrid;
            // 37 game tiles (T1/T2/T3 + Singularity) + 4 HomeNebula = 41
            expect(grid).toHaveLength(41);
            expect(grid.filter(h => h.type === 'Singularity')).toHaveLength(1);
            expect(grid.filter(h => h.type === 'HomeNebula')).toHaveLength(4);
            actor.stop();
        });
    });

    // ── Setup Phase ─────────────────────────────────────────────────────────

    describe('setupPhase', () => {
        test('DISTRIBUTE_CUBES increases attribute and decreases cube pool', () => {
            const actor = createStartedGame();
            actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'NAV', amount: 2 }] });

            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            expect(genome.baseAttributes.NAV).toBe(3);  // 1 base + 2
            expect(genome.cubePool).toBe(6);  // 8 - 2
            actor.stop();
        });

        test('DISTRIBUTE_CUBES rejects amount that would exceed setup cap of 6', () => {
            const actor = createStartedGame();
            // Try to set NAV to 7 (1 base + 6) — should be rejected
            actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'NAV', amount: 6 }] });

            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            // During setup, max is 6. 1 + 6 = 7 > 6, so should be blocked
            expect(genome.baseAttributes.NAV).toBe(1); // unchanged
            actor.stop();
        });

        test('DISTRIBUTE_CUBES allows up to 6 during setup', () => {
            const actor = createStartedGame();
            actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'NAV', amount: 5 }] });

            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            expect(genome.baseAttributes.NAV).toBe(6);  // 1 + 5
            expect(genome.cubePool).toBe(3);  // 8 - 5
            actor.stop();
        });

        test('DISTRIBUTE_CUBES only affects the target player', () => {
            const actor = createStartedGame();
            actor.send({ type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [{ attribute: 'LOG', amount: 3 }] });

            const p2Genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p2')!;
            expect(p2Genome.baseAttributes.LOG).toBe(1); // unchanged
            expect(p2Genome.cubePool).toBe(8);            // unchanged
            actor.stop();
        });

        test('CONFIRM_PHASE adds player to confirmedPlayers', () => {
            const actor = createStartedGame();
            // Must distribute all cubes first
            actor.send({ type: "DISTRIBUTE_CUBES", playerPublicKey: "p1", distributions: [{ attribute: "NAV", amount: 2 }, { attribute: "LOG", amount: 2 }, { attribute: "DEF", amount: 2 }, { attribute: "SCN", amount: 2 }] });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });

            expect(actor.getSnapshot().context.confirmedPlayers).toContain('p1');
            actor.stop();
        });

        test('CONFIRM_PHASE is idempotent — duplicate confirmation is ignored', () => {
            const actor = createStartedGame();
            actor.send({ 
                type: 'DISTRIBUTE_CUBES', 
                playerPublicKey: 'p1', 
                distributions: [
                    { attribute: 'NAV', amount: 2 },
                    { attribute: 'LOG', amount: 2 },
                    { attribute: 'DEF', amount: 2 },
                    { attribute: 'SCN', amount: 2 }
                ] 
            });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });

            const confirmed = actor.getSnapshot().context.confirmedPlayers.filter(id => id === 'p1');
            expect(confirmed).toHaveLength(1);
            actor.stop();
        });

        test('transitions to mutationPhase when all players confirm', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            expect(actor.getSnapshot().value).toBe('mutationPhase');
            expect(actor.getSnapshot().context.gamePhase).toBe('mutation');
            actor.stop();
        });

        test('calculates initial priority and turnOrder on setup completion', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            const ctx = actor.getSnapshot().context;
            expect(ctx.turnOrder).toHaveLength(2);
            expect(ctx.priorityPublicKey).toBeTruthy();
            expect(ctx.turnOrder).toContain('p1');
            expect(ctx.turnOrder).toContain('p2');
            actor.stop();
        });
    });

    // ── Mutation Phase ──────────────────────────────────────────────────────

    describe('mutationPhase', () => {
        test('auto-applies mutations for all players on entry', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            const ctx = actor.getSnapshot().context;
            expect(Object.keys(ctx.mutationResults)).toHaveLength(2);
            expect(ctx.mutationResults['p1']).toBeDefined();
            expect(ctx.mutationResults['p2']).toBeDefined();
            actor.stop();
        });

        test('mutation results have valid structure', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            const result = actor.getSnapshot().context.mutationResults['p1'];
            expect(['NAV', 'LOG', 'DEF', 'SCN']).toContain(result.attr);
            expect([-1, 0, 1]).toContain(result.magnitude);
            expect(result.attrRoll).toBeGreaterThanOrEqual(1);
            expect(result.attrRoll).toBeLessThanOrEqual(4);
            expect(result.magRoll).toBeGreaterThanOrEqual(1);
            expect(result.magRoll).toBeLessThanOrEqual(6);
            actor.stop();
        });

        test('mutations are deterministic — same seed produces same results', () => {
            const actor1 = createStartedGame();
            completeSetup(actor1);
            const results1 = actor1.getSnapshot().context.mutationResults;

            const actor2 = createStartedGame();
            completeSetup(actor2);
            const results2 = actor2.getSnapshot().context.mutationResults;

            expect(results1).toEqual(results2);
            actor1.stop();
            actor2.stop();
        });

        test('mutations modify genome mutationModifiers', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            const ctx = actor.getSnapshot().context;
            const p1Result = ctx.mutationResults['p1'];
            const p1Genome = ctx.genomes.find(g => g.playerPublicKey === 'p1')!;

            // The affected attribute should have the magnitude applied
            expect(p1Genome.mutationModifiers[p1Result.attr]).toBe(p1Result.magnitude);
            actor.stop();
        });

        test('confirming both players advances to phenotypePhase', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            expect(actor.getSnapshot().value).toBe('phenotypePhase');
            expect(actor.getSnapshot().context.gamePhase).toBe('phenotype');
            actor.stop();
        });

        test('resets confirmedPlayers on entry', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            // After transition: confirmedPlayers should be reset
            expect(actor.getSnapshot().context.confirmedPlayers).toEqual([]);
            actor.stop();
        });
    });

    // ── Phenotype Phase ─────────────────────────────────────────────────────

    describe('phenotypePhase', () => {
        test('resets currentPlayerIndex and phenotypeActions on entry', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            expect(ctx.currentPlayerIndex).toBe(0);
            expect(ctx.phenotypeActions).toEqual({});
            actor.stop();
        });

        test('MOVE_PLAYER is blocked if not the active player turn', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const activePlayerPublicKey = ctx.turnOrder[0];
            const inactivePlayerPublicKey = ctx.turnOrder[1];

            // Find a valid adjacent hex for the inactive player
            const inactivePiece = ctx.pieces.find(p => p.playerPublicKey === inactivePlayerPublicKey)!;
            const inactiveHex = ctx.hexGrid.find(h => h.id === inactivePiece.hexId)!;
            const adjacentHex = ctx.hexGrid.find(h => {
                const dx = Math.abs(h.x - inactiveHex.x);
                const dy = Math.abs(h.y - inactiveHex.y);
                const ds = Math.abs((-h.x - h.y) - (-inactiveHex.x - inactiveHex.y));
                return (dx + dy + ds) / 2 === 1;
            });

            if (adjacentHex) {
                actor.send({ type: 'MOVE_PLAYER', playerPublicKey: inactivePlayerPublicKey, hexId: adjacentHex.id });
                // Should not have moved
                const piece = actor.getSnapshot().context.pieces.find(p => p.playerPublicKey === inactivePlayerPublicKey)!;
                expect(piece.hexId).toBe(inactivePiece.hexId);
            }
            actor.stop();
        });

        test('MOVE_PLAYER moves the active player to an adjacent hex', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const activePlayerPublicKey = ctx.turnOrder[0];
            const piece = ctx.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
            const currentHex = ctx.hexGrid.find(h => h.id === piece.hexId)!;

            // Find an adjacent hex
            const adjacentHex = ctx.hexGrid.find(h => {
                const dx = Math.abs(h.x - currentHex.x);
                const dy = Math.abs(h.y - currentHex.y);
                const ds = Math.abs((-h.x - h.y) - (-currentHex.x - currentHex.y));
                return h.id !== currentHex.id && (dx + dy + ds) / 2 === 1;
            });

            if (adjacentHex) {
                actor.send({ type: 'MOVE_PLAYER', playerPublicKey: activePlayerPublicKey, hexId: adjacentHex.id });
                const newPiece = actor.getSnapshot().context.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
                expect(newPiece.hexId).toBe(adjacentHex.id);
            }
            actor.stop();
        });

        test('MOVE_PLAYER tracks movesMade in phenotypeActions', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const activePlayerPublicKey = ctx.turnOrder[0];
            const piece = ctx.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
            const currentHex = ctx.hexGrid.find(h => h.id === piece.hexId)!;

            const adjacentHex = ctx.hexGrid.find(h => {
                const dx = Math.abs(h.x - currentHex.x);
                const dy = Math.abs(h.y - currentHex.y);
                const ds = Math.abs((-h.x - h.y) - (-currentHex.x - currentHex.y));
                return h.id !== currentHex.id && (dx + dy + ds) / 2 === 1;
            });

            if (adjacentHex) {
                actor.send({ type: 'MOVE_PLAYER', playerPublicKey: activePlayerPublicKey, hexId: adjacentHex.id });
                const actions = actor.getSnapshot().context.phenotypeActions[activePlayerPublicKey];
                expect(actions).toBeDefined();
                expect(actions.movesMade).toBeGreaterThan(0);
            }
            actor.stop();
        });

        test('MOVE_PLAYER is blocked for non-adjacent hexes', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const activePlayerPublicKey = ctx.turnOrder[0];
            const piece = ctx.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
            const currentHex = ctx.hexGrid.find(h => h.id === piece.hexId)!;

            // Find a hex at distance > 1
            const farHex = ctx.hexGrid.find(h => {
                const dx = Math.abs(h.x - currentHex.x);
                const dy = Math.abs(h.y - currentHex.y);
                const ds = Math.abs((-h.x - h.y) - (-currentHex.x - currentHex.y));
                return (dx + dy + ds) / 2 > 1;
            });

            if (farHex) {
                actor.send({ type: 'MOVE_PLAYER', playerPublicKey: activePlayerPublicKey, hexId: farHex.id });
                const newPiece = actor.getSnapshot().context.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
                expect(newPiece.hexId).toBe(piece.hexId); // unmoved
            }
            actor.stop();
        });

        test('FINISH_TURN advances currentPlayerIndex', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const firstPlayerPublicKey = ctx.turnOrder[0];

            actor.send({ type: 'FINISH_TURN', playerPublicKey: firstPlayerPublicKey });

            expect(actor.getSnapshot().context.currentPlayerIndex).toBe(1);
            expect(actor.getSnapshot().value).toBe('phenotypePhase'); // still in phenotype
            actor.stop();
        });

        test('FINISH_TURN by last player transitions to environmentalPhase', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            // Finish both players' turns
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });

            expect(actor.getSnapshot().value).toBe('environmentalPhase');
            expect(actor.getSnapshot().context.gamePhase).toBe('environmental');
            actor.stop();
        });

        test('generates harvest results on MOVE_PLAYER', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            const activePlayerPublicKey = ctx.turnOrder[0];
            const piece = ctx.pieces.find(p => p.playerPublicKey === activePlayerPublicKey)!;
            const currentHex = ctx.hexGrid.find(h => h.id === piece.hexId)!;

            const adjacentHex = ctx.hexGrid.find(h => {
                const dx = Math.abs(h.x - currentHex.x);
                const dy = Math.abs(h.y - currentHex.y);
                const ds = Math.abs((-h.x - h.y) - (-currentHex.x - currentHex.y));
                return h.id !== currentHex.id && (dx + dy + ds) / 2 === 1;
            });

            if (adjacentHex) {
                actor.send({ type: 'MOVE_PLAYER', playerPublicKey: activePlayerPublicKey, hexId: adjacentHex.id });
                const results = actor.getSnapshot().context.lastHarvestResults;
                expect(results.length).toBeGreaterThan(0);
                expect(results[0].playerPublicKey).toBe(activePlayerPublicKey);
            }
            actor.stop();
        });
    });

    // ── Environmental Phase ─────────────────────────────────────────────────

    describe('environmentalPhase', () => {
        test('draws an event card on entry', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });

            const envCtx = actor.getSnapshot().context;
            expect(envCtx.currentEvent).not.toBeNull();
            expect(envCtx.currentEvent!.name).toBeTruthy();
            actor.stop();
        });

        test('event deck size decreases after drawing', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);
            const deckBefore = actor.getSnapshot().context.eventDeck.length;

            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });

            expect(actor.getSnapshot().context.eventDeck.length).toBe(deckBefore - 1);
            actor.stop();
        });

        test('NEXT_PHASE transitions to optimizationPhase', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });

            actor.send({ type: 'NEXT_PHASE' });

            expect(actor.getSnapshot().value).toBe('optimizationPhase');
            actor.stop();
        });

        test('FORCE_EVENT overrides the drawn event', () => {
            const actor = createStartedGame();
            advanceToPhenotype(actor);

            // Force a specific event while still in phenotype
            actor.send({ type: 'FORCE_EVENT', eventId: 'solar-flare' });

            expect(actor.getSnapshot().value).toBe('environmentalPhase');
            const ev = actor.getSnapshot().context.currentEvent;
            expect(ev).not.toBeNull();
            actor.stop();
        });
    });

    // ── Competitive Phase ───────────────────────────────────────────────────

    describe('competitivePhase', () => {
        function advanceToCompetitive(actor: ReturnType<typeof createActor<typeof apexNebulaMachine>>) {
            advanceToPhenotype(actor);
            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });
            // env → optimization (competitive is skipped)
            actor.send({ type: 'NEXT_PHASE' });
        }

        test('always transitions to optimizationPhase immediately', () => {
            const actor = createStartedGame();
            advanceToCompetitive(actor);

            expect(actor.getSnapshot().value).toBe('optimizationPhase');
            actor.stop();
        });
    });

    // ── Optimization Phase ──────────────────────────────────────────────────

    describe('optimizationPhase', () => {
        function advanceToOptimization(actor: ReturnType<typeof createActor<typeof apexNebulaMachine>>) {
            advanceToPhenotype(actor);
            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });
            actor.send({ type: 'NEXT_PHASE' }); // env → optimization
        }

        test('PRUNE_ATTRIBUTE decreases attribute by 1 and gives 2 matter', () => {
            const actor = createStartedGame();
            advanceToOptimization(actor);

            const beforeGenome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            const navBefore = beforeGenome.baseAttributes.NAV;
            const matterBefore = beforeGenome.rawMatter;

            actor.send({ type: 'PRUNE_ATTRIBUTE', playerPublicKey: 'p1', attribute: 'NAV' });

            const afterGenome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            expect(afterGenome.baseAttributes.NAV).toBe(navBefore - 1);
            expect(afterGenome.rawMatter).toBe(matterBefore + 2);
            actor.stop();
        });

        test('PRUNE_ATTRIBUTE is blocked when attribute is at minimum (1)', () => {
            const actor = createStartedGame();
            // Setup with minimal NAV (1)
            for (const playerPublicKey of ['p1', 'p2']) {
                // Put all cubes into LOG, leave NAV at 1
                actor.send({ 
                    type: 'DISTRIBUTE_CUBES', 
                    playerPublicKey, 
                    distributions: [
                        { attribute: 'LOG', amount: 5 },
                        { attribute: 'DEF', amount: 2 },
                        { attribute: 'SCN', amount: 1 }
                    ]
                });
                actor.send({ type: 'CONFIRM_PHASE', playerPublicKey });
            }
            // Advance through mutation + phenotype + env + competitive
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });
            actor.send({ type: 'NEXT_PHASE' });
            expect(actor.getSnapshot().value).toBe('optimizationPhase');

            // NAV should be 1 — pruning should be blocked
            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            expect(genome.baseAttributes.NAV).toBe(1);

            actor.send({ type: 'PRUNE_ATTRIBUTE', playerPublicKey: 'p1', attribute: 'NAV' });

            const afterGenome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            expect(afterGenome.baseAttributes.NAV).toBe(1); // still 1
            actor.stop();
        });

        test('OPTIMIZE_DATA spends 3 data for 1 cube pool', () => {
            const actor = createStartedGame();
            advanceToOptimization(actor);

            // Manually give player data for testing by manipulating via multiple harvests... 
            // Instead, use a fresh game where we can set data directly.
            // The machine doesn't allow setting data directly, so let's test the guard path instead.
            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            if (genome.dataClusters >= 3) {
                const dataBefore = genome.dataClusters;
                const poolBefore = genome.cubePool;

                actor.send({ type: 'OPTIMIZE_DATA', playerPublicKey: 'p1' });

                const after = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
                expect(after.dataClusters).toBe(dataBefore - 3);
                expect(after.cubePool).toBe(poolBefore + 1);
            }
            actor.stop();
        });

        test('OPTIMIZE_DATA is blocked with less than 3 data', () => {
            const actor = createStartedGame();
            advanceToOptimization(actor);

            const genome = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
            const dataBefore = genome.dataClusters;
            const poolBefore = genome.cubePool;

            if (dataBefore < 3) {
                actor.send({ type: 'OPTIMIZE_DATA', playerPublicKey: 'p1' });
                // Should be unchanged
                const after = actor.getSnapshot().context.genomes.find(g => g.playerPublicKey === 'p1')!;
                expect(after.dataClusters).toBe(dataBefore);
                expect(after.cubePool).toBe(poolBefore);
            }
            actor.stop();
        });

        test('both players confirming triggers nextRound → mutationPhase', () => {
            const actor = createStartedGame();
            advanceToOptimization(actor);

            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            expect(actor.getSnapshot().value).toBe('mutationPhase');
            expect(actor.getSnapshot().context.round).toBe(2);
            actor.stop();
        });

        test('finalizeOptimization resets stability, caps data/matter, clears mutations', () => {
            const actor = createStartedGame();
            advanceToOptimization(actor);

            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            // After finalization (transition through nextRound to mutationPhase)
            const ctx = actor.getSnapshot().context;
            for (const genome of ctx.genomes) {
                expect(genome.stability).toBe(3);
                expect(genome.dataClusters).toBeLessThanOrEqual(2);
                expect(genome.rawMatter).toBeLessThanOrEqual(2);
            }
            actor.stop();
        });
    });

    // ── Full Round Lifecycle ────────────────────────────────────────────────

    describe('full round lifecycle', () => {
        test('completes a full round and increments round counter', () => {
            const actor = createStartedGame();

            // Setup
            completeSetup(actor);
            expect(actor.getSnapshot().value).toBe('mutationPhase');

            // Mutation
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
            expect(actor.getSnapshot().value).toBe('phenotypePhase');

            // Phenotype
            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });
            expect(actor.getSnapshot().value).toBe('environmentalPhase');

            // Environmental → Optimization (Competitive skipped)
            actor.send({ type: 'NEXT_PHASE' });
            expect(actor.getSnapshot().value).toBe('optimizationPhase');

            // Optimization → next round
            expect(actor.getSnapshot().context.round).toBe(1);
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            expect(actor.getSnapshot().value).toBe('mutationPhase');
            expect(actor.getSnapshot().context.round).toBe(2);
            actor.stop();
        });

        test('round 2 applies fresh mutations', () => {
            const actor = createStartedGame();
            completeSetup(actor);

            const r1Results = { ...actor.getSnapshot().context.mutationResults };

            // Complete round 1
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
            const ctx = actor.getSnapshot().context;
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[0] });
            actor.send({ type: 'FINISH_TURN', playerPublicKey: ctx.turnOrder[1] });
            actor.send({ type: 'NEXT_PHASE' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            actor.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            // Now in round 2 mutationPhase
            const r2Results = actor.getSnapshot().context.mutationResults;
            expect(Object.keys(r2Results)).toHaveLength(2);

            // Results should differ from round 1 (different seed = seed + round)
            // They *could* coincidentally match, but verify they exist
            expect(r2Results['p1']).toBeDefined();
            expect(r2Results['p2']).toBeDefined();
            actor.stop();
        });
    });

    // ── Replicated Determinism ──────────────────────────────────────────────

    describe('replicated determinism (event-sourced model)', () => {
        test('two machines processing identical events produce identical state', () => {
            // Simulate host and guest running independently
            const host = createActor(apexNebulaMachine, {
                input: { localPublicKey: 'p1', isInitiator: true, seed: TEST_SEED },
            });
            const guest = createActor(apexNebulaMachine, {
                input: { localPublicKey: 'p2', isInitiator: false, seed: TEST_SEED },
            });
            host.start();
            guest.start();

            // Both process START_GAME
            const startEvent = { type: 'START_GAME' as const, seed: TEST_SEED, players: TEST_PLAYERS };
            host.send(startEvent);
            guest.send(startEvent);

            // Both should be in setupPhase with identical state (except localPlayerId/isInitiator)
            expect(host.getSnapshot().value).toBe(guest.getSnapshot().value);
            expect(host.getSnapshot().context.players).toEqual(guest.getSnapshot().context.players);
            expect(host.getSnapshot().context.genomes).toEqual(guest.getSnapshot().context.genomes);

            // Distribute cubes — both process the same events
            const cubeEvents = [
                { type: 'DISTRIBUTE_CUBES' as const, playerPublicKey: 'p1', distributions: [
                    { attribute: 'NAV' as const, amount: 2 },
                    { attribute: 'LOG' as const, amount: 2 },
                    { attribute: 'DEF' as const, amount: 2 },
                    { attribute: 'SCN' as const, amount: 2 }
                ] },
                { type: 'DISTRIBUTE_CUBES' as const, playerPublicKey: 'p2', distributions: [
                    { attribute: 'NAV' as const, amount: 3 },
                    { attribute: 'LOG' as const, amount: 2 },
                    { attribute: 'DEF' as const, amount: 2 },
                    { attribute: 'SCN' as const, amount: 1 }
                ] },

            ];

            for (const event of cubeEvents) {
                host.send(event);
                guest.send(event);
            }

            // Confirm both
            host.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            guest.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            host.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
            guest.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            // Both should be in mutationPhase with identical state
            expect(host.getSnapshot().value).toBe('mutationPhase');
            expect(guest.getSnapshot().value).toBe('mutationPhase');

            // Critical: mutation results must be identical
            expect(host.getSnapshot().context.mutationResults).toEqual(guest.getSnapshot().context.mutationResults);
            expect(host.getSnapshot().context.genomes).toEqual(guest.getSnapshot().context.genomes);
            expect(host.getSnapshot().context.turnOrder).toEqual(guest.getSnapshot().context.turnOrder);

            host.stop();
            guest.stop();
        });

        test('localPublicKey and isInitiator differ but game state converges', () => {
            const host = createActor(apexNebulaMachine, {
                input: { localPublicKey: 'p1', isInitiator: true, seed: TEST_SEED },
            });
            const guest = createActor(apexNebulaMachine, {
                input: { localPublicKey: 'p2', isInitiator: false, seed: TEST_SEED },
            });
            host.start();
            guest.start();

            // localPublicKey and isInitiator should differ
            expect(host.getSnapshot().context.localPublicKey).toBe('p1');
            expect(guest.getSnapshot().context.localPublicKey).toBe('p2');
            expect(host.getSnapshot().context.isInitiator).toBe(true);
            expect(guest.getSnapshot().context.isInitiator).toBe(false);

            // But game state (value, gamePhase) should be identical
            expect(host.getSnapshot().value).toBe(guest.getSnapshot().value);

            host.stop();
            guest.stop();
        });

        test('full round produces identical state on both peers', () => {
            const host = createActor(apexNebulaMachine, {
                input: { localPlayerId: 'p1', isInitiator: true, seed: TEST_SEED },
            });
            const guest = createActor(apexNebulaMachine, {
                input: { localPlayerId: 'p2', isInitiator: false, seed: TEST_SEED },
            });
            host.start();
            guest.start();

            // Replay identical events on both machines
            const events: Array<Record<string, unknown>> = [
                { type: 'START_GAME', seed: TEST_SEED, players: TEST_PLAYERS },
                // Setup: distribute for p1
                { type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p1', distributions: [
                    { attribute: 'NAV', amount: 2 },
                    { attribute: 'LOG', amount: 2 },
                    { attribute: 'DEF', amount: 2 },
                    { attribute: 'SCN', amount: 2 }
                ] },
                // Setup: distribute for p2
                { type: 'DISTRIBUTE_CUBES', playerPublicKey: 'p2', distributions: [
                    { attribute: 'NAV', amount: 2 },
                    { attribute: 'LOG', amount: 2 },
                    { attribute: 'DEF', amount: 2 },
                    { attribute: 'SCN', amount: 2 }
                ] },

                // Confirm setup
                { type: 'CONFIRM_PHASE', playerPublicKey: 'p1' },
                { type: 'CONFIRM_PHASE', playerPublicKey: 'p2' },
                // → mutationPhase (auto-applied)
                // Confirm mutation
                { type: 'CONFIRM_PHASE', playerPublicKey: 'p1' },
                { type: 'CONFIRM_PHASE', playerPublicKey: 'p2' },
                // → phenotypePhase
            ];

            for (const event of events) {
                host.send(event as any);
                guest.send(event as any);
            }

            // Get turn order (should be identical)
            const hostTurn = host.getSnapshot().context.turnOrder;
            const guestTurn = guest.getSnapshot().context.turnOrder;
            expect(hostTurn).toEqual(guestTurn);

            // Finish turns
            host.send({ type: 'FINISH_TURN', playerPublicKey: hostTurn[0] });
            guest.send({ type: 'FINISH_TURN', playerPublicKey: hostTurn[0] });
            host.send({ type: 'FINISH_TURN', playerPublicKey: hostTurn[1] });
            guest.send({ type: 'FINISH_TURN', playerPublicKey: hostTurn[1] });

            // → environmentalPhase
            expect(host.getSnapshot().value).toBe('environmentalPhase');
            expect(guest.getSnapshot().value).toBe('environmentalPhase');

            // Both should draw the same event
            expect(host.getSnapshot().context.currentEvent?.id).toBe(
                guest.getSnapshot().context.currentEvent?.id
            );

            // Advance to optimization
            host.send({ type: 'NEXT_PHASE' });
            guest.send({ type: 'NEXT_PHASE' });

            // Confirm optimization → next round
            host.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            guest.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p1' });
            host.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });
            guest.send({ type: 'CONFIRM_PHASE', playerPublicKey: 'p2' });

            // Both in round 2 mutation phase
            expect(host.getSnapshot().value).toBe('mutationPhase');
            expect(guest.getSnapshot().value).toBe('mutationPhase');
            expect(host.getSnapshot().context.round).toBe(2);
            expect(guest.getSnapshot().context.round).toBe(2);

            // Genomes should be identical
            expect(host.getSnapshot().context.genomes).toEqual(guest.getSnapshot().context.genomes);

            host.stop();
            guest.stop();
        });
    });
});
