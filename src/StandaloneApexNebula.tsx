import React from 'react';
import ApexNebula from './ApexNebula';
import { PlayerInfo, SimpleConnection } from '@mykoboard/integration';
import { EnvironmentalEvent } from './types';
import { INITIAL_EVENT_DECK } from './components/EventDeck';
import { ChevronDown } from 'lucide-react';

// Mock connection for standalone testing
class MockConnection implements SimpleConnection {
    id: string;
    private listeners: ((data: string) => void)[] = [];

    constructor(id: string) {
        this.id = id;
    }

    send(data: string): void {
        console.log('Mock send:', data);
    }

    addMessageListener(callback: (data: string) => void): void {
        this.listeners.push(callback);
    }

    removeMessageListener(callback: (data: string) => void): void {
        this.listeners = this.listeners.filter(l => l !== callback);
    }
}

const StandaloneApexNebula: React.FC = () => {
    const mockPlayers: PlayerInfo[] = [
        { id: 'player1', name: 'Alpha AI', status: 'game', isConnected: true, isLocal: true, isHost: true },
        { id: 'player2', name: 'Beta AI', status: 'game', isConnected: true, isLocal: false, isHost: false },
    ];

    const mockConnections = [new MockConnection('conn1')];
    const [showEvents, setShowEvents] = React.useState(false);

    const handleAddLedger = (action: { type: string; payload: any }) => {
        console.log('Add to ledger:', action);
    };

    const handleFinishGame = () => {
        console.log('Game finished');
        alert('Game finished! In production, this would return to lobby.');
    };

    return (
        <div className="relative">
            {/* Standalone Debug Toolbar */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 p-2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl shadow-2xl max-w-sm">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10 mr-1">
                        Debug Sim
                    </div>
                    <button
                        onClick={() => setShowEvents(!showEvents)}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
                    >
                        Force Event <ChevronDown className={`w-3 h-3 transition-transform ${showEvents ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            const seed = Math.floor(Math.random() * 1000000);
                            const message = { namespace: 'game', type: 'START_GAME', payload: { seed }, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
                    >
                        Start
                    </button>
                </div>

                {showEvents && (
                    <div className="grid grid-cols-2 gap-1 p-2 bg-black/40 rounded-xl border border-white/5 max-h-64 overflow-y-auto">
                        {INITIAL_EVENT_DECK.map((e: EnvironmentalEvent) => (
                            <button
                                key={e.id}
                                onClick={() => {
                                    const message = { namespace: 'game', type: 'FORCE_EVENT', payload: { eventId: e.id }, senderId: 'debug' };
                                    (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                                    setShowEvents(false);
                                }}
                                className="px-2 py-1 text-left text-[8px] font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors truncate"
                                title={e.name}
                            >
                                {e.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-1">
                    <button
                        onClick={() => {
                            // Deterministic randomization for mock Beta AI
                            const dist = [1, 1, 1, 1];
                            let remaining = 12;
                            while (remaining > 0) {
                                const idx = Math.floor(Math.random() * 4);
                                if (dist[idx] < 6) {
                                    dist[idx]++;
                                    remaining--;
                                }
                            }
                            const attrs = ['NAV', 'LOG', 'DEF', 'SCN'];
                            attrs.forEach((attr, i) => {
                                if (dist[i] > 1) { // Only send if we added something
                                    const message = {
                                        namespace: 'game',
                                        type: 'DISTRIBUTE_CUBES',
                                        payload: {
                                            playerId: 'player2',
                                            attribute: attr,
                                            amount: dist[i] - 1
                                        },
                                        senderId: 'debug'
                                    };
                                    (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                                }
                            });
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Force Beta AI Distribution
                    </button>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => {
                            const message = { namespace: 'game', type: 'INITIATE_MUTATION', payload: {}, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Beta AI Mutation
                    </button>
                    <button
                        onClick={() => {
                            const message = { namespace: 'game', type: 'CONFIRM_PHASE', payload: { playerId: 'player2' }, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Beta AI Confirm
                    </button>
                    <button
                        onClick={() => {
                            const message = { namespace: 'game', type: 'NEXT_PHASE', payload: {}, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Beta AI Competitive
                    </button>
                    <button
                        onClick={() => {
                            const message = { namespace: 'game', type: 'FINISH_TURN', payload: { playerId: 'player2' }, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Beta AI Finish
                    </button>
                    <button
                        onClick={() => {
                            const message = { namespace: 'game', type: 'CONFIRM_PHASE', payload: { playerId: 'player2' }, senderId: 'debug' };
                            (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors flex-1"
                    >
                        Beta AI Opt-Confirm
                    </button>
                </div>
            </div>

            <ApexNebula
                connections={mockConnections}
                playerInfos={mockPlayers}
                playerNames={mockPlayers.map(p => p.name)}
                isInitiator={true}
                ledger={[]}
                onAddLedger={handleAddLedger}
                onFinishGame={handleFinishGame}
            />
        </div>
    );
};

export default StandaloneApexNebula;
