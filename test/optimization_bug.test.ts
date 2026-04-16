import { describe, it, expect } from 'bun:test';
import { ref, computed, watch, nextTick } from 'vue';

/**
 * Reproduction test for the optimization phase bug.
 * 
 * BUG: In the optimization phase, "pendingGenome" is a static snapshot 
 * created at the start of the phase. When an authoritative action 
 * like OPTIMIZE_DATA updates the machine state, the UI remains 
 * stuck on the stale snapshot values.
 */
describe('Optimization Phase Bug Reproduction', () => {
    it('Gain Attribute Cube button fails to reflect state changes because pendingGenome is a stale snapshot', async () => {
        // Initial machine state simulation
        const gamePhase = ref('optimization');
        const machineGenome = ref({
            playerPublicKey: 'player1',
            rawMatter: 2,
            dataClusters: 6, // Enough for 2 optimization cycles
            cubePool: 0,
            baseAttributes: { NAV: 5, LOG: 5, DEF: 5, SCN: 5 }
        });

        // Computed localGenome (equivalent to snapshot.context.genomes.find(...))
        const localGenome = computed(() => machineGenome.value);

        // The "sandbox" state for distributions
        const pendingGenome = ref<any>(null);

        // Watcher logic extracted from ApexNebula.vue (as updated by previous fix)
        watch(
            () => [gamePhase.value, localGenome.value] as const,
            ([phase, genome], [prevPhase] = []) => {
                // Initial sync
                if (!pendingGenome.value && genome) {
                    pendingGenome.value = JSON.parse(JSON.stringify(genome));
                }
                // Phase change sync
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

        // The state passed to CommandProtocol and PlayerConsole
        const effectiveGenome = computed(() => {
            if (!localGenome.value) return null;
            if (!pendingGenome.value || (gamePhase.value !== 'setup' && gamePhase.value !== 'optimization')) {
                return localGenome.value;
            }
            
            const machineAttrs = localGenome.value.baseAttributes;
            const pendingAttrs = pendingGenome.value.baseAttributes;
            const mergedAttrs = { ...machineAttrs };
            let cubesPended = 0;
            
            for (const attr in machineAttrs) {
                const delta = (pendingAttrs[attr] || 0) - (machineAttrs[attr] || 0);
                mergedAttrs[attr as keyof typeof mergedAttrs] = machineAttrs[attr] + delta;
                cubesPended += delta;
            }
            
            return {
                ...localGenome.value,
                baseAttributes: mergedAttrs,
                cubePool: localGenome.value.cubePool - cubesPended
            };
        });

        // Step 1: Initialize in optimization phase
        await nextTick();
        expect(gamePhase.value).toBe('optimization');
        expect(effectiveGenome.value.dataClusters).toBe(6);
        expect(effectiveGenome.value.cubePool).toBe(0);

        // Step 2: Simulate machine processing OPTIMIZE_DATA
        // (Spending 3 data to gain 1 cube)
        machineGenome.value = {
            ...machineGenome.value,
            dataClusters: 3,
            cubePool: 1
        };
        await nextTick();

        const currentEffectiveData = effectiveGenome.value.dataClusters;
        const currentMachineData = localGenome.value.dataClusters;
        const currentEffectiveCubes = effectiveGenome.value.cubePool;
        const currentMachineCubes = localGenome.value.cubePool;

        console.log(`[TEST] Machine State: data=${currentMachineData}, cubes=${currentMachineCubes}`);
        console.log(`[TEST] UI Effective State: data=${currentEffectiveData}, cubes=${currentEffectiveCubes}`);

        // EXPECTATION: UI should match machine state after an authoritative change
        // ACTUAL BUG: UI will still show 6 data and 0 cubes (stale snapshot)
        expect(currentEffectiveData).toBe(currentMachineData);
        expect(currentEffectiveCubes).toBe(currentMachineCubes);
    });
});
