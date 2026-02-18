import React, { useEffect, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { GameProps, createGameMessage, isGameMessage } from '@mykoboard/integration';
import { apexNebulaMachine } from './apexNebulaMachine';
import { Color, Player, AttributeType } from './types';

import HexGrid from './components/HexGrid';
import PlayerConsole from './components/PlayerConsole';
import EventCard from './components/EventCard';
import EventDeck from './components/EventDeck';
import PhaseIndicator from './components/PhaseIndicator';

import { Dna, Dice6, Trophy, Crown, Zap } from 'lucide-react';
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
            players,
            genomes: players.map(p => ({
                playerId: p.id,
                stability: 3,
                dataClusters: 0,
                rawMatter: 0,
                insightTokens: 0,
                lockedSlots: [],
                baseAttributes: { NAV: 1, LOG: 1, DEF: 1, SCN: 1 },
                mutationModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
                tempAttributeModifiers: { NAV: 0, LOG: 0, DEF: 0, SCN: 0 },
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
    const activePlayerId = state.context.turnOrder[state.context.currentPlayerIndex];
    const currentPlayer = state.context.players.find(p => p.id === activePlayerId);
    const isLocalPlayerTurn = localPlayer && activePlayerId === localPlayer.id;
    const otherPlayers = playerInfos.filter(p => !p.isLocal);

    // WebRTC message handling
    useEffect(() => {
        const handleMessage = (data: string) => {
            try {
                const message = JSON.parse(data);
                if (isGameMessage(message)) {
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

    const handleAction = (actionType: string, payload: any) => {
        send({ type: actionType as any, ...payload });

        if (state.matches('setupPhase') && actionType === 'DISTRIBUTE_CUBES') {
            const { playerId, amount } = payload;
            onAddLedger({ type: actionType, payload: { playerId, amount } });
            return;
        }

        onAddLedger({ type: actionType, payload });
    };

    const handleFinishTurn = () => {
        if (!localPlayer) return;
        handleAction('FINISH_TURN', { playerId: localPlayer.id });
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent)] pointer-events-none" />

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

            <div className="relative z-10">
                <PhaseIndicator currentPhase={state.context.gamePhase} round={state.context.round} />
            </div>

            {/* Top Section: Event Protocol */}
            <div className="relative z-10 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                    <div className="w-1 h-3 bg-orange-500 rounded-full" />
                    Event Deck & Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                    <div className="md:col-span-3">
                        <EventCard
                            event={state.context.currentEvent}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <EventDeck
                            deck={state.context.eventDeck}
                            discard={[]}
                        />
                    </div>
                </div>
            </div>

            {/* Main Section: Map and Local Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Left: Map */}
                <div className="lg:col-span-8 space-y-6">
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
                        onHexClick={(hexId) => isLocalPlayerTurn && handleAction('MOVE_PLAYER', { playerId: localPlayer?.id, hexId })}
                        currentHexId={state.context.pieces.find(p => p.playerId === localPlayer?.id)?.hexId}
                        maxDistance={isLocalPlayerTurn &&
                            ((localGenome?.baseAttributes.NAV || 0) + (localGenome?.mutationModifiers.NAV || 0) + (localGenome?.tempAttributeModifiers.NAV || 0) > (state.context.phenotypeActions[localPlayer?.id!]?.movesMade || 0))
                            ? 1 : 0}
                    />
                </div>

                {/* Right: Sidebar (Command + Console) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Command Protocol */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                            <div className="w-1 h-3 bg-white/20 rounded-full" />
                            Command Protocol
                        </h3>
                        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 backdrop-blur-xl shadow-inner group transition-all hover:bg-white/[0.07]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white">
                                    {isLocalPlayerTurn ? 'Awaiting Input' : `${currentPlayer?.name}'s Cycle`}
                                </h3>
                                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-3 py-1 bg-purple-500/10 rounded-full ring-1 ring-purple-500/30">
                                    {state.context.gamePhase}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {state.matches('setupPhase') && (
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                        Distribute 12 cubes to initialize your configuration.
                                    </p>
                                )}

                                {state.matches('mutationPhase') && (
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            <Zap className="w-3 h-3" />
                                            Mutation Sync
                                        </h5>
                                        {Object.keys(state.context.mutationResults).length < state.context.players.length ? (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-slate-400 italic">
                                                    Systems entering radiation zone. {state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'Initiate sequence.' : 'Awaiting turn...'}
                                                </p>
                                                <Button
                                                    onClick={() => handleAction('INITIATE_MUTATION', {})}
                                                    disabled={state.context.turnOrder[state.context.currentPlayerIndex] !== localPlayer?.id}
                                                    className={`w-full h-10 uppercase font-black tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 ${state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id
                                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Dice6 className="w-4 h-4" />
                                                    {state.context.turnOrder[state.context.currentPlayerIndex] === localPlayer?.id ? 'Initiate' : 'Awaiting...'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                    {state.context.players.map(p => {
                                                        const res = state.context.mutationResults[p.id];
                                                        if (!res) return null;
                                                        return (
                                                            <div key={p.id} className="bg-slate-900/50 p-2 rounded-lg border border-white/5 space-y-1">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{p.name}</span>
                                                                    <div className="flex gap-1">
                                                                        <div className="px-1 bg-indigo-500/20 rounded text-[8px] font-black text-indigo-400">
                                                                            {res.attrRoll}
                                                                        </div>
                                                                        <div className="px-1 bg-purple-500/20 rounded text-[8px] font-black text-purple-400">
                                                                            {res.magnitude > 0 ? '+' : ''}{res.magnitude}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[9px] font-black uppercase tracking-tight text-white/70">
                                                                    {res.attr}: {res.magnitude > 0 ? '+' : ''}{res.magnitude}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <Button
                                                    onClick={() => handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })}
                                                    disabled={state.context.confirmedPlayers.includes(localPlayer?.id || '')}
                                                    className={`w-full uppercase font-black tracking-widest text-[10px] h-10 rounded-xl transition-all ${state.context.confirmedPlayers.includes(localPlayer?.id || '')
                                                        ? 'bg-slate-800 text-slate-500'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                                        }`}
                                                >
                                                    {state.context.confirmedPlayers.includes(localPlayer?.id || '') ? 'Confirmed' : 'Confirm Phase'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {state.matches('phenotypePhase') && (
                                    <div className="space-y-4">
                                        {isLocalPlayerTurn ? (
                                            <div className="space-y-3">
                                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase">Movement Active</p>
                                                    <p className="text-xs font-black text-white">
                                                        {Math.max(0, (localGenome?.baseAttributes.NAV || 0) + (localGenome?.mutationModifiers.NAV || 0) + (localGenome?.tempAttributeModifiers.NAV || 0) - (state.context.phenotypeActions[localPlayer?.id!]?.movesMade || 0))} Units
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={handleFinishTurn}
                                                    className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest border border-white/10"
                                                >
                                                    Finalize Turn
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 text-center italic text-slate-500 text-[10px] uppercase">
                                                Awaiting Turn...
                                            </div>
                                        )}

                                        {/* Local turn buttons are here */}
                                    </div>
                                )}

                                {state.matches('phenotypePhase') && state.context.lastHarvestResults.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                                            Latest Extractions
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {state.context.lastHarvestResults.map((res, i) => {
                                                const p = state.context.players.find(pl => pl.id === res.playerId);
                                                return (
                                                    <div key={i} className={`p-2 rounded-lg border flex items-center justify-between font-black text-[9px] uppercase tracking-tight ${res.success ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                        <span className="truncate max-w-[70px]">{p?.name || 'Unknown'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="opacity-70">{res.attribute}</span>
                                                            <div className="flex items-center gap-1">
                                                                <Dice6 className="w-3 h-3 opacity-50" />
                                                                <span>{res.roll}</span>
                                                                <span className={`text-[7px] px-1 rounded ${res.success ? 'bg-cyan-500/20' : 'bg-red-500/20'}`}>
                                                                    {res.success ? 'SUCCESS' : 'FAILURE'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {state.matches('environmentalPhase') && (
                                    <div className="space-y-4">
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {Object.entries(state.context.lastEventResults || {}).map(([pid, res]) => {
                                                const p = state.context.players.find(pl => pl.id === pid);
                                                if (!p) return null;
                                                return (
                                                    <div key={pid} className={`p-2 rounded-lg border flex items-center justify-between font-black text-[9px] uppercase tracking-tight ${res.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                        <span className="truncate max-w-[80px]">{p.name}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <Dice6 className="w-3 h-3 opacity-50" />
                                                            <span>{res.roll}</span>
                                                            <span className="opacity-50 text-[7px]">({res.modifier >= 0 ? '+' : ''}{res.modifier})</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {isInitiator && (
                                            <Button
                                                onClick={() => handleAction('NEXT_PHASE', {})}
                                                className="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/10"
                                            >
                                                Resolve Event Protocol
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {state.matches('competitivePhase') && isInitiator && (
                                    <Button
                                        onClick={() => handleAction('NEXT_PHASE', {})}
                                        className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        Resolve Competitive
                                    </Button>
                                )}

                                {state.matches('optimizationPhase') && (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-indigo-400 uppercase">Data Optimization</span>
                                                <span className="text-[10px] font-black text-white">{localGenome?.dataClusters || 0}/3</span>
                                            </div>
                                            <Button
                                                onClick={() => handleAction('OPTIMIZE_DATA', { playerId: localPlayer?.id })}
                                                disabled={!localGenome || localGenome.dataClusters < 3 || state.context.confirmedPlayers.includes(localPlayer?.id || '')}
                                                className="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-[9px] uppercase font-black tracking-widest rounded-lg"
                                            >
                                                <Zap className="w-3 h-3 mr-2" />
                                                Gain Attribute Cube
                                            </Button>
                                        </div>

                                        <div className="p-3 bg-slate-900/50 border border-white/5 rounded-xl space-y-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Attribute Pruning</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['NAV', 'LOG', 'DEF', 'SCN'] as AttributeType[]).map(attr => (
                                                    <Button
                                                        key={attr}
                                                        onClick={() => handleAction('PRUNE_ATTRIBUTE', { playerId: localPlayer?.id, attribute: attr })}
                                                        disabled={!localGenome || localGenome.baseAttributes[attr] <= 1 || state.context.confirmedPlayers.includes(localPlayer?.id || '')}
                                                        variant="outline"
                                                        className="h-8 text-[8px] font-black uppercase border-white/5 bg-black/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                                                    >
                                                        Prune {attr}
                                                    </Button>
                                                ))}
                                            </div>
                                            <p className="text-[7px] text-slate-500 italic text-center uppercase tracking-tight">+2 Matter per pruned level</p>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                onClick={() => handleAction('CONFIRM_PHASE', { playerId: localPlayer?.id })}
                                                disabled={state.context.confirmedPlayers.includes(localPlayer?.id || '')}
                                                className={`w-full h-12 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${state.context.confirmedPlayers.includes(localPlayer?.id || '')
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                    : (localGenome?.rawMatter || 0) >= 1
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'bg-red-900/40 text-red-400 border border-red-500/20'
                                                    }`}
                                            >
                                                {state.context.confirmedPlayers.includes(localPlayer?.id || '')
                                                    ? 'Maint Sequence Active'
                                                    : (localGenome?.rawMatter || 0) >= 1
                                                        ? 'Finalize (Pay 1 Matter)'
                                                        : 'Insufficient Matter'}
                                            </Button>
                                            <p className="text-[7px] text-slate-500 text-center mt-2 uppercase opacity-50">
                                                Resets Stability to 3 | Caps Data/Matter at 2
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Local Genome Console */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                            Local System
                            {state.context.priorityPlayerId === localPlayer?.id && (
                                <Crown className="w-3 h-3 text-yellow-500" />
                            )}
                        </h4>
                        {localGenome && (
                            <PlayerConsole
                                genome={localGenome}
                                editable={state.matches('setupPhase') || localGenome.cubePool > 0 || state.matches('optimizationPhase')}
                                setupLimit={state.matches('setupPhase') ? 6 : undefined}
                                onDistribute={(attr, amt) => handleAction('DISTRIBUTE_CUBES', { playerId: localPlayer?.id, attribute: attr, amount: amt })}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Other Players */}
            <div className="space-y-8 relative z-10 pt-12 border-t border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-700 rounded-full" />
                    External Sectors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {state.context.genomes
                        .filter(g => g.playerId !== localPlayer?.id)
                        .map(genome => {
                            const player = state.context.players.find(p => p.id === genome.playerId);
                            if (!player) return null;
                            const playerTurnIdx = state.context.turnOrder.indexOf(genome.playerId);
                            const isFinished = state.matches('phenotypePhase')
                                ? playerTurnIdx < state.context.currentPlayerIndex
                                : genome.cubePool === 0;

                            return (
                                <div key={genome.playerId} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase">{player.name}</div>
                                            {state.context.priorityPlayerId === player.id && (
                                                <Crown className="w-3 h-3 text-yellow-500" />
                                            )}
                                        </div>
                                        {isFinished && (
                                            <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-[8px] font-black text-green-400 uppercase">
                                                Ready
                                            </div>
                                        )}
                                    </div>
                                    <PlayerConsole genome={genome} />
                                </div>
                            );
                        })}
                </div>
            </div>

            <div className="mt-auto w-full flex justify-between items-center pt-8 border-t border-white/5 relative z-10 opacity-50">
                <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                        APEX-OS // NODE_CONNECTED
                    </p>
                </div>
                <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.4em]">
                    Build 2026.02.18
                </p>
            </div>
        </div>
    );
};

export default ApexNebula;
