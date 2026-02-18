import React from 'react';
import { EnvironmentalEvent } from '../types';
import { AlertTriangle } from 'lucide-react';

interface EventCardProps {
    event: EnvironmentalEvent | null;
    results?: Record<string, { roll: number; modifier: number; success: boolean }>;
    localPlayerId?: string;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    if (!event) {
        return (
            <div className="bg-black/20 border-2 border-dashed border-white/10 rounded-2xl p-4 text-center">
                <span className="text-slate-600 text-[10px] font-black uppercase tracking-wider">No Active Event Protocol</span>
            </div>
        );
    }

    const getEffectDescription = (effect: any) => {
        if (!effect) return null;
        const targetDesc = effect.target === 'self' ? 'You' :
            effect.target === 'all' ? 'All' :
                effect.target === 'priority' ? 'Priority' :
                    effect.target === 'most_data' ? 'Most Data' :
                        effect.target === 'most_matter' ? 'Most Matter' :
                            effect.target === 'highest_stat' ? 'Highest Stat' :
                                effect.target === 'sum_26_plus' ? 'Sum 26+' :
                                    effect.target === 'stat_8_plus' ? 'Stat 8+' : '';

        switch (effect.type) {
            case 'stability': return `${targetDesc} lose ${effect.amount} Stability`;
            case 'data': return `${targetDesc} lose ${effect.details?.fraction ? 'half' : effect.amount} Data`;
            case 'matter': return `${targetDesc} lose ${effect.amount} Matter`;
            case 'displacement': return `${targetDesc} displaced ${effect.amount}`;
            case 'movement_cost': return `Movement cost doubled`;
            case 'stat_mod_temp': return `All stats -1 next turn`;
            case 'stat_mod_perm': return `-1 Perm`;
            case 'hard_reboot': return `HARD REBOOT`;
            case 'map_shift': return `Map Shift: ${effect.details?.action.replace(/_/g, ' ')}`;
            case 'transfer': return `Transfer ${effect.amount} ${effect.details?.resource}`;
            case 'gain_insight': return `${targetDesc} +${effect.amount} Insight`;
            default: return '';
        }
    };

    const typeColors = {
        'Hazard': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        'Pressure': 'text-red-400 bg-red-500/10 border-red-500/20',
        'Shift': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        'Apex Lead': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        'Bonus': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };

    return (
        <div className={`border-2 rounded-2xl p-4 bg-slate-900/50 backdrop-blur-xl transition-all ${event.type === 'Hazard' ? 'border-orange-500/30' : event.type === 'Pressure' ? 'border-red-500/30' : event.type === 'Shift' ? 'border-blue-500/30' : event.type === 'Apex Lead' ? 'border-purple-500/30' : 'border-emerald-500/30'}`}>
            <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border ${typeColors[event.type]}`}>
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-[11px] uppercase tracking-wide leading-none">{event.name}</h3>
                        <p className={`text-[7px] font-black uppercase tracking-widest mt-1 opacity-70`}>
                            {event.type}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-black/40 rounded-lg px-2 py-1 border border-white/5 flex flex-col items-center min-w-[60px]">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">REQ CHECK</span>
                        <span className="font-black text-white text-[10px] tracking-widest leading-none">
                            {event.checkType} <span className="text-orange-500">{event.threshold}</span>
                        </span>
                    </div>
                </div>
            </div>

            <p className="text-[10px] text-slate-400 mb-3 border-l-2 border-white/5 pl-2 italic leading-tight">
                {event.description}
            </p>

            <div className="grid grid-cols-2 gap-2">
                {event.effects.onSuccess && (
                    <div className="text-[9px] bg-emerald-900/10 text-emerald-400/80 rounded border border-emerald-500/10 px-2 py-1 flex items-center gap-1.5">
                        <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                        <span className="font-black uppercase tracking-tighter text-[7px] text-emerald-500">WIN:</span>
                        <span className="truncate">{getEffectDescription(event.effects.onSuccess)}</span>
                    </div>
                )}
                {event.effects.onFailure && (
                    <div className="text-[9px] bg-red-900/10 text-red-400/80 rounded border border-red-500/10 px-2 py-1 flex items-center gap-1.5">
                        <div className="w-1 h-3 bg-red-500 rounded-full" />
                        <span className="font-black uppercase tracking-tighter text-[7px] text-red-500">LOSS:</span>
                        <span className="truncate">{getEffectDescription(event.effects.onFailure)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventCard;
