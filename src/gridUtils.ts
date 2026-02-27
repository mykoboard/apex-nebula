import { HexCell, HexType, AttributeType } from './types';
import { shuffleSeeded, createPRNG } from './utils';

// Hex grid initialization (37-Hex Tiered Galaxy)
export const createHexGrid = (seed: number = 12345): HexCell[] => {
    const hexes: HexCell[] = [];
    const maxRadius = 4;
    const prng = createPRNG(seed);

    const tier3Dist: HexType[] = [
        'Supernova', 'PulsarArchive', 'GravityWell', 'CoreDatabase',
        'SingularityShard', 'SingularityShard'
    ];
    const tier2Dist: HexType[] = [
        'SolarFlare', 'SolarFlare',
        'DeepBuoy', 'DeepBuoy',
        'IonCloud', 'IonCloud',
        'SystemCache', 'SystemCache',
        'EncryptedRelay', 'EncryptedRelay', 'EncryptedRelay', 'EncryptedRelay'
    ];
    const tier1Dist: HexType[] = [
        'ScrapHeap', 'ScrapHeap', 'ScrapHeap',
        'SignalPing', 'SignalPing', 'SignalPing',
        'GravityEddy', 'GravityEddy', 'GravityEddy',
        'LogicFragment', 'LogicFragment', 'LogicFragment',
        'DataCluster', 'DataCluster', 'DataCluster', 'DataCluster', 'DataCluster', 'DataCluster'
    ];

    const s3 = shuffleSeeded(tier3Dist, prng);
    const s2 = shuffleSeeded(tier2Dist, prng);
    const s1 = shuffleSeeded(tier1Dist, prng);

    let i3 = 0, i2 = 0, i1 = 0;

    for (let q = -maxRadius; q <= maxRadius; q++) {
        for (let r = Math.max(-maxRadius, -q - maxRadius); r <= Math.min(maxRadius, -q + maxRadius); r++) {
            const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
            const id = `H-${q}-${r}`;

            let type: HexType = 'ScrapHeap';
            let threshold = 0;
            let yield_res = { matter: 0, data: 0 };
            let targetAttr: AttributeType | AttributeType[] = 'DEF';

            if (distance === 0) {
                type = 'Singularity';
                threshold = 8;
                yield_res = { matter: 0, data: 0 }; // Special win condition
                targetAttr = ['LOG', 'SCN'];
            } else if (distance === 1) {
                type = s3[i3++];
                threshold = 6;
                if (type === 'Supernova') {
                    targetAttr = 'DEF';
                    yield_res = { matter: 4, data: 0 };
                } else if (type === 'PulsarArchive') {
                    targetAttr = 'SCN';
                    yield_res = { matter: 0, data: 4 };
                } else if (type === 'GravityWell') {
                    targetAttr = 'NAV';
                    yield_res = { matter: 4, data: 0 };
                } else if (type === 'CoreDatabase') {
                    targetAttr = 'LOG';
                    yield_res = { matter: 0, data: 4 };
                } else if (type === 'SingularityShard') {
                    targetAttr = ['NAV', 'LOG', 'DEF', 'SCN'];
                    yield_res = { matter: 4, data: 4 };
                }
            } else if (distance === 2) {
                type = s2[i2++];
                threshold = 4;
                if (type === 'SolarFlare') {
                    targetAttr = 'DEF';
                    yield_res = { matter: 2, data: 0 };
                } else if (type === 'DeepBuoy') {
                    targetAttr = 'SCN';
                    yield_res = { matter: 0, data: 2 };
                } else if (type === 'IonCloud') {
                    targetAttr = 'NAV';
                    yield_res = { matter: 2, data: 0 };
                } else if (type === 'SystemCache') {
                    targetAttr = 'LOG';
                    yield_res = { matter: 0, data: 2 };
                } else if (type === 'EncryptedRelay') {
                    targetAttr = ['LOG', 'NAV'];
                    yield_res = { matter: 2, data: 2 };
                }
            } else if (distance === 3) {
                type = s1[i1++];
                threshold = 2;
                if (type === 'ScrapHeap') {
                    targetAttr = 'DEF';
                    yield_res = { matter: 1, data: 0 };
                } else if (type === 'SignalPing') {
                    targetAttr = 'SCN';
                    yield_res = { matter: 0, data: 1 };
                } else if (type === 'GravityEddy') {
                    targetAttr = 'NAV';
                    yield_res = { matter: 1, data: 0 };
                } else if (type === 'LogicFragment') {
                    targetAttr = 'LOG';
                    yield_res = { matter: 0, data: 1 };
                } else if (type === 'DataCluster') {
                    targetAttr = 'LOG';
                    yield_res = { matter: 1, data: 1 };
                }
            } else if (distance === 4) {
                const isHomePos = (q === 4 && r === -2) || (q === -2 && r === 4) || (q === -4 && r === 2) || (q === 2 && r === -4);
                if (isHomePos) {
                    type = 'HomeNebula';
                    threshold = 0;
                    yield_res = { matter: 0, data: 0 };
                } else {
                    continue;
                }
            }

            hexes.push({
                id,
                type,
                threshold,
                yield: yield_res,
                targetAttribute: targetAttr,
                x: q,
                y: r
            });
        }
    }
    return hexes;
};
