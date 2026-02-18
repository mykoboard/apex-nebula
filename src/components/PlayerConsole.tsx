import React from 'react';
import { AttributeType, PlayerGenome } from '../types';

import { Database, Zap, Shield, Cpu, Box, HardDrive, Heart } from 'lucide-react';

interface PlayerConsoleProps {
    genome: PlayerGenome;
    onDistribute?: (attribute: AttributeType, amount: number) => void;
    editable?: boolean;
    setupLimit?: number;
}

const PlayerConsole: React.FC<PlayerConsoleProps> = ({ genome, onDistribute, editable, setupLimit }) => {
    const attributes: { type: AttributeType; label: string; icon: any; color: string }[] = [
        { type: 'NAV', label: 'Navigation', icon: Zap, color: 'text-blue-400' },
        { type: 'LOG', label: 'Logic', icon: Cpu, color: 'text-green-400' },
        { type: 'DEF', label: 'Defense', icon: Shield, color: 'text-red-400' },
        { type: 'SCN', label: 'Sensors', icon: HardDrive, color: 'text-yellow-400' },
    ];

    const allocatedPoints = Object.values(genome.baseAttributes).reduce((sum, val) => sum + val, 0);
    const requiredMatter = allocatedPoints >= 29 ? 3 : allocatedPoints >= 21 ? 2 : allocatedPoints >= 16 ? 1 : 0;

    return (
        <div className="bg-slate-900/90 border-2 border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-md w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h3 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                        <Box className="w-6 h-6 text-indigo-400" />
                        Genome Console
                    </h3>
                    {/* Stability Track */}
                    <div className="flex items-center gap-2 mt-1">
                        <Heart className="w-3 h-3 text-red-500 fill-red-500/20" />
                        <div className="flex gap-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-sm border transition-all ${i < genome.stability
                                        ? 'bg-red-500 border-red-400 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
                                        : 'bg-slate-900 border-slate-800'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter ml-1">Stability</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Allocated</span>
                        <span className="text-sm font-black text-white px-2 py-0.5 bg-white/5 rounded-md ring-1 ring-white/10">{allocatedPoints}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Pool</span>
                        <span className={`${genome.cubePool > 0 ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 bg-slate-900'} text-sm font-black px-2 py-0.5 rounded-md ring-1 ring-indigo-500/30 transition-all`}>
                            {genome.cubePool}
                        </span>
                    </div>
                </div>
            </div>

            {/* Attribute Tracks */}
            <div className="space-y-6 mb-8">
                {attributes.map(attr => (
                    <div key={attr.type} className="group">
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <attr.icon className={`w-4 h-4 ${attr.color}`} />
                                <span className={`text-xs font-bold uppercase tracking-widest ${attr.color}`}>
                                    {attr.label}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-lg font-black text-white tabular-nums w-4 text-center">
                                    {genome.baseAttributes?.[attr.type] ?? 0}
                                </span>
                            </div>
                        </div>

                        {/* Slot Track */}
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5 h-6 flex-1">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            if (!editable) return;
                                            const targetValue = i + 1;
                                            if (setupLimit && targetValue > setupLimit) return;
                                            const currentValue = genome.baseAttributes?.[attr.type] ?? 0;
                                            if (targetValue === currentValue) return;
                                            onDistribute?.(attr.type, targetValue - currentValue);
                                        }}
                                        className={`flex-1 h-full rounded-sm border transition-all duration-300 relative group/slot
                                            ${editable && (!setupLimit || i < setupLimit)
                                                ? 'cursor-pointer hover:ring-2 hover:ring-white/30 hover:scale-[1.05] hover:z-10'
                                                : 'cursor-not-allowed opacity-40'} 
                                            ${i < (genome.baseAttributes?.[attr.type] ?? 0)
                                                ? `bg-gradient-to-br ${attr.color.replace('text', 'from').replace('-400', '-500')} ${attr.color.replace('text', 'to').replace('-400', '-700')} shadow-[0_0_10px_rgba(0,0,0,0.5)] border-white/20`
                                                : (setupLimit && i >= setupLimit
                                                    ? 'bg-slate-950/20 border-slate-900/50'
                                                    : 'bg-slate-950/50 border-slate-800/50 shadow-inner')}
                                            `}
                                    >
                                        {/* Setup Limit Indicator */}
                                        {setupLimit && i === setupLimit - 1 && (
                                            <div className="absolute inset-y-0 -right-[4px] w-[2px] bg-indigo-500/30 z-20 pointer-events-none" title="Setup Limit" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Mutation Modifier Circular Slot */}
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ${Math.abs(genome.mutationModifiers?.[attr.type] || 0) > 0
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                : 'bg-slate-950 border-slate-800 text-slate-700'
                                }`}>
                                {genome.mutationModifiers?.[attr.type] ? (genome.mutationModifiers[attr.type] > 0 ? `+${genome.mutationModifiers[attr.type]}` : genome.mutationModifiers[attr.type]) : ''}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Resource Trays */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-amber-500" />
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase leading-none truncate">Matter</div>
                            <div className="text-xl font-black text-white leading-tight">{genome.rawMatter}</div>
                        </div>
                    </div>
                    {/* Visual Matter Stack & Requirement */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-wrap-reverse gap-0.5 w-12 justify-end">
                            {Array.from({ length: Math.min(genome.rawMatter, 10) }).map((_, i) => (
                                <div key={i} className="w-2 h-2 bg-amber-600 rounded-sm shadow-sm" />
                            ))}
                        </div>
                        <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-1 ${genome.rawMatter < requiredMatter ? 'bg-red-500/20 text-red-500 ring-red-500/30' : 'bg-slate-900/50 text-slate-500 ring-white/5'}`}>
                            Required: {requiredMatter}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-500" />
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase leading-none">Data</div>
                            <div className="text-xl font-black text-white leading-tight">{genome.dataClusters}</div>
                        </div>
                    </div>
                    {/* Visual Data Stack */}
                    <div className="flex flex-wrap-reverse gap-0.5 w-12 justify-end">
                        {Array.from({ length: Math.min(genome.dataClusters, 10) }).map((_, i) => (
                            <div key={i} className="w-2 h-2 bg-cyan-600 rounded-sm shadow-sm" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerConsole;
