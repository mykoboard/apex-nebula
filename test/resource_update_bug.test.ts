import { describe, it, expect } from 'bun:test';
import { ref, computed, watch, nextTick } from 'vue';

/**
 * Reproduction test for the resource update bug.
 * 
 * BUG: Resources in the genome console (PlayerConsole) are not updated 
 * when a player moves and harvests because pendingGenome (a static snapshot)
 * overshadows the reactive localGenome machine state.
 */
describe('Resource Update Bug Reproduction', () => {
    it('effective genome fails to reflect machine updates during phenotype phase due to pendingGenome snapshot', async () => {
        // Initial machine state simulation
        const gamePhase = ref('setup');
        const machineGenome = ref({
            playerPublicKey: 'player1',
            rawMatter: 0,
            dataClusters: 0,
            baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 }
        });

        // Computed localGenome (equivalent to snapshot.context.genomes.find(...))
        const localGenome = computed(() => machineGenome.value);

        // The "sandbox" state for distributions
        const pendingGenome = ref<any>(null);

        // Watcher logic extracted from ApexNebula.vue (lines 349-364)
        watch(
            () => [gamePhase.value, localGenome.value] as const,
            ([phase, genome], [prevPhase] = []) => {
                // Sync on first load
                if (!pendingGenome.value && genome) {
                    pendingGenome.value = JSON.parse(JSON.stringify(genome));
                }
                // Sync on phase transition
                // [FIX APPLIED HERE]
                if (phase !== prevPhase) {
                    if (phase === 'setup' || phase === 'optimization') {
                        pendingGenome.value = JSON.parse(JSON.stringify(genome));
                    } else {
                        pendingGenome.value = null;
                    }
                }
            },
            { immediate: true, deep: true }
        );

        // The state passed to PlayerConsole (ApexNebula.vue:467)
        const effectiveGenome = computed(() => pendingGenome.value || localGenome.value);

        // Step 1: Initialize in setup phase
        await nextTick();
        expect(gamePhase.value).toBe('setup');
        expect(effectiveGenome.value.rawMatter).toBe(0);

        // Step 2: Transition to phenotype phase
        const prevPhaseVal = gamePhase.value;
        gamePhase.value = 'phenotype';
        await nextTick();
        
        // pendingGenome is reset at the start of phenotype phase
        expect(effectiveGenome.value.rawMatter).toBe(0);

        // Step 3: Simulate a successful harvest (Machine state updates)
        // In the real app, this happens inside the XState machine
        machineGenome.value = {
            ...machineGenome.value,
            rawMatter: 5,
            dataClusters: 2
        };
        await nextTick();

        // EXPECTATION: The UI should show 5 matter.
        // ACTUAL BUG: effectiveGenome still shows 0 because pendingGenome is a stale snapshot
        // created at the start of the 'phenotype' phase.
        
        const currentEffectiveMatter = effectiveGenome.value.rawMatter;
        const currentMachineMatter = localGenome.value.rawMatter;

        console.log(`[TEST] Machine State Matter: ${currentMachineMatter}`);
        console.log(`[TEST] UI Effective Matter: ${currentEffectiveMatter}`);

        // This expectation will FAIL if the bug is present
        expect(currentEffectiveMatter).toBe(currentMachineMatter);
    });
});
