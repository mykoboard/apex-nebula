use crate::events::get_initial_event_deck;
use crate::grid::{create_hex_grid, get_hex_distance};
use crate::prng::{get_deterministic_offset, Mulberry32};
use crate::types::*;
use std::collections::HashMap;

const STARTING_HEXES: [&str; 4] = ["H-4--2", "H--2-4", "H--4-2", "H-2--4"];

pub fn calculate_maintenance_cost(genome: &PlayerGenome) -> u32 {
    let total_stats = genome.base_attributes.total();
    if total_stats > 12 {
        1 + (total_stats - 12) / 2
    } else {
        1
    }
}

pub fn check_win_condition(genome: &PlayerGenome) -> bool {
    genome.data_clusters >= 30 || genome.has_passed_singularity
}

pub fn create_initial_state() -> GameState {
    GameState {
        players: Vec::new(),
        current_player_index: 0,
        genomes: Vec::new(),
        pieces: Vec::new(),
        hex_grid: Vec::new(),
        event_deck: Vec::new(),
        current_event: None,
        game_phase: GamePhase::Waiting,
        round: 1,
        seed: 12345,
        mutation_results: HashMap::new(),
        priority_public_key: String::new(),
        turn_order: Vec::new(),
        data_spent_this_round: HashMap::new(),
        winners: Vec::new(),
        last_harvest_results: Vec::new(),
        phenotype_actions: HashMap::new(),
        confirmed_players: Vec::new(),
        last_event_results: HashMap::new(),
    }
}

pub fn apply_action(state: &mut GameState, action: GameAction) -> ActionResult {
    match action {
        GameAction::StartGame { seed, players } => handle_start_game(state, seed, players),
        GameAction::DistributeCubes {
            player_public_key,
            distributions,
        } => handle_distribute_cubes(state, &player_public_key, distributions),
        GameAction::ConfirmPhase { player_public_key } => {
            handle_confirm_phase(state, &player_public_key)
        }
        GameAction::MovePlayer {
            player_public_key,
            hex_id,
        } => handle_move_player(state, &player_public_key, &hex_id),
        GameAction::FinishTurn { player_public_key } => {
            handle_finish_turn(state, &player_public_key)
        }
        GameAction::OptimizeData { player_public_key } => {
            handle_optimize_data(state, &player_public_key)
        }
        GameAction::PruneAttribute {
            player_public_key,
            attribute,
        } => handle_prune_attribute(state, &player_public_key, attribute),
        GameAction::ForceEvent { event_id } => handle_force_event(state, &event_id),
        GameAction::Reset => handle_reset(state),
    }
}

fn handle_start_game(
    state: &mut GameState,
    seed_opt: Option<u32>,
    mut players: Vec<Player>,
) -> ActionResult {
    if players.is_empty() {
        return ActionResult {
            valid: false,
            error: Some("Player list cannot be empty".into()),
        };
    }

    let seed = seed_opt.unwrap_or(12345);
    players.sort_by(|a, b| a.public_key.cmp(&b.public_key));

    let mut genomes = Vec::new();
    let mut pieces = Vec::new();
    let mut turn_order = Vec::new();

    for (i, p) in players.iter().enumerate() {
        genomes.push(PlayerGenome::new(p.public_key.clone()));
        pieces.push(PlayerPiece {
            player_public_key: p.public_key.clone(),
            hex_id: STARTING_HEXES[i % STARTING_HEXES.len()].into(),
        });
        turn_order.push(p.public_key.clone());
    }

    state.players = players;
    state.seed = seed;
    state.genomes = genomes;
    state.pieces = pieces;
    state.turn_order = turn_order;
    state.hex_grid = create_hex_grid(seed);
    state.event_deck = get_initial_event_deck();
    state.current_event = None;
    state.game_phase = GamePhase::Setup;
    state.round = 1;
    state.current_player_index = 0;
    state.mutation_results.clear();
    state.confirmed_players.clear();
    state.data_spent_this_round.clear();
    state.winners.clear();
    state.last_harvest_results.clear();
    state.phenotype_actions.clear();
    state.last_event_results.clear();

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_distribute_cubes(
    state: &mut GameState,
    player_key: &str,
    distributions: Vec<CubeDistribution>,
) -> ActionResult {
    if state.game_phase != GamePhase::Setup
        && state.game_phase != GamePhase::Optimization
        && state.game_phase != GamePhase::Mutation
    {
        return ActionResult {
            valid: false,
            error: Some(format!(
                "Cannot distribute cubes in {:?} phase",
                state.game_phase
            )),
        };
    }

    let genome = match state
        .genomes
        .iter_mut()
        .find(|g| g.player_public_key == player_key)
    {
        Some(g) => g,
        None => {
            return ActionResult {
                valid: false,
                error: Some(format!("Player not found: {}", player_key)),
            }
        }
    };

    for dist in distributions {
        if let Some(attr) = dist.attribute {
            let current = genome.base_attributes.get(attr) as i32;
            let new_val = current + dist.amount;

            if new_val < 1 || new_val > 10 {
                continue;
            }
            if state.game_phase == GamePhase::Setup && new_val > 6 {
                continue;
            }
            if state.game_phase == GamePhase::Optimization && dist.amount < 0 {
                continue;
            }
            if dist.amount > 0 && genome.cube_pool < dist.amount as u32 {
                continue;
            }

            *genome.base_attributes.get_mut(attr) = new_val as u32;
            if dist.amount > 0 {
                genome.cube_pool -= dist.amount as u32;
            } else {
                genome.cube_pool += (-dist.amount) as u32;
            }
        } else if dist.amount > 0 && genome.cube_pool >= dist.amount as u32 {
            genome.cube_pool -= dist.amount as u32;
        } else if dist.amount < 0 {
            genome.cube_pool += (-dist.amount) as u32;
        }
    }

    ActionResult {
        valid: true,
        error: None,
    }
}

fn apply_all_mutations(state: &mut GameState) {
    let attr_map = AttributeType::ALL;
    state.mutation_results.clear();

    for genome in &mut state.genomes {
        let offset = get_deterministic_offset(&genome.player_public_key);
        let player_seed = state.seed.wrapping_add(state.round).wrapping_add(offset);
        let mut prng = Mulberry32::new(player_seed);

        let attr_roll = prng.roll_dice(4);
        let attr = attr_map[(attr_roll - 1) as usize];

        let mag_roll = prng.roll_dice(6);
        let magnitude = if mag_roll <= 2 {
            -1
        } else if mag_roll >= 5 {
            1
        } else {
            0
        };

        *genome.mutation_modifiers.get_mut(attr) += magnitude;

        state.mutation_results.insert(
            genome.player_public_key.clone(),
            MutationResult {
                attr,
                magnitude,
                attr_roll,
                mag_roll,
            },
        );
    }
}

fn calculate_initial_priority(state: &mut GameState) {
    let mut prng = Mulberry32::new(state.seed);
    let mut scores: Vec<(String, u64)> = state
        .players
        .iter()
        .map(|p| {
            let g = state
                .genomes
                .iter()
                .find(|g| g.player_public_key == p.public_key)
                .unwrap();
            let base_score = (g.base_attributes.nav + g.base_attributes.scn) as u64;
            let tie1 = g.base_attributes.log as u64;
            let tie2 = prng.roll_dice(6) as u64;
            let score = base_score * 10000 + tie1 * 100 + tie2;
            (p.public_key.clone(), score)
        })
        .collect();

    scores.sort_by(|a, b| b.1.cmp(&a.1));
    state.turn_order = scores.into_iter().map(|(k, _)| k).collect();
    state.priority_public_key = state.turn_order[0].clone();
    state.current_player_index = 0;
}

fn handle_confirm_phase(state: &mut GameState, player_key: &str) -> ActionResult {
    if !state.players.iter().any(|p| p.public_key == player_key) {
        return ActionResult {
            valid: false,
            error: Some(format!("Unknown player: {}", player_key)),
        };
    }

    if !state.confirmed_players.iter().any(|k| k == player_key) {
        state.confirmed_players.push(player_key.to_string());
    }

    // Optimization maintenance deduction
    if state.game_phase == GamePhase::Optimization {
        if let Some(g) = state
            .genomes
            .iter_mut()
            .find(|g| g.player_public_key == player_key)
        {
            let cost = calculate_maintenance_cost(g);
            g.raw_matter = g.raw_matter.saturating_sub(cost);
        }
    }

    let all_confirmed = state.confirmed_players.len() == state.players.len();

    if all_confirmed {
        match state.game_phase {
            GamePhase::Setup => {
                calculate_initial_priority(state);
                state.game_phase = GamePhase::Mutation;
                state.confirmed_players.clear();
                apply_all_mutations(state);
            }
            GamePhase::Mutation => {
                state.game_phase = GamePhase::Phenotype;
                state.current_player_index = 0;
                state.confirmed_players.clear();
                state.phenotype_actions.clear();
            }
            GamePhase::Environmental => {
                state.game_phase = GamePhase::Optimization;
                state.confirmed_players.clear();
            }
            GamePhase::Optimization => {
                let winners: Vec<String> = state
                    .genomes
                    .iter()
                    .filter(|g| check_win_condition(g))
                    .map(|g| g.player_public_key.clone())
                    .collect();

                if !winners.is_empty() {
                    state.winners = winners;
                    state.game_phase = GamePhase::Won;
                } else {
                    // Finalize optimization
                    for g in &mut state.genomes {
                        g.mutation_modifiers = AttributeModifiers::default();
                        g.data_clusters = g.data_clusters.min(2);
                        g.raw_matter = g.raw_matter.min(2);
                        g.temp_attribute_modifiers = AttributeModifiers::default();
                    }
                    state.last_harvest_results.clear();
                    state.phenotype_actions.clear();

                    // Advance round & priority
                    state.round += 1;
                    state.current_player_index = 0;
                    state.current_event = None;
                    state.last_event_results.clear();

                    // Priority by data spent
                    let mut spent_scores: Vec<(String, u32)> = state
                        .players
                        .iter()
                        .map(|p| {
                            let spent = *state
                                .data_spent_this_round
                                .get(&p.public_key)
                                .unwrap_or(&0);
                            (p.public_key.clone(), spent)
                        })
                        .collect();
                    spent_scores.sort_by(|a, b| b.1.cmp(&a.1));
                    let winner_key = spent_scores[0].0.clone();

                    if let Some(old_idx) = state.turn_order.iter().position(|k| *k == winner_key) {
                        let mut new_order = Vec::new();
                        new_order.extend_from_slice(&state.turn_order[old_idx..]);
                        new_order.extend_from_slice(&state.turn_order[..old_idx]);
                        state.turn_order = new_order;
                    }
                    state.priority_public_key = winner_key;
                    state.data_spent_this_round.clear();

                    // Transition to Mutation
                    state.game_phase = GamePhase::Mutation;
                    state.confirmed_players.clear();
                    apply_all_mutations(state);
                }
            }
            _ => {}
        }
    }

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_move_player(state: &mut GameState, player_key: &str, hex_id: &str) -> ActionResult {
    if state.game_phase != GamePhase::Phenotype {
        return ActionResult {
            valid: false,
            error: Some("Cannot move outside phenotype phase".into()),
        };
    }

    if state.turn_order.is_empty()
        || state.turn_order[state.current_player_index] != player_key
    {
        return ActionResult {
            valid: false,
            error: Some("Not this player's turn".into()),
        };
    }

    let piece_idx = match state
        .pieces
        .iter()
        .position(|p| p.player_public_key == player_key)
    {
        Some(i) => i,
        None => {
            return ActionResult {
                valid: false,
                error: Some("Piece not found".into()),
            }
        }
    };

    let target_hex = match state.hex_grid.iter().find(|h| h.id == hex_id).cloned() {
        Some(h) => h,
        None => {
            return ActionResult {
                valid: false,
                error: Some("Target hex not found".into()),
            }
        }
    };

    let current_hex_id = state.pieces[piece_idx].hex_id.clone();
    let current_hex = match state.hex_grid.iter().find(|h| h.id == current_hex_id) {
        Some(h) => h,
        None => {
            return ActionResult {
                valid: false,
                error: Some("Current hex not found".into()),
            }
        }
    };

    let d = get_hex_distance(current_hex.x, current_hex.y, target_hex.x, target_hex.y);
    if d != 1 {
        return ActionResult {
            valid: false,
            error: Some(format!("Invalid move distance: {}", d)),
        };
    }

    let genome_idx = state
        .genomes
        .iter()
        .position(|g| g.player_public_key == player_key)
        .unwrap();
    let genome = &state.genomes[genome_idx];

    if target_hex.hex_type == HexType::Singularity && genome.data_clusters < 10 {
        return ActionResult {
            valid: false,
            error: Some("Singularity requires 10 Data Clusters".into()),
        };
    }

    let nav = genome.effective_attribute(AttributeType::Nav).max(0) as u32;
    let actions = state
        .phenotype_actions
        .entry(player_key.to_string())
        .or_default();
    let is_double_award = target_hex.yield_res.matter > 0 && target_hex.yield_res.data > 0;
    let move_cost = if is_double_award { 2 } else { 1 };

    if actions.moves_made + move_cost > nav {
        return ActionResult {
            valid: false,
            error: Some(format!(
                "Insufficient NAV: used {}, cost {}, max {}",
                actions.moves_made, move_cost, nav
            )),
        };
    }

    // Move piece
    state.pieces[piece_idx].hex_id = hex_id.to_string();

    // Automated harvest check
    let offset = get_deterministic_offset(player_key);
    let harvest_seed = state
        .seed
        .wrapping_add(state.round)
        .wrapping_add(offset)
        .wrapping_add(actions.moves_made);
    let mut prng = Mulberry32::new(harvest_seed);

    let checks = if is_double_award {
        vec![target_hex.target_attribute[0], target_hex.target_attribute[0]]
    } else {
        target_hex.target_attribute.clone()
    };

    let mut results = Vec::new();
    let mut any_failure = false;
    let mut success_matter = false;
    let mut success_data = false;

    for (idx, attr) in checks.iter().enumerate() {
        let roll = prng.roll_dice(6);
        let magnitude = if roll <= 2 {
            -1
        } else if roll <= 4 {
            0
        } else {
            1
        };

        let attr_val = state.genomes[genome_idx].effective_attribute(*attr);
        let success = (attr_val + magnitude) >= (target_hex.threshold as i32);

        results.push(HarvestResult {
            player_public_key: player_key.to_string(),
            success,
            attribute: *attr,
            roll,
            magnitude,
        });

        if !success {
            any_failure = true;
        } else if is_double_award {
            if idx == 0 {
                success_matter = true;
            }
            if idx == 1 {
                success_data = true;
            }
        }
    }

    let mut stability_loss = 0;
    if is_double_award {
        if !success_matter {
            stability_loss += 1;
        }
        if !success_data {
            stability_loss += 1;
        }
    } else if any_failure {
        stability_loss += 1;
    }

    let g = &mut state.genomes[genome_idx];
    let passed_singularity = target_hex.hex_type == HexType::Singularity && !any_failure;
    let singularity_cost = if target_hex.hex_type == HexType::Singularity {
        10
    } else {
        0
    };

    let matter_gain = if is_double_award {
        if success_matter {
            target_hex.yield_res.matter
        } else {
            0
        }
    } else if !any_failure {
        target_hex.yield_res.matter
    } else {
        0
    };

    let data_gain = if is_double_award {
        if success_data {
            target_hex.yield_res.data
        } else {
            0
        }
    } else if !any_failure {
        target_hex.yield_res.data
    } else {
        0
    };

    g.raw_matter += matter_gain;
    g.data_clusters = (g.data_clusters + data_gain).saturating_sub(singularity_cost);
    g.stability = g.stability.saturating_sub(stability_loss);
    if passed_singularity {
        g.has_passed_singularity = true;
    }

    // Update phenotype actions
    let action_record = state
        .phenotype_actions
        .get_mut(player_key)
        .unwrap();
    action_record.moves_made += move_cost;
    action_record.harvest_done = true;

    state.last_harvest_results = results;

    // Hard Reboot check
    if state.genomes[genome_idx].stability == 0 {
        let player_idx = state
            .players
            .iter()
            .position(|p| p.public_key == player_key)
            .unwrap();
        let start_hex = STARTING_HEXES[player_idx % STARTING_HEXES.len()];
        state.pieces[piece_idx].hex_id = start_hex.to_string();

        let total_cubes = state.genomes[genome_idx].base_attributes.total()
            + state.genomes[genome_idx].cube_pool;
        let acquired = total_cubes.saturating_sub(12);
        let preserved = acquired / 2;

        let g = &mut state.genomes[genome_idx];
        g.stability = 3;
        g.data_clusters = 1;
        g.raw_matter = 0;
        g.base_attributes = BaseAttributes::default();
        g.cube_pool = 8 + preserved;
    }

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_finish_turn(state: &mut GameState, player_key: &str) -> ActionResult {
    if state.game_phase != GamePhase::Phenotype {
        return ActionResult {
            valid: false,
            error: Some("Cannot finish turn outside phenotype phase".into()),
        };
    }

    if state.turn_order.is_empty()
        || state.turn_order[state.current_player_index] != player_key
    {
        return ActionResult {
            valid: false,
            error: Some("Not this player's turn".into()),
        };
    }

    if state.current_player_index + 1 < state.turn_order.len() {
        state.current_player_index += 1;
    } else {
        // Transition to Environmental Phase
        state.game_phase = GamePhase::Environmental;
        state.confirmed_players.clear();

        // Draw event
        if state.event_deck.is_empty() {
            let mut prng = Mulberry32::new(state.seed.wrapping_add(state.round));
            let mut deck = get_initial_event_deck();
            prng.shuffle(&mut deck);
            state.event_deck = deck;
        }

        let event = state.event_deck.remove(0);
        state.current_event = Some(event);
        evaluate_environmental_fitness(state);
    }

    ActionResult {
        valid: true,
        error: None,
    }
}

fn evaluate_environmental_fitness(state: &mut GameState) {
    let event = match &state.current_event {
        Some(e) => e.clone(),
        None => return,
    };

    let mut prng = Mulberry32::new(state.seed.wrapping_add(state.round).wrapping_add(999));
    let mut event_results = HashMap::new();

    let threshold_val = match &event.threshold {
        EventThreshold::Fixed(v) => *v as i32,
        EventThreshold::AvgPlus2(_) => {
            let total_stats: i32 = state
                .genomes
                .iter()
                .map(|g| g.total_effective_stats())
                .sum();
            (total_stats / state.players.len() as i32) + 2
        }
    };

    // Global effect application
    if let Some(ref global_effect) = event.effects.global {
        apply_event_effect(state, global_effect, None, true);
    }

    // Check effect application
    if event.check_type != EventCheckType::None {
        for genome_idx in 0..state.genomes.len() {
            let roll = prng.roll_dice(6);
            let modifier = if roll <= 2 {
                -1
            } else if roll >= 5 {
                1
            } else {
                0
            };

            let pkey = state.genomes[genome_idx].player_public_key.clone();
            let fitness = match event.check_type {
                EventCheckType::Nav => state.genomes[genome_idx].effective_attribute(AttributeType::Nav),
                EventCheckType::Log => state.genomes[genome_idx].effective_attribute(AttributeType::Log),
                EventCheckType::Def => state.genomes[genome_idx].effective_attribute(AttributeType::Def),
                EventCheckType::Scn => state.genomes[genome_idx].effective_attribute(AttributeType::Scn),
                EventCheckType::TotalSum => state.genomes[genome_idx].total_effective_stats(),
                EventCheckType::None => 0,
            };

            let success = (fitness + modifier) >= threshold_val;
            event_results.insert(
                pkey.clone(),
                EventResult {
                    roll,
                    modifier,
                    success,
                },
            );

            if success {
                if let Some(ref eff) = event.effects.on_success {
                    apply_event_effect(state, eff, Some(&pkey), true);
                }
            } else if let Some(ref eff) = event.effects.on_failure {
                apply_event_effect(state, eff, Some(&pkey), false);
            }
        }
    }

    state.last_event_results = event_results;
}

fn apply_event_effect(
    state: &mut GameState,
    effect: &EventEffect,
    trigger_player: Option<&str>,
    _success: bool,
) {
    let target_keys = get_target_player_keys(state, effect.target.as_deref(), trigger_player);

    for key in target_keys {
        if let Some(g) = state.genomes.iter_mut().find(|g| g.player_public_key == key) {
            let amount = effect.amount.unwrap_or(0);
            match effect.effect_type {
                EffectKind::Stability => {
                    g.stability = g.stability.saturating_sub(amount as u32);
                }
                EffectKind::Data => {
                    if let Some(ref details) = effect.details {
                        if details.get("fraction").and_then(|v| v.as_bool()).unwrap_or(false) {
                            g.data_clusters /= 2;
                        } else {
                            g.data_clusters = g.data_clusters.saturating_sub(amount as u32);
                        }
                    } else {
                        g.data_clusters = g.data_clusters.saturating_sub(amount as u32);
                    }
                }
                EffectKind::Matter => {
                    if g.raw_matter >= amount as u32 {
                        g.raw_matter -= amount as u32;
                    } else if let Some(ref details) = effect.details {
                        if details.get("fallback").and_then(|v| v.as_str()) == Some("stability") {
                            g.stability = g.stability.saturating_sub(1);
                        }
                    }
                }
                EffectKind::StatModTemp => {
                    if let Some(attr) = effect.attribute {
                        *g.temp_attribute_modifiers.get_mut(attr) += amount;
                    } else {
                        for attr in AttributeType::ALL {
                            *g.temp_attribute_modifiers.get_mut(attr) += amount;
                        }
                    }
                }
                EffectKind::StatModPerm => {
                    let mut highest_attr = AttributeType::Nav;
                    let mut max_val = 0;
                    for attr in AttributeType::ALL {
                        let val = g.base_attributes.get(attr);
                        if val > max_val {
                            max_val = val;
                            highest_attr = attr;
                        }
                    }
                    let current = g.base_attributes.get(highest_attr);
                    *g.base_attributes.get_mut(highest_attr) = (current as i32 + amount).max(1) as u32;
                }
                EffectKind::GainInsight => {
                    g.insight_tokens += amount as u32;
                }
                EffectKind::HardReboot => {
                    let player_idx = state
                        .players
                        .iter()
                        .position(|p| p.public_key == key)
                        .unwrap();
                    let start_hex = STARTING_HEXES[player_idx % STARTING_HEXES.len()];
                    if let Some(p) = state.pieces.iter_mut().find(|p| p.player_public_key == key) {
                        p.hex_id = start_hex.to_string();
                    }
                    let total_cubes = g.base_attributes.total() + g.cube_pool;
                    let acquired = total_cubes.saturating_sub(12);
                    let preserved = acquired / 2;

                    g.stability = 3;
                    g.data_clusters = 1;
                    g.raw_matter = 0;
                    g.base_attributes = BaseAttributes::default();
                    g.cube_pool = 8 + preserved;
                }
                _ => {}
            }

            // Stability failure check
            if g.stability == 0 {
                let player_idx = state
                    .players
                    .iter()
                    .position(|p| p.public_key == key)
                    .unwrap();
                let start_hex = STARTING_HEXES[player_idx % STARTING_HEXES.len()];
                if let Some(p) = state.pieces.iter_mut().find(|p| p.player_public_key == key) {
                    p.hex_id = start_hex.to_string();
                }
                let total_cubes = g.base_attributes.total() + g.cube_pool;
                let acquired = total_cubes.saturating_sub(12);
                let preserved = acquired / 2;

                g.stability = 3;
                g.data_clusters = 1;
                g.raw_matter = 0;
                g.base_attributes = BaseAttributes::default();
                g.cube_pool = 8 + preserved;
            }
        }
    }
}

fn get_target_player_keys(
    state: &GameState,
    target: Option<&str>,
    trigger: Option<&str>,
) -> Vec<String> {
    match target {
        None | Some("self") => trigger.map(|t| vec![t.to_string()]).unwrap_or_else(|| {
            state.players.iter().map(|p| p.public_key.clone()).collect()
        }),
        Some("all") => state.players.iter().map(|p| p.public_key.clone()).collect(),
        Some("priority") => vec![state.priority_public_key.clone()],
        Some("lowest_sum") => {
            let mut sorted = state.genomes.clone();
            sorted.sort_by_key(|g| g.total_effective_stats());
            sorted.first().map(|g| vec![g.player_public_key.clone()]).unwrap_or_default()
        }
        Some("highest_sum") => {
            let mut sorted = state.genomes.clone();
            sorted.sort_by_key(|g| std::cmp::Reverse(g.total_effective_stats()));
            sorted.first().map(|g| vec![g.player_public_key.clone()]).unwrap_or_default()
        }
        Some("most_data") => {
            let mut sorted = state.genomes.clone();
            sorted.sort_by_key(|g| std::cmp::Reverse(g.data_clusters));
            sorted.first().map(|g| vec![g.player_public_key.clone()]).unwrap_or_default()
        }
        Some("most_matter") => {
            let mut sorted = state.genomes.clone();
            sorted.sort_by_key(|g| std::cmp::Reverse(g.raw_matter));
            sorted.first().map(|g| vec![g.player_public_key.clone()]).unwrap_or_default()
        }
        Some("highest_stat") => {
            let mut sorted = state.genomes.clone();
            sorted.sort_by_key(|g| {
                let max_stat = AttributeType::ALL
                    .iter()
                    .map(|&a| g.base_attributes.get(a))
                    .max()
                    .unwrap_or(0);
                std::cmp::Reverse(max_stat)
            });
            sorted.first().map(|g| vec![g.player_public_key.clone()]).unwrap_or_default()
        }
        Some("sum_26_plus") => state
            .genomes
            .iter()
            .filter(|g| g.total_effective_stats() >= 26)
            .map(|g| g.player_public_key.clone())
            .collect(),
        Some("stat_8_plus") => state
            .genomes
            .iter()
            .filter(|g| {
                AttributeType::ALL
                    .iter()
                    .any(|&a| g.base_attributes.get(a) >= 8)
            })
            .map(|g| g.player_public_key.clone())
            .collect(),
        _ => Vec::new(),
    }
}

fn handle_optimize_data(state: &mut GameState, player_key: &str) -> ActionResult {
    if state.game_phase != GamePhase::Optimization {
        return ActionResult {
            valid: false,
            error: Some("Cannot optimize data outside optimization phase".into()),
        };
    }

    if state.confirmed_players.iter().any(|k| k == player_key) {
        return ActionResult {
            valid: false,
            error: Some("Already confirmed phase".into()),
        };
    }

    let g = match state.genomes.iter_mut().find(|g| g.player_public_key == player_key) {
        Some(g) => g,
        None => {
            return ActionResult {
                valid: false,
                error: Some("Player not found".into()),
            }
        }
    };

    if g.data_clusters < 3 {
        return ActionResult {
            valid: false,
            error: Some(format!(
                "Need 3 Data Clusters to optimize, have {}",
                g.data_clusters
            )),
        };
    }

    g.data_clusters -= 3;
    g.cube_pool += 1;
    *state.data_spent_this_round.entry(player_key.to_string()).or_default() += 3;

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_prune_attribute(
    state: &mut GameState,
    player_key: &str,
    attribute: AttributeType,
) -> ActionResult {
    if state.game_phase != GamePhase::Optimization {
        return ActionResult {
            valid: false,
            error: Some("Cannot prune attributes outside optimization phase".into()),
        };
    }

    if state.confirmed_players.iter().any(|k| k == player_key) {
        return ActionResult {
            valid: false,
            error: Some("Already confirmed phase".into()),
        };
    }

    let g = match state.genomes.iter_mut().find(|g| g.player_public_key == player_key) {
        Some(g) => g,
        None => {
            return ActionResult {
                valid: false,
                error: Some("Player not found".into()),
            }
        }
    };

    let current = g.base_attributes.get(attribute);
    if current <= 1 {
        return ActionResult {
            valid: false,
            error: Some(format!("Attribute {:?} is already at minimum (1)", attribute)),
        };
    }

    *g.base_attributes.get_mut(attribute) -= 1;
    g.raw_matter += 2;

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_force_event(state: &mut GameState, event_id: &str) -> ActionResult {
    let all_events = get_initial_event_deck();
    let target_event = match all_events.into_iter().find(|e| e.id == event_id) {
        Some(e) => e,
        None => {
            return ActionResult {
                valid: false,
                error: Some(format!("Event {} not found", event_id)),
            }
        }
    };

    state.current_event = Some(target_event);
    state.game_phase = GamePhase::Environmental;
    evaluate_environmental_fitness(state);

    ActionResult {
        valid: true,
        error: None,
    }
}

fn handle_reset(state: &mut GameState) -> ActionResult {
    let players = state.players.clone();
    let seed = state.seed;
    handle_start_game(state, Some(seed), players)
}

pub fn get_valid_actions_list(state: &GameState) -> Vec<ValidAction> {
    let mut actions = Vec::new();

    match state.game_phase {
        GamePhase::Waiting => {
            actions.push(ValidAction {
                action_type: "START_GAME".into(),
                description: "Start the simulation with connected players".into(),
            });
        }
        GamePhase::Setup => {
            actions.push(ValidAction {
                action_type: "DISTRIBUTE_CUBES".into(),
                description: "Distribute attribute cubes from pool".into(),
            });
            actions.push(ValidAction {
                action_type: "CONFIRM_PHASE".into(),
                description: "Confirm initial genome configuration".into(),
            });
        }
        GamePhase::Mutation => {
            actions.push(ValidAction {
                action_type: "CONFIRM_PHASE".into(),
                description: "Acknowledge stochastic mutations".into(),
            });
        }
        GamePhase::Phenotype => {
            actions.push(ValidAction {
                action_type: "MOVE_PLAYER".into(),
                description: "Navigate to adjacent sector and harvest resources".into(),
            });
            actions.push(ValidAction {
                action_type: "FINISH_TURN".into(),
                description: "Conclude active phenotype cycle".into(),
            });
        }
        GamePhase::Environmental => {
            actions.push(ValidAction {
                action_type: "CONFIRM_PHASE".into(),
                description: "Acknowledge environmental selection consequences".into(),
            });
        }
        GamePhase::Competitive => {
            actions.push(ValidAction {
                action_type: "CONFIRM_PHASE".into(),
                description: "Advance to optimization".into(),
            });
        }
        GamePhase::Optimization => {
            actions.push(ValidAction {
                action_type: "OPTIMIZE_DATA".into(),
                description: "Spend 3 Data Clusters to acquire 1 Cube".into(),
            });
            actions.push(ValidAction {
                action_type: "PRUNE_ATTRIBUTE".into(),
                description: "Downclock 1 base attribute to gain 2 Matter".into(),
            });
            actions.push(ValidAction {
                action_type: "DISTRIBUTE_CUBES".into(),
                description: "Allocate cubes gained from optimization".into(),
            });
            actions.push(ValidAction {
                action_type: "CONFIRM_PHASE".into(),
                description: "Pay metabolic maintenance and finalize round".into(),
            });
        }
        GamePhase::Won => {
            actions.push(ValidAction {
                action_type: "RESET".into(),
                description: "Reset simulation to new cycle".into(),
            });
        }
    }

    actions
}
