import React from 'react';
import { EnvironmentalEvent } from '../apexNebulaMachine';
import { AlertTriangle } from 'lucide-react';

interface EventCardProps {
    event: EnvironmentalEvent | null;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    if (!event) {
        return (
            <div className="bg-black/20 border-2 border-dashed border-white/10 rounded-[2rem] p-6 text-center">
                <span className="text-slate-600 text-[10px] font-black uppercase tracking-wider">No Active Event</span>
            </div>
        );
    }

    return (
        <div className="bg-orange-900/20 border-2 border-orange-500/30 rounded-[2rem] p-6 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                    <h3 className="font-black text-orange-300 text-sm uppercase tracking-wider">{event.name}</h3>
                    <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Environmental Pressure</p>
                </div>
            </div>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{event.description}</p>

            <div className="h-px w-full bg-white/5 mb-4" />

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Target Phenotype</div>
                    <div className="font-bold text-orange-400 text-xs tracking-widest">
                        {event.targetAttribute}
                    </div>
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Threshold</div>
                    <div className="font-black text-orange-400 text-xl">{event.threshold}</div>
                </div>
            </div>
            <div className="mt-3 text-xs bg-red-900/20 text-red-400 rounded-xl p-3 border border-red-500/20">
                <strong className="font-black uppercase tracking-wider">Penalty:</strong> -{event.penalty} Stability on failure
            </div>
        </div>
    );
};

export default EventCard;
