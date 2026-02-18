import { HexCell, PlayerPiece, HexType, AttributeType } from '../types';
import { getHexDistance, shuffleSeeded, createPRNG } from '../utils';

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

const SKILL_COLORS: Record<string, string> = {
    NAV: '#3b82f6', // Blue
    LOG: '#06b6d4', // Cyan
    DEF: '#ef4444', // Red
    SCN: '#10b981', // Emerald
    MULTI: '#818cf8', // Indigo for multi-attribute
    HOME: '#ffffff', // White for starting locations
    SINGULARITY: '#f0abfc', // Fuchsia
};

const getHexColor = (hex: HexCell) => {
    if (hex.type === 'Singularity') return SKILL_COLORS.SINGULARITY;
    if (hex.type === 'HomeNebula') return SKILL_COLORS.HOME;
    if (Array.isArray(hex.targetAttribute)) return SKILL_COLORS.MULTI;
    return SKILL_COLORS[hex.targetAttribute] || '#94a3b8';
};

interface HexGridProps {
    hexGrid: HexCell[];
    pieces: PlayerPiece[];
    playerColors: Record<string, string>;
    onHexClick: (id: string) => void;
    currentHexId?: string;
    maxDistance?: number;
}

const HexGrid: React.FC<HexGridProps> = ({ hexGrid, pieces, playerColors, onHexClick, currentHexId, maxDistance }) => {
    const currentHex = hexGrid.find(h => h.id === currentHexId);
    // Dynamic Hex Layout (CSS Grid based visualization)
    return (
        <div className="relative w-full aspect-square max-w-4xl mx-auto p-12 bg-slate-900/50 rounded-[3rem] border border-white/5 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 group overflow-hidden">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent)] pointer-events-none" />

            <svg viewBox="-450 -450 900 900" className="w-full h-full drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                {/* Visual Connections/Constellations */}
                <g className="opacity-10">
                    <circle cx="0" cy="0" r="120" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 8" />
                    <circle cx="0" cy="0" r="230" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2 12" />
                    <circle cx="0" cy="0" r="340" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="1 16" />
                </g>

                {hexGrid.map(hex => {
                    const size = 57.2; // Increased by 10% (from 52)
                    const spacing = 1.05; // Tightened spacing slightly for larger tiles
                    const posX = hex.x * (size * 1.5 * spacing);
                    const posY = (hex.y + hex.x / 2) * (Math.sqrt(3) * size * spacing);

                    const points = [];
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * 60) * Math.PI / 180;
                        points.push(`${posX + size * Math.cos(angle)},${posY + size * Math.sin(angle)}`);
                    }

                    const isSingularity = hex.type === 'Singularity';
                    const isHome = hex.type === 'HomeNebula';
                    const color = getHexColor(hex);

                    // Range calculation
                    const distance = (currentHex && maxDistance !== undefined)
                        ? getHexDistance(currentHex.x, currentHex.y, hex.x, hex.y)
                        : Infinity;
                    const inRange = distance <= (maxDistance || 0);
                    const isOccupiedByLocal = currentHexId === hex.id;

                    return (
                        <g
                            key={hex.id}
                            onClick={() => onHexClick(hex.id)}
                            className={`cursor-pointer group/hex transition-all duration-500`}
                        >
                            {/* Glow Effect */}
                            <polygon
                                points={points.join(' ')}
                                className={`transition-all duration-700 ${isSingularity ? 'fill-indigo-500/20' : 'fill-transparent hover:fill-white/5'}`}
                            />

                            {/* Hex Border */}
                            <polygon
                                points={points.join(' ')}
                                style={{ stroke: color }}
                                className={`transition-all duration-300 stroke-[1.5] group-hover/hex:stroke-[3.5]
                                    ${isSingularity ? 'opacity-100 shadow-[0_0_20px_rgba(129,140,248,0.5)]' :
                                        isHome ? 'opacity-40' :
                                            'opacity-80 group-hover/hex:opacity-100'}
                                    ${inRange && !isOccupiedByLocal ? 'stroke-[4] stroke-white drop-shadow-[0_0_8px_white]' : ''}`}
                            />

                            {/* Hex Center Point & Labels */}
                            {!isHome && (
                                <circle
                                    cx={posX} cy={posY} r="2"
                                    style={{ fill: color }}
                                />
                            )}

                            {/* Hex Name/Type */}
                            {!isHome && (
                                <text
                                    x={posX}
                                    y={posY - 28}
                                    textAnchor="middle"
                                    style={{ fill: color }}
                                    className="text-[8px] font-black uppercase tracking-widest pointer-events-none select-none"
                                >
                                    {hex.type.split(/(?=[A-Z])/).map((word, idx) => (
                                        <tspan key={idx} x={posX} dy={idx === 0 ? 0 : 8}>
                                            {word}
                                        </tspan>
                                    ))}
                                </text>
                            )}

                            {/* Resource Icons (Vertically Centered on Sides) */}
                            {!isHome && (
                                <g transform={`translate(${posX}, ${posY})`}>
                                    {hex.yield.matter > 0 && (
                                        <g transform="translate(-32, 0)">
                                            <rect x="-8" y="-8" width="16" height="16" rx="2" className="fill-amber-500/80" />
                                            <text x="0" y="2" textAnchor="middle" className="text-[12px] font-black fill-slate-900 pointer-events-none select-none">{hex.yield.matter}</text>
                                        </g>
                                    )}
                                    {hex.yield.data > 0 && (
                                        <g transform="translate(32, 0)">
                                            <circle r="8" className="fill-cyan-500/80" />
                                            <text x="0" y="2" textAnchor="middle" className="text-[12px] font-black fill-slate-900 pointer-events-none select-none">{hex.yield.data}</text>
                                        </g>
                                    )}
                                </g>
                            )}

                            {/* Threshold & Attribute (Lower Area) */}
                            {!isHome && (
                                <g transform={`translate(${posX}, ${posY + 18})`}>
                                    <text
                                        x="0"
                                        y="0"
                                        textAnchor="middle"
                                        className="text-[14px] font-black fill-white pointer-events-none select-none"
                                    >
                                        {hex.threshold > 0 ? hex.threshold : ''}
                                    </text>

                                    <text
                                        x="0"
                                        y="10"
                                        textAnchor="middle"
                                        className="text-[7px] font-bold fill-slate-500 uppercase tracking-widest pointer-events-none select-none"
                                    >
                                        {Array.isArray(hex.targetAttribute)
                                            ? hex.targetAttribute.join('·')
                                            : hex.targetAttribute}
                                    </text>
                                </g>
                            )}

                            {/* Piece Indicator */}
                            {pieces.filter(p => p.hexId === hex.id).map((p, idx) => (
                                <g key={`${p.playerId}-${idx}`} className="animate-in zoom-in-50 fade-in duration-500">
                                    <circle
                                        cx={posX}
                                        cy={posY}
                                        r={isSingularity ? "35" : "28"}
                                        fill="none"
                                        stroke={playerColors[p.playerId]}
                                        strokeWidth="4"
                                        className="opacity-20 animate-pulse"
                                    />
                                    <circle
                                        cx={posX}
                                        cy={posY}
                                        r="18"
                                        fill={playerColors[p.playerId]}
                                        className="shadow-xl"
                                    />
                                    <circle
                                        cx={posX}
                                        cy={posY}
                                        r="12"
                                        fill="white"
                                        className="opacity-20"
                                    />
                                </g>
                            ))}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default HexGrid;
