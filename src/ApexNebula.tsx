import React, { useEffect, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { GameProps, createGameMessage, isGameMessage } from '@mykoboard/integration';
import { apexNebulaMachine } from './apexNebulaMachine';
import { Color, Player } from './types';

import HexGrid from './components/HexGrid';
import PlayerConsole from './components/PlayerConsole';
import EventCard from './components/EventCard';
import EventDeck from './components/EventDeck';
import PhaseIndicator from './components/PhaseIndicator';

import { Dna, Dice6, Trophy, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS: Color[] = ['red', 'green', 'blue', 'yellow'];

const COLORS_HEX: Record<Color, string> = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#facc15',
};

const ApexNebula: React.FC<GameProps> = ({
    connections,
    playerInfos,
    isInitiator,
    ledger,
    onAddLedger,
    onFinishGame,
}) => {
    const players: Player[] = useMemo(() => {
        return playerInfos.map((info, index) => ({
            id: info.id,
            name: info.name,
            color: COLORS[index % COLORS.length],
        }));
    }, [playerInfos]);

    const [state, send] = useMachine(apexNebulaMachine, {
        input: {
            // ... existing input props
            players,
            genomes: players.map(p => ({
                playerId: p.id,
                stability: 5,
                dataClusters: 0,
                rawMatter: 0,
                insightTokens: 0,
                lockedSlots: [],
                baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                cubePool: 12,
            })),
            pieces: players.map((p, i) => {
                const starts = ['H-4--2', 'H--2-4', 'H--4-2', 'H-2--4'];
                return {
                    playerId: p.id,
                    hexId: starts[i % starts.length],
                };
            }),
            isInitiator,
            ledger,
            readyPlayers: [],
        },
    });



    const localPlayer = playerInfos.find(p => p.isLocal);
    const localGenome = state.context.genomes.find(g => g.playerId === localPlayer?.id);
    const currentPlayer = state.context.players[state.context.currentPlayerIndex];
    const isLocalPlayerTurn = currentPlayer?.id === localPlayer?.id;
    const otherPlayers = playerInfos.filter(p => !p.isLocal);

    // Debugging state changes
    useEffect(() => {
        console.log('--- UI Render State ---');
        console.log('Current Phase:', state.value);
        console.log('Editable (setupPhase?):', state.matches('setupPhase'));
        console.log('Cube Pool:', localGenome?.cubePool);
        console.log('Shared Seed:', state.context.seed);
    }, [state.value, localGenome?.cubePool, state.context.seed]);

    // WebRTC message handling
    useEffect(() => {
        const handleMessage = (data: string) => {
            try {
                const message = JSON.parse(data);
                console.log('Raw Message:', message);
                console.log('isGameMessage check:', isGameMessage(message));

                if (isGameMessage(message)) {
                    console.log('Sending event to machine:', message.type, message.payload);
                    send({ type: message.type as any, ...message.payload });
                }
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };

        connections.forEach(conn => {
            conn.addMessageListener(handleMessage);
        });

        return () => {
            connections.forEach(conn => {
                conn.removeMessageListener(handleMessage);
            });
        };
    }, [connections, send]);

    // Sync state changes to other players
    useEffect(() => {
        if (isInitiator && state.context.players.length > 0) {
            const message = createGameMessage('SYNC_STATE', { context: state.context });
            connections.forEach(conn => {
                conn.send(JSON.stringify(message));
            });
        }
    }, [state.context, isInitiator, connections]);

    // Add to ledger on significant actions
    const handleAction = (actionType: string, payload: any) => {
        send({ type: actionType as any, ...payload });

        // During setup, cube distribution is obfuscated (hide attribute)
        if (state.matches('setupPhase') && actionType === 'DISTRIBUTE_CUBES') {
            const { playerId, amount } = payload;
            onAddLedger({ type: actionType, payload: { playerId, amount } });
            return;
        }

        onAddLedger({ type: actionType, payload });
    };


    const handleMoveToHex = (hexId: string) => {
        if (!localPlayer || !isLocalPlayerTurn) return;
        handleAction('MOVE_PLAYER', { playerId: localPlayer.id, hexId });
    };

    const handleColonize = (resourceType?: 'Matter' | 'Data') => {
        if (!localPlayer) return;
        handleAction('COLONIZE_PLANET', { playerId: localPlayer.id, resourceType });
    };


    const handleReset = () => {
        handleAction('RESET', {});
    };

    if (state.matches('won')) {
        const winnerNames = state.context.winners
            .map(id => state.context.players.find(p => p.id === id)?.name)
            .filter(Boolean);

        return (
            <div className="min-h-screen p-8 flex flex-col space-y-12 bg-[#020617] text-slate-100 border-0 rounded-none overflow-x-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)] pointer-events-none" />
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
                    <div className="bg-slate-900 border-purple-500/50 p-12 rounded-[3rem] max-w-2xl w-full shadow-[0_0_100px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                        <div className="mx-auto w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-8 border border-purple-500/20 shadow-inner">
                            <Trophy className="w-12 h-12 text-purple-500 animate-pulse" />
                        </div>
                        <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">SINGULARITY ACHIEVED</h2>
                        <p className="text-slate-400 text-lg mb-10 font-bold leading-relaxed max-w-md mx-auto">
                            {winnerNames.join(', ')} reached technological singularity through optimal evolution!
                        </p>
                        <div className="flex gap-4">
                            <Button
                                onClick={handleReset}
                                className="flex-1 h-16 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all"
                            >
                                New Evolution Cycle
                            </Button>
                            <Button
                                onClick={onFinishGame}
                                className="flex-1 h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-sm uppercase tracking-[0.2em] border border-white/5 transition-all"
                            >
                                Exit to Lobby
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 flex flex-col space-y-12 bg-[#020617] text-slate-100 border-0 rounded-none overflow-x-hidden relative">
            {/* Ambient Background Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center relative z-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                            <Dna className="w-8 h-8 text-purple-400 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                                APEX NEBULA
                            </h2>
                            <p className="text-[10px] font-black text-purple-400/60 uppercase tracking-[0.4em] mt-1 ml-1">Evolutionary Strategy Protocol</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {otherPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full" title={p.name}>
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-[8px] font-black text-slate-400 uppercase">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Phase Indicator */}
            <div className="relative z-10">
                <PhaseIndicator currentPhase={state.context.gamePhase} round={state.context.round} />
            </div>

            <div className="flex flex-col gap-12 relative z-10">
                {/* Top Section: Navigation Grid */}
                <div className="w-full space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-purple-500 rounded-full" />
                            Nebula Sector (Navigation Grid)
                        </h3>
                    </div>
                    <HexGrid
                        hexGrid={state.context.hexGrid}
                        pieces={state.context.pieces}
                        playerColors={Object.fromEntries(
                            state.context.players.map(p => [p.id, COLORS_HEX[p.color]])
                        )}
                        onHexClick={handleMoveToHex}
                    />
                </div>

                {/* Middle Section: Player Boards and Actions */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
                    {/* Left: Genome Matrix & Other Players */}
                    <div className="xl:col-span-8 space-y-12">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-indigo-500 uppercase flex items-center gap-2">
                                Genome Console
                                {state.context.priorityPlayerId === localPlayer?.id && (
                                    <Crown className="w-3 h-3 text-yellow-500" />
                                )}
                            </h4>
                            {localGenome && (
                                <PlayerConsole
                                    genome={localGenome}
                                    editable={state.matches('setupPhase')}
                                    setupLimit={state.matches('setupPhase') ? 6 : undefined}
                                    onDistribute={(attr, amt) => handleAction('DISTRIBUTE_CUBES', { playerId: localPlayer?.id, attribute: attr, amount: amt })}
                                />
                            )}
                        </div>

                        {/* Other Players' Genomes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            {state.context.genomes
                                .filter(g => g.playerId !== localPlayer?.id)
                                .map(genome => {
                                    const player = state.context.players.find(p => p.id === genome.playerId);
                                    if (!player) return null;
                                    const isReady = genome.cubePool === 0;
                                    return (
                                        <div key={genome.playerId} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase">{player.name}'s Systems</div>
                                                    {state.context.priorityPlayerId === player.id && (
                                                        <Crown className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                </div>
                                                {isReady && (
                                                    <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-black text-green-400 uppercase tracking-widest animate-pulse">
                                                        Ready
                                                    </div>
                                                )}
                                            </div>
                                            <PlayerConsole genome={genome} />
                                            {state.matches('mutationPhase') && state.context.turnOrder[state.context.currentPlayerIndex] === genome.playerId && !state.context.mutationResults[genome.playerId] && (
                                                <Button
                                                    onClick={() => handleAction('INITIATE_MUTATION', {})}
                                                    className="w-full mt-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[10px] h-8 uppercase font-black tracking-widest"
                                                >
                                                    Simulate {player.name} Mutation
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Right: Actions & Events */}
                    <div className="xl:col-span-4 space-y-10">
                        {/* Event Card */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                                <div className="w-1 h-3 bg-orange-500 rounded-full" />
                                Event Deck & Protocol
                            </h3>
                            <EventCard event={state.context.currentEvent} />
                            <EventDeck
                                deck={state.context.eventDeck}
                                discard={[]} // Discard state calculation could be added to machine context if needed
                            />

                        </div>

                        {/* Action Panel */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                                <div className="w-1 h-3 bg-white/20 rounded-full" />
                                Command Protocol
                            </h3>
                            <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-xl shadow-inner group transition-all hover:bg-white/[0.07]">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white">
                                        {isLocalPlayerTurn ? 'Awaiting Input' : `${currentPlayer?.name} 's Cycle`}
                                    </h3 >
                                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full ring-1 ring-purple-500/30">
                                        Phase: {state.context.gamePhase}
                                    </div>
                                </div>

                                {state.matches('setupPhase') && (
                                    <p className="text-xs text-slate-400 leading-relaxed italic">
                                        Distribute your 12 attribute cubes to initialize your genome's base configuration.
                                    </p>
                                )}

                                {state.matches('mutationPhase') && (
                                    <div className="space-y-6">
                                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <Zap className="w-3 h-3" />
                                            Stochastic Mutation Phase
                                        </h5>

                                        {Object.keys(state.context.mutationResults).length < state.context.players.length ? (
                                            <div className="space-y-4">
                                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                                    Systems are entering the nebula's high-radiation zone. {state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'It is your turn to initiate.' : `Awaiting ${state.context.players.find(p => p.id === state.context.turnOrder[state.context.currentPlayerIndex])?.name}...`}
                                                </p>
                                                <Button
                                                    onClick={() => handleAction('INITIATE_MUTATION', {})}
                                                    disabled={state.context.turnOrder[state.context.currentPlayerIndex] !== localPlayer?.id}
                                                    className={`w-full h-12 uppercase font-black tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id
                                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Dice6 className="w-4 h-4" />
                                                    {state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'Initiate Mutation' : 'Awaiting Turn...'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-4">
                                                    {state.context.players.map(p => {
                                                        const res = state.context.mutationResults[p.id];
                                                        if (!res) return null;
                                                        return (
                                                            <div key={p.id} className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{p.name}</span>
                                                                    <div className="flex gap-1.5">
                                                                        <div className="w-6 h-6 flex items-center justify-center bg-indigo-500/20 rounded border border-indigo-500/30 text-[10px] font-black text-indigo-400" title={`Attribute Roll: ${res.attrRoll}`}>
                                                                            {res.attrRoll}
                                                                        </div>
                                                                        <div className="w-6 h-6 flex items-center justify-center bg-purple-500/20 rounded border border-purple-500/30 text-[10px] font-black text-purple-400" title={`Magnitude Roll: ${res.magRoll}`}>
                                                                            {res.magRoll}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`text-xs font-black uppercase tracking-widest ${res.magnitude > 0 ? 'text-green-400' : res.magnitude < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                        {res.attr}: {res.magnitude > 0 ? '+' : ''}{res.magnitude}
                                                                    </div>
                                                                    <div className="h-[1px] flex-1 bg-white/5" />
                                                                    <span className="text-[8px] font-black text-slate-600 uppercase">Applied</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <Button
                                                    onClick={() => handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })}
                                                    disabled={state.context.confirmedPlayers.includes(localPlayer?.id || '')}
                                                    className={`w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all ${state.context.confirmedPlayers.includes(localPlayer?.id || '')
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-slate-700 text-white shadow-lg'
                                                        }`}
                                                >
                                                    {state.context.confirmedPlayers.includes(localPlayer?.id || '') ? 'Awaiting System Confirmation...' : 'Confirm & Continue'}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col gap-4">
                                    {state.matches('setupPhase') && isLocalPlayerTurn && (
                                        <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                                {localGenome?.cubePool! > 0 ? 'Allocating Neural Cubes...' : 'Distribution Finalized'}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                                {localGenome?.cubePool! > 0
                                                    ? `Place ${localGenome?.cubePool} more cubes to proceed.`
                                                    : 'Awaiting other sectors to initialize...'}
                                            </p>
                                        </div>
                                    )}


                                    {state.matches('phenotypePhase') && isLocalPlayerTurn && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Button
                                                    onClick={() => handleColonize('Matter')}
                                                    className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                                                >
                                                    Harvest Matter
                                                </Button>
                                                <Button
                                                    onClick={() => handleColonize('Data')}
                                                    className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                                                >
                                                    Harvest Data
                                                </Button>
                                            </div>
                                            {state.context.lastHarvestRoll && (
                                                <div className={`mt-4 p-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest text-center ${state.context.lastHarvestSuccess ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                    {state.context.lastHarvestSuccess ? 'Optimized: ' : 'Interference: '}
                                                    Roll {state.context.lastHarvestRoll} ({state.context.lastHarvestRoll <= 2 ? '-1' : (state.context.lastHarvestRoll >= 5 ? '+1' : '0')})
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {state.matches('optimizationPhase') && isLocalPlayerTurn && localGenome && (
                                        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                Optimization Window Open
                                            </p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto w-full flex justify-between items-center pt-12 border-t border-white/5 relative z-10">
                <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                        APEX-OS // NODE_CONNECTED
                    </p>
                </div>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                    Build revision 2026.02.16
                </p>
            </div>
        </div>
    );
};

export default ApexNebula;
