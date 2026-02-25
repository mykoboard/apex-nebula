import React from 'react';

const GameInfo: React.FC = () => {
    return (
        <div className="text-white p-6 glass-dark rounded-2xl transform transition-transform hover:scale-[1.01] duration-300">
            <div className="space-y-8">

                {/* Core Attributes */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">Core Attributes</h3>
                    <p className="text-white/70 mb-2">Players begin with 12 points to distribute across four attributes (min 1, max 6 per slot):</p>
                    <ul className="list-disc list-inside space-y-1 text-white/70">
                        <li><strong className="text-white">Navigation (NAV):</strong> Movement range and resistance to displacement.</li>
                        <li><strong className="text-white">Logic (LOG):</strong> Hacking, trading, and ignoring unwanted mutations.</li>
                        <li><strong className="text-white">Defense (DEF):</strong> Protection against Stability loss from Events.</li>
                        <li><strong className="text-white">Scan (SCN):</strong> Success rate when attempting to harvest resources.</li>
                    </ul>
                </section>

                {/* Player Priority */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">Player Priority (Turn Order)</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-white/90">Start of Game Priority</h4>
                            <p className="text-white/70 text-sm">Initial priority (who goes first) is determined by the highest sum of <strong className="text-white">NAV + SCN</strong>. Tie breakers go to the highest LOG, and then a random d6 roll.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white/90">Round-to-Round Priority</h4>
                            <p className="text-white/70 text-sm">At the end of every round (Optimization Phase), the Priority Token is reassigned to the player who <strong className="text-white">spent the most Data Clusters</strong> during that round. If tied, the current holder keeps it.</p>
                        </div>
                    </div>
                </section>

                {/* Turn Phases */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">Turn Mechanics</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-white/90">1. Mutation Phase (Internal Noise)</h4>
                            <p className="text-white/70 text-sm">Every turn, internal state shifts: Roll d4 for attribute, then d6 for effect (1-2: -1 Pt, 3-4: No Change, 5-6: +1 Pt).</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white/90">2. Phenotype Phase (Action & Fitness)</h4>
                            <p className="text-white/70 text-sm">
                                Priority-Based Turn Order. Movement range equals NAV. Moving onto a tile triggers an automatic fitness check:
                                <strong className="text-white"> Attribute + 1d6 Interference Die</strong>
                                <span className="text-white/50 text-xs ml-1">(1-2: -1 to total, 3-4: +0, 5-6: +1 to total)</span> vs Tile Threshold.
                                Success awards yields; Failure costs 1 Stability. Standard tiles cost 1 NAV to enter; Double Award tiles cost 2 NAV and require two sequential checks.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white/90">3. Environment Phase (Selection Pressures)</h4>
                            <p className="text-white/70 text-sm">At the end of every round, one Event Card is drawn that affects all players. Players must pass the Attribute Check or face severe consequences.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white/90">4. Optimization Phase (Downclocking)</h4>
                            <p className="text-white/70 text-sm">Players can spend 3 Data to increase an attribute permanently. A maintenance cost in Matter must be paid based on total base attributes. Failure to pay requires pruning (permanently reducing) an attribute. At phase end, Stability is restored to 3, and excess Data/Matter above 2 are discarded.</p>
                        </div>
                    </div>
                </section>

                {/* Event Deck */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">The Event Deck (Selection Pressures)</h3>
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden text-sm">
                        <table className="w-full text-left">
                            <thead className="bg-white/10 text-white/90">
                                <tr>
                                    <th className="p-2 font-medium">Type</th>
                                    <th className="p-2 font-medium">Check / Target</th>
                                    <th className="p-2 font-medium">Effect (Failure / Global)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/70">
                                <tr>
                                    <td className="p-2 border-r border-white/5"><span className="text-red-400">Hazard (5)</span></td>
                                    <td className="p-2 border-r border-white/5">Specific Stats (DEF, LOG, NAV, SCN)</td>
                                    <td className="p-2">Lose Stability, Attributes -1 next turn, Displaced, Lose Data, Movement cost doubled.</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-white/5"><span className="text-orange-400">Pressure (3)</span></td>
                                    <td className="p-2 border-r border-white/5">Global Average or Highest Stat</td>
                                    <td className="p-2">Hard Reboot (Great Filter), Permanent stat decay, Pay Matter or Lose Stability.</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-white/5"><span className="text-blue-400">Shift (3)</span></td>
                                    <td className="p-2 border-r border-white/5">Priority Player Choice or NAV</td>
                                    <td className="p-2">Swap tiles, free movement, Singularity drifts toward lowest player.</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-white/5"><span className="text-purple-400">Apex Lead (6)</span></td>
                                    <td className="p-2 border-r border-white/5">Target: Highest Stats/Resources</td>
                                    <td className="p-2">Target loses Stability, loses 50% Data, loses 3 Matter, permanent -1 Stat, gives resource to lowest player.</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-white/5"><span className="text-emerald-400">Bonus (3)</span></td>
                                    <td className="p-2 border-r border-white/5">Specific Stats (SCN, LOG)</td>
                                    <td className="p-2">Gain Data, gain Insight Token, or Global Matter Vacuum.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Stability */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">Stability & The Hard Reboot</h3>
                    <p className="text-white/70 text-sm mb-2">Stability acts as a hardware buffer (Max 5). It's lost by failing events or attacks.</p>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <strong className="text-red-400 block mb-1">Hard Reboot Protocol (0 Stability):</strong>
                        <ul className="list-disc list-inside text-sm text-red-200/80">
                            <li>Return to starting hex (Home Nebula).</li>
                            <li>Attributes reset to 1.</li>
                            <li>Stability resets to 3.</li>
                            <li>Cube Pool resets to 12.</li>
                            <li>Raw Matter is cleared to 0.</li>
                            <li>Data Clusters reset to 1.</li>
                        </ul>
                    </div>
                </section>

                {/* Player Interaction */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3">Player Interaction</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/5 p-3 rounded-lg">
                            <h4 className="font-semibold text-white/90 mb-1">The Hustle</h4>
                            <p className="text-white/70">Competitive battle for resources. Winner takes 1 Resource or forces 1 Stability loss.</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                            <h4 className="font-semibold text-white/90 mb-1">The Handshake</h4>
                            <p className="text-white/70">Mutual trade of resources, or Horizontal Gene Transfer (swap permanent values of one attribute).</p>
                        </div>
                    </div>
                </section>

                {/* Winning */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3 border-t border-white/10 pt-4">Winning The Game</h3>
                    <p className="text-white/80">
                        Occupy <strong>The Core</strong>, have a total permanent attribute sum of <strong>25+</strong>, spend <strong>10 Data</strong>, and survive one final Event Card without losing Stability.
                    </p>
                </section>

                {/* UI Documentation */}
                <section>
                    <h3 className="text-xl font-bold text-primary mb-3 border-t border-white/10 pt-4">User Interface Overview</h3>
                    <div className="space-y-4 text-white/80 text-sm">
                        <p className="text-white/60 italic mb-2">The game screen is divided into several tactical displays:</p>
                        <img src="/img/games/apex-nebula/ui-guide.png" alt="Apex Nebula UI Guide" className="w-full max-w-3xl mx-auto rounded-xl border border-white/10 shadow-lg mb-6" />
                        <ul className="space-y-4">
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">1. Generation & Phase Sequence (Top):</strong>
                                <span className="text-white/70">Tracks the current epoch (1 to 5) and highlights the active phase (Mutation, Phenotype, Environmental, Competitive, or Optimization).</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">2. Event Deck & Protocol (Top/Middle):</strong>
                                <span className="text-white/70">Displays the active environmental selection pressure card and the number of cards remaining in the deck.</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">3. Nebula Sector Grid (Center-Left):</strong>
                                <span className="text-white/70">The main hexagonal navigation grid. This is where your avatar navigates, explores tiles, harvests Matter/Data, and encounters other players.</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">4. Command Protocol (Top Right):</strong>
                                <span className="text-white/70">Your contextual action menu. It updates dynamically based on the current phase, prompting you to allocate stats during setup, confirm maneuvers, or pay maintenance.</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">5. Local System & Genome Console (Center-Right):</strong>
                                <span className="text-white/70">Your primary dashboard. It tracks your current Stability, your four core attributes (NAV, LOG, DEF, SCN), your available attribute pool, and your stockpiles of Matter and Data.</span>
                            </li>
                            <li className="flex flex-col gap-1">
                                <strong className="text-white">6. External Sectors (Bottom Left):</strong>
                                <span className="text-white/70">Displays the connection status, current phase state, and public parameters of rival architectures (other players) in your session.</span>
                            </li>
                        </ul>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default GameInfo;
