import React from 'react';
import { GamePhase } from '../apexNebulaMachine';
import { Dna, Navigation, CloudLightning, Swords, Settings } from 'lucide-react';

interface PhaseIndicatorProps {
    currentPhase: GamePhase;
    round: number;
}

const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ currentPhase, round }) => {
    const phases: { id: GamePhase; name: string; icon: React.ReactNode; desc: string }[] = [
        { id: 'mutation', name: 'Mutation', icon: <Dna className="w-4 h-4" />, desc: 'Stochastic Evolution' },
        { id: 'phenotype', name: 'Phenotype', icon: <Navigation className="w-4 h-4" />, desc: 'Expression Phase' },
        { id: 'environmental', name: 'Environmental', icon: <CloudLightning className="w-4 h-4" />, desc: 'Selection Pressure' },
        { id: 'competitive', name: 'Competitive', icon: <Swords className="w-4 h-4" />, desc: 'Conflict Resolution' },
        { id: 'optimization', name: 'Optimization', icon: <Settings className="w-4 h-4" />, desc: 'Genome Refinement' },
    ];

    return (
        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-inner">
            {/* Stellar Epoch */}
            <div className="flex items-center gap-8 mb-6">
                <div className="w-32">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Generation</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Evolution Cycle</p>
                </div>
                <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map((r) => (
                        <div key={r} className="relative group/round">
                            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500
                                ${round === r
                                    ? 'bg-purple-500/20 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                    : 'bg-black/40 border-white/5 group-hover/round:border-white/10'}`}
                            >
                                <span className={`text-[10px] font-black transition-colors ${round === r ? 'text-purple-400' : 'text-slate-600'}`}>{r}</span>
                                {round === r && (
                                    <div className="absolute -top-1 -right-1 animate-in zoom-in-50 duration-500">
                                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-px w-full bg-white/5 mb-6" />

            {/* Protocol Phase Track */}
            <div className="flex items-center gap-8">
                <div className="w-32">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phase Sequence</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Genetic Algorithm</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                    {phases.map((p, idx, arr) => (
                        <div key={p.id} className="flex items-center gap-4">
                            <div className={`flex flex-col p-3 rounded-2xl border-2 transition-all duration-500 min-w-[140px] relative
                                ${currentPhase === p.id
                                    ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                    : 'bg-black/40 border-white/5 opacity-40'}
                            `}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${currentPhase === p.id ? 'bg-purple-500 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${currentPhase === p.id ? 'text-purple-400' : 'text-slate-500'}`}>
                                        {p.name}
                                    </span>
                                </div>
                                <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 ml-4">{p.desc}</span>
                                {currentPhase === p.id && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 animate-in slide-in-from-left-2 duration-500">
                                        <div className="w-1 h-8 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                    </div>
                                )}
                            </div>
                            {idx < arr.length - 1 && <div className="w-4 h-px bg-white/10" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PhaseIndicator;
