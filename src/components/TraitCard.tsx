import React from 'react';
import { TraitCard as TraitCardType } from '../apexNebulaMachine';
import { Cpu, Zap, Wrench } from 'lucide-react';

interface TraitCardProps {
    card: TraitCardType | null;
    isLocked?: boolean;
    onClick?: () => void;
}

const TraitCard: React.FC<TraitCardProps> = ({ card, isLocked = false, onClick }) => {
    if (!card) {
        return (
            <div className={`genome-slot border-2 border-dashed border-white/10 rounded-2xl p-4 flex items-center justify-center bg-black/20 ${isLocked ? 'locked' : ''}`}>
                <span className="text-slate-600 text-[10px] font-black uppercase tracking-wider">Empty Slot</span>
            </div>
        );
    }

    const typeIcons = {
        Hard: <Cpu className="w-4 h-4" />,
        Soft: <Zap className="w-4 h-4" />,
        Util: <Wrench className="w-4 h-4" />,
    };

    const tierColors = {
        1: 'bg-slate-900/50 border-slate-600/30',
        2: 'bg-blue-900/30 border-blue-500/30',
        3: 'bg-purple-900/30 border-purple-500/40',
    };

    const typeColors = {
        Hard: 'text-red-400',
        Soft: 'text-blue-400',
        Util: 'text-green-400',
    };

    return (
        <div
            className={`trait-card genome-slot border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 ${tierColors[card.tier]} ${isLocked ? 'locked' : ''} hover:scale-105 hover:shadow-lg`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-1.5 ${typeColors[card.type]}`}>
                    {typeIcons[card.type]}
                    <span className="text-[10px] font-black uppercase tracking-wider">{card.type}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">T{card.tier}</span>
                </div>
            </div>
            <h4 className="font-black text-sm mb-2 text-white">{card.name}</h4>
            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-3">{card.logicTrigger}</p>

            <div className="space-y-1.5">
                {Object.entries(card.stats).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat}</span>
                        <span className="text-[10px] font-black text-white">+{value}</span>
                    </div>
                ))}
            </div>

            {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {card.tags.slice(0, 1).map((tag, i) => (
                        <span key={i} className="text-[8px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-white/5">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TraitCard;
