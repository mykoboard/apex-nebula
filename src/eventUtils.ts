import { EnvironmentalEvent } from './types';

export const INITIAL_EVENT_DECK: EnvironmentalEvent[] = [
    // HAZARDS
    {
        id: 'hazard-1', type: 'Hazard', name: 'Solar Flare', description: 'Intense solar radiation testing hull integrity.',
        checkType: 'DEF', threshold: 4, effects: { onFailure: { type: 'stability', amount: 1, target: 'self' } }
    },
    {
        id: 'hazard-2', type: 'Hazard', name: 'Logic Plague', description: 'Viral code fragments disrupting systems.',
        checkType: 'LOG', threshold: 5, effects: { onFailure: { type: 'stat_mod_temp', amount: -1, target: 'self', attribute: undefined } } // undefined attribute means "all"
    },
    {
        id: 'hazard-3', type: 'Hazard', name: 'Ion Storm', description: 'Electromagnetic interference causing displacement.',
        checkType: 'NAV', threshold: 3, effects: { onFailure: { type: 'displacement', amount: 2, target: 'self' } }
    },
    {
        id: 'hazard-4', type: 'Hazard', name: 'Data Leak', description: 'Signal interference purging data clusters.',
        checkType: 'SCN', threshold: 4, effects: { onFailure: { type: 'data', amount: 2, target: 'self' } }
    },
    {
        id: 'hazard-5', type: 'Hazard', name: 'Gravity Well', description: 'Sudden gravitational pull increasing effort.',
        checkType: 'NAV', threshold: 5, effects: { onFailure: { type: 'movement_cost', amount: 2, target: 'self' } }
    },

    // PRESSURE
    {
        id: 'pressure-1', type: 'Pressure', name: 'The Great Filter', description: 'Universal threshold check.',
        checkType: 'TOTAL_SUM', threshold: 'AVG+2', effects: { onFailure: { type: 'hard_reboot', target: 'self' } }
    },
    {
        id: 'pressure-2', type: 'Pressure', name: 'Weight Decay', description: 'Entropic decay of optimized systems.',
        checkType: 'NONE', threshold: 0, effects: { global: { type: 'stat_mod_perm', amount: -1, target: 'highest_stat' } }
    },
    {
        id: 'pressure-3', type: 'Pressure', name: 'System Heat', description: 'Overheating components require matter or stability.',
        checkType: 'DEF', threshold: 5, effects: { onFailure: { type: 'matter', amount: 1, target: 'self', details: { fallback: 'stability' } } }
    },

    // SHIFT
    {
        id: 'shift-1', type: 'Shift', name: 'Grid Re-Sync', description: 'Spatial recalibration.',
        checkType: 'NONE', threshold: 0, effects: { global: { type: 'map_shift', target: 'priority', details: { action: 'swap_adjacent_t2_t3' } } }
    },
    {
        id: 'shift-2', type: 'Shift', name: 'Space Fold', description: 'Brief window for efficient travel.',
        checkType: 'NAV', threshold: 6, effects: { onSuccess: { type: 'displacement', amount: 1, target: 'self', details: { free: true } } }
    },
    {
        id: 'shift-3', type: 'Shift', name: 'Core Drift', description: 'The singularity shifts.',
        checkType: 'NONE', threshold: 0, effects: { global: { type: 'map_shift', target: 'lowest_sum', details: { action: 'move_singularity_toward' } } }
    },

    // APEX LEAD
    {
        id: 'apex-1', type: 'Apex Lead', name: 'Thermal Throttle', description: 'Safety protocols for high-power systems.',
        checkType: 'DEF', threshold: 6, effects: { onFailure: { type: 'stability', amount: 2, target: 'sum_26_plus' } }
    },
    {
        id: 'apex-2', type: 'Apex Lead', name: 'Data Corruption', description: 'High-density storage interference.',
        checkType: 'LOG', threshold: 5, effects: { onFailure: { type: 'data', amount: 0.5, target: 'most_data', details: { fraction: true } } }
    },
    {
        id: 'apex-3', type: 'Apex Lead', name: 'Resource Leach', description: 'Subtle energy drain on matter reserves.',
        checkType: 'SCN', threshold: 5, effects: { onFailure: { type: 'matter', amount: 3, target: 'most_matter' } }
    },
    {
        id: 'apex-4', type: 'Apex Lead', name: 'System Bloat', description: 'Inefficient allocation of top resources.',
        checkType: 'LOG', threshold: 6, effects: { onFailure: { type: 'stat_mod_perm', amount: -1, target: 'highest_stat' } }
    },
    {
        id: 'apex-5', type: 'Apex Lead', name: 'Parasitic Drift', description: 'Siphoning data to weaker frames.',
        checkType: 'NONE', threshold: 0, effects: { global: { type: 'transfer', amount: 1, attribute: undefined, target: 'priority', details: { from: 'highest_sum', to: 'lowest_sum', resource: 'data' } } }
    },
    {
        id: 'apex-6', type: 'Apex Lead', name: 'Overfit Fragile', description: 'Strained hulls from extreme specialization.',
        checkType: 'NAV', threshold: 4, effects: { onFailure: { type: 'stability', amount: 1, target: 'stat_8_plus' } }
    },

    // BONUS
    {
        id: 'bonus-1', type: 'Bonus', name: 'Deep Scan', description: 'Opportunity for extra data harvest.',
        checkType: 'SCN', threshold: 6, effects: { onSuccess: { type: 'data', amount: 1, target: 'self' } }
    },
    {
        id: 'bonus-2', type: 'Bonus', name: 'Matter Vacuum', description: 'Universal resource drain.',
        checkType: 'NONE', threshold: 0, effects: { global: { type: 'matter', amount: 1, target: 'all', details: { fallback: 'stability' } } }
    },
    {
        id: 'bonus-3', type: 'Bonus', name: 'Model Sync', description: 'Perfect alignment of internal models.',
        checkType: 'LOG', threshold: 4, effects: { onSuccess: { type: 'gain_insight', amount: 1, target: 'self' } }
    },
];
