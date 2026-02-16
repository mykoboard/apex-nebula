import React from 'react';
import { HexCell, PlayerPiece } from '../apexNebulaMachine';

interface HexGridProps {
    hexGrid: HexCell[];
    pieces: PlayerPiece[];
    playerColors: Record<string, string>;
    onHexClick?: (hexId: string) => void;
}

const HexGrid: React.FC<HexGridProps> = ({ hexGrid, pieces, playerColors, onHexClick }) => {
    const hexSize = 45;
    const hexWidth = Math.sqrt(3) * hexSize;

    const getHexStyle = (hex: HexCell) => {
        const distance = Math.max(Math.abs(hex.x), Math.abs(hex.y), Math.abs(-hex.x - hex.y));

        if (hex.type === 'HomeNebula') return { color: '#10b981', label: '', opacity: 0.8 };
        if (hex.type === 'Singularity') return { color: '#22d3ee', label: '', opacity: 1 };
        if (hex.type === 'Void') {
            return { color: '#0f172a', label: '', opacity: 0.2 };
        }

        switch (distance) {
            case 1: return { color: '#7f1d1d', label: '', opacity: 0.9 };
            case 2: return { color: '#9a3412', label: '', opacity: 0.7 };
            case 3: return { color: '#134e4a', label: '', opacity: 0.5 };
            default: return { color: '#0f172a', label: '', opacity: 0.2 };
        }
    };

    const getHexCenter = (hex: HexCell) => {
        const x = hexSize * (Math.sqrt(3) * hex.x + (Math.sqrt(3) / 2) * hex.y);
        const y = hexSize * (1.5 * hex.y);
        return { x, y };
    };

    const createHexagonPath = (cx: number, cy: number) => {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = cx + hexSize * Math.cos(angle);
            const y = cy + hexSize * Math.sin(angle);
            points.push(`${x},${y}`);
        }
        return points.join(' ');
    };

    const centers = hexGrid.map(h => getHexCenter(h));
    const minX = Math.min(...centers.map(c => c.x)) - hexWidth / 2 - 20;
    const maxX = Math.max(...centers.map(c => c.x)) + hexWidth / 2 + 20;
    const minY = Math.min(...centers.map(c => c.y)) - hexSize - 20;
    const maxY = Math.max(...centers.map(c => c.y)) + hexSize + 20;

    const width = maxX - minX;
    const height = maxY - minY;

    return (
        <div className="bg-slate-950/40 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-sm shadow-inner relative overflow-hidden">
            <svg
                viewBox={`${minX} ${minY} ${width} ${height}`}
                className="w-full h-auto"
                style={{ maxHeight: '760px' }}
            >
                {hexGrid.map((hex) => {
                    const { x, y } = getHexCenter(hex);
                    const piecesOnHex = pieces.filter(p => p.hexId === hex.id);
                    const style = getHexStyle(hex);

                    return (
                        <g key={hex.id} className="group/hex">
                            <polygon
                                points={createHexagonPath(x, y)}
                                fill={style.color}
                                fillOpacity={style.opacity}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="2"
                                className="hex-cell cursor-pointer transition-all duration-200 group-hover/hex:stroke-cyan-400 group-hover/hex:fill-opacity-100"
                                onClick={() => onHexClick?.(hex.id)}
                            />

                            {/* Tier / Void Label */}
                            {style.label && (
                                <text
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="8"
                                    fontWeight="black"
                                    className="uppercase tracking-[0.2em] opacity-30 pointer-events-none select-none group-hover/hex:opacity-100 transition-opacity"
                                >
                                    {style.label}
                                </text>
                            )}

                            {/* Specific Tile Type */}
                            {hex.type !== 'HomeNebula' && hex.type !== 'Singularity' && (
                                <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="7"
                                    fontWeight="black"
                                    className="uppercase tracking-[0.05em] opacity-80 pointer-events-none select-none group-hover/hex:opacity-100 transition-opacity"
                                >
                                    {hex.type.replace(/([A-Z])/g, ' $1').trim()}
                                </text>
                            )}

                            {/* Threshold / Attribute / Void Value */}
                            {hex.type === 'Singularity' ? (
                                <g className="pointer-events-none select-none">
                                    <text
                                        x={x}
                                        y={y + 10}
                                        textAnchor="middle"
                                        fill="#22d3ee"
                                        fontSize="10"
                                        fontWeight="black"
                                        className="uppercase tracking-tighter"
                                    >
                                        WIN REQ
                                    </text>
                                </g>
                            ) : hex.threshold > 0 && (
                                <g className="pointer-events-none select-none">
                                    <text
                                        x={x}
                                        y={y + 10}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="black"
                                        className="opacity-90 group-hover/hex:opacity-100 transition-opacity"
                                    >
                                        {hex.threshold}
                                    </text>
                                    {hex.type !== 'Void' && (
                                        <text
                                            x={x}
                                            y={y + 20}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="5"
                                            fontWeight="black"
                                            className="uppercase tracking-widest opacity-40"
                                        >
                                            {Array.isArray(hex.targetAttribute) ? hex.targetAttribute.join('+') : hex.targetAttribute}
                                        </text>
                                    )}
                                </g>
                            )}

                            {/* Player Pieces */}
                            {piecesOnHex.map((piece, i) => (
                                <circle
                                    key={piece.playerId}
                                    cx={x + (i - (piecesOnHex.length - 1) / 2) * 16}
                                    cy={y + (hex.type === 'Void' ? 0 : 30)}
                                    r="8"
                                    fill={playerColors[piece.playerId] || '#fff'}
                                    stroke="#020617"
                                    strokeWidth="2"
                                    className="pointer-events-none drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                />
                            ))}
                        </g>
                    );
                })}
            </svg >
        </div >
    );
};

export default HexGrid;
