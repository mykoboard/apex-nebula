export interface PlayerInfo {
    publicKey: string;
    id?: string;
    name: string;
    status?: string;
    isConnected?: boolean;
    isLocal: boolean;
    isHost?: boolean;
}

export interface SimpleConnection {
    id: string;
    send(data: string): void;
    addMessageListener(listener: (data: any) => void): void;
    removeMessageListener(listener: (data: any) => void): void;
}

export type PeerConnection = SimpleConnection;

export interface LedgerEntry {
    action: {
        type: string;
        payload?: any;
    };
    sequence?: number;
    [key: string]: any;
}

export interface GameProps {
    playerInfos: PlayerInfo[];
    isInitiator: boolean;
    ledger?: LedgerEntry[];
    connections: SimpleConnection[];
    onAddLedger: (action: { type: string; payload?: any }) => void;
    onFinishGame?: () => void;
}

export interface GameMessage<T = any> {
    namespace: string;
    type: string;
    payload: T;
}

export function createGameMessage<T = any>(type: string, payload: T): GameMessage<T> {
    return {
        namespace: 'apex-nebula',
        type,
        payload,
    };
}

export function isGameMessage(msg: any): msg is GameMessage {
    return Boolean(
        msg &&
        typeof msg === 'object' &&
        (msg.namespace === 'game' || msg.namespace === 'apex-nebula')
    );
}

export async function createLocalWebRTCPair(): Promise<[SimpleConnection, SimpleConnection]> {
    const listenersA: Array<(data: any) => void> = [];
    const listenersB: Array<(data: any) => void> = [];

    const connA: SimpleConnection = {
        id: 'sim-conn-a',
        send(data: string) {
            setTimeout(() => {
                listenersB.forEach((l) => l(data));
            }, 0);
        },
        addMessageListener(listener) {
            listenersA.push(listener);
        },
        removeMessageListener(listener) {
            const idx = listenersA.indexOf(listener);
            if (idx !== -1) listenersA.splice(idx, 1);
        },
    };

    const connB: SimpleConnection = {
        id: 'sim-conn-b',
        send(data: string) {
            setTimeout(() => {
                listenersA.forEach((l) => l(data));
            }, 0);
        },
        addMessageListener(listener) {
            listenersB.push(listener);
        },
        removeMessageListener(listener) {
            const idx = listenersB.indexOf(listener);
            if (idx !== -1) listenersB.splice(idx, 1);
        },
    };

    return [connA, connB];
}
