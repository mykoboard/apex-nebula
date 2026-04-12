import { describe, it, expect } from 'bun:test';
import { ref, computed } from 'vue';

describe('Pending Genome Logic (ApexNebula)', () => {
  it('correctly selects pending state over machine state when available', () => {
    const machineState = {
      playerPublicKey: 'p1',
      cubePool: 8,
      baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 }
    };

    const localGenome = computed(() => machineState);
    const pendingGenome = ref<any>(null);

    // Initial state: pending is null, so we should use localGenome
    const effectiveGenome = computed(() => pendingGenome.value || localGenome.value);
    expect(effectiveGenome.value.cubePool).toBe(8);

    // Simulate starting a distribution session
    pendingGenome.value = JSON.parse(JSON.stringify(machineState));
    expect(effectiveGenome.value.cubePool).toBe(8);

    // Simulate placing a cube in pending state
    pendingGenome.value.cubePool = 7;
    pendingGenome.value.baseAttributes.NAV = 2;

    // effectiveGenome should now reflect pending changes
    expect(effectiveGenome.value.cubePool).toBe(7);
    expect(effectiveGenome.value.baseAttributes.NAV).toBe(2);

    // Machine state should remain unchanged
    expect(localGenome.value.cubePool).toBe(8);
  });

  it('handles late arrival of localGenome (Guest scenario)', () => {
    const machinePlayers = ref<any[]>([]); // Machine doesn't have players yet
    const machineGenomes = ref<any[]>([]);
    const resolvedLocalPublicKey = ref('guest-1');

    const localPlayer = computed(() => machinePlayers.value.find(p => p.publicKey === resolvedLocalPublicKey.value) || null);
    const localGenome = computed(() => machineGenomes.value.find(g => g.playerPublicKey === localPlayer.value?.publicKey) || null);
    const pendingGenome = ref<any>(null);

    // Watcher logic from ApexNebula.vue
    const syncPending = () => {
      if (!pendingGenome.value && localGenome.value) {
        pendingGenome.value = JSON.parse(JSON.stringify(localGenome.value));
      }
    };

    const effectiveGenome = computed(() => pendingGenome.value || localGenome.value);

    // Initially everything is null
    expect(localPlayer.value).toBeNull();
    expect(localGenome.value).toBeNull();
    expect(effectiveGenome.value).toBeNull();

    // Machine receives START_GAME from host
    machinePlayers.value = [{ publicKey: 'host-1' }, { publicKey: 'guest-1' }];
    machineGenomes.value = [
      { playerPublicKey: 'host-1', cubePool: 8 },
      { playerPublicKey: 'guest-1', cubePool: 8 }
    ];

    // Trigger sync (in Vue this would be the watcher)
    syncPending();

    expect(localPlayer.value).not.toBeNull();
    expect(localPlayer.value.publicKey).toBe('guest-1');
    expect(localGenome.value).not.toBeNull();
    expect(localGenome.value.cubePool).toBe(8);
    expect(effectiveGenome.value).not.toBeNull();
    expect(effectiveGenome.value.cubePool).toBe(8);
  });
});
