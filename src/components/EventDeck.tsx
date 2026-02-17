import React from 'react';
import { EnvironmentalEvent } from '../types';
import { Layers, RotateCcw } from 'lucide-react';

export const INITIAL_EVENT_DECK: EnvironmentalEvent[] = [
    { id: '1', name: 'Gravitational Wave', description: 'Requires high Navigation', targetAttribute: 'NAV', threshold: 4, penalty: { type: 'stability', amount: 1 } },
    { id: '2', name: 'Data Corruption', description: 'Requires high Logic', targetAttribute: 'LOG', threshold: 4, penalty: { type: 'data', amount: 1 } },
    { id: '3', name: 'Micrometeoroids', description: 'Requires high Defense', targetAttribute: 'DEF', threshold: 4, penalty: { type: 'stability', amount: 1 } },
];

interface EventDeckProps {
    deck: EnvironmentalEvent[];
    discard: EnvironmentalEvent[];
}

const EventDeck: React.FC<EventDeckProps> = ({ deck, discard }) => {
    return (
        <div className="flex gap-6 items-center p-6 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl">
            {/* Draw Pile */}
            <div className="relative group cursor-help" title={`Events remaining: ${deck.length}`}>
                <div className="w-16 h-24 bg-slate-800 rounded-xl border-2 border-slate-700 flex flex-col items-center justify-center transition-all group-hover:border-purple-500/50 group-hover:bg-slate-800/80 shadow-lg">
                    <Layers className="w-6 h-6 text-slate-500 group-hover:text-purple-400 mb-1" />
                    <span className="text-[10px] font-black text-slate-600 group-hover:text-purple-400">{deck.length}</span>
                </div>
                {/* Depth effect */}
                <div className="absolute -bottom-1 -right-1 w-16 h-24 bg-slate-900 rounded-xl border border-slate-800 -z-10" />
                <div className="absolute -bottom-2 -right-2 w-16 h-24 bg-slate-950 rounded-xl border border-slate-900 -z-20 opacity-50" />
            </div>

            {/* Deck Descriptor */}
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Deck</span>
            </div>

            <div className="flex-1" />

            {/* Discard Pile */}
            <div className="relative group opacity-60 hover:opacity-100 transition-opacity cursor-help" title={`Discard pile: ${discard.length}`}>
                <div className="w-16 h-24 bg-black/40 rounded-xl border-2 border-white/5 flex flex-col items-center justify-center border-dashed">
                    <RotateCcw className="w-5 h-5 text-slate-700 mb-1" />
                    <span className="text-[10px] font-black text-slate-700">{discard.length}</span>
                </div>
            </div>
        </div>
    );
};

export default EventDeck;
