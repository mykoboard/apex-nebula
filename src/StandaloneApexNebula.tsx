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

    const mockConnections: SimpleConnection[] = [
        new MockConnection('conn1'),
    ];

    const handleAddLedger = (action: { type: string; payload: any }) => {
        console.log('Add to ledger:', action);
        // In a real game, this would create a proper ledger entry
    };

    const handleFinishGame = () => {
        console.log('Game finished');
        alert('Game finished! In production, this would return to lobby.');
    };

    return (
        <ApexNebula
            connections={mockConnections}
            playerNames={mockPlayers.map(p => p.name)}
            playerInfos={mockPlayers}
            isInitiator={true}
            ledger={[]}
            onAddLedger={handleAddLedger}
            onFinishGame={handleFinishGame}
        />
    );
};

export default StandaloneApexNebula;
