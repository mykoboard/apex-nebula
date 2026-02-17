import React from 'react';
import ApexNebula from './ApexNebula';
import { PlayerInfo, SimpleConnection } from '@mykoboard/integration';

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
            <div className="fixed top-4 right-4 z-[100] flex gap-2 p-2 bg-slate-900/80 backdrop-blur border border-white/10 rounded-xl shadow-2xl">
                <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10 mr-1">
                    Debug Sim
                </div>
                <button
                    onClick={() => {
                        const message = { namespace: 'game', type: 'START_GAME', payload: {}, senderId: 'debug' };
                        (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
                >
                    Start Game
                </button>
                <button
                    onClick={() => {
                        const message = { namespace: 'game', type: 'FINALIZE_SETUP', payload: { playerId: 'player2' }, senderId: 'debug' };
                        (mockConnections[0] as any).listeners.forEach((l: any) => l(JSON.stringify(message)));
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded-md transition-colors"
                >
                    Simulate Beta AI Ready
                </button>
            </div>

            <ApexNebula
                connections={mockConnections}
                playerNames={mockPlayers.map(p => p.name)}
                playerInfos={mockPlayers}
                isInitiator={true}
                ledger={[]}
                onAddLedger={handleAddLedger}
                onFinishGame={handleFinishGame}
            />
        </div>
    );
};

export default StandaloneApexNebula;
