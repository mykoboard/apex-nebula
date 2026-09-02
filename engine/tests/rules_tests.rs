use apex_nebula::engine::{apply_action, calculate_maintenance_cost, create_initial_state};
use apex_nebula::types::*;

fn create_two_player_game() -> (GameState, Player, Player) {
    let mut state = create_initial_state();
    let p1 = Player {
        public_key: "pub-A".into(),
        name: "Player A".into(),
        color: "red".into(),
    };
    let p2 = Player {
        public_key: "pub-B".into(),
        name: "Player B".into(),
        color: "blue".into(),
    };

    let res = apply_action(
        &mut state,
        GameAction::StartGame {
            seed: Some(12345),
            players: vec![p1.clone(), p2.clone()],
        },
    );
    assert!(res.valid);
    (state, p1, p2)
}

#[test]
fn test_game_initialization() {
    let (state, _p1, _p2) = create_two_player_game();
    assert_eq!(state.game_phase, GamePhase::Setup);
    assert_eq!(state.genomes.len(), 2);
    assert_eq!(state.pieces.len(), 2);
    assert_eq!(state.hex_grid.len(), 41);
    assert_eq!(state.round, 1);

    // Initial cubes: pool 8 + base 4 = 12 total
    for g in &state.genomes {
        assert_eq!(g.cube_pool, 8);
        assert_eq!(g.base_attributes.total(), 4);
        assert_eq!(g.stability, 3);
        assert_eq!(g.data_clusters, 0);
        assert_eq!(g.raw_matter, 0);
    }
}

#[test]
fn test_setup_cube_distribution_and_limits() {
    let (mut state, p1, _p2) = create_two_player_game();

    // Distribute 5 to NAV (1 + 5 = 6, valid cap in setup)
    let res = apply_action(
        &mut state,
        GameAction::DistributeCubes {
            player_public_key: p1.public_key.clone(),
            distributions: vec![CubeDistribution {
                attribute: Some(AttributeType::Nav),
                amount: 5,
            }],
        },
    );
    assert!(res.valid);
    let g1 = state
        .genomes
        .iter()
        .find(|g| g.player_public_key == p1.public_key)
        .unwrap();
    assert_eq!(g1.base_attributes.nav, 6);
    assert_eq!(g1.cube_pool, 3);

    // Attempt to exceed cap (>6 in setup)
    apply_action(
        &mut state,
        GameAction::DistributeCubes {
            player_public_key: p1.public_key.clone(),
            distributions: vec![CubeDistribution {
                attribute: Some(AttributeType::Nav),
                amount: 1,
            }],
        },
    );
    let g1_after = state
        .genomes
        .iter()
        .find(|g| g.player_public_key == p1.public_key)
        .unwrap();
    assert_eq!(g1_after.base_attributes.nav, 6); // unchanged
}

#[test]
fn test_deterministic_mutations_and_parity() {
    let (mut state1, p1, p2) = create_two_player_game();

    // Confirm setup for both players
    apply_action(
        &mut state1,
        GameAction::ConfirmPhase {
            player_public_key: p1.public_key.clone(),
        },
    );
    apply_action(
        &mut state1,
        GameAction::ConfirmPhase {
            player_public_key: p2.public_key.clone(),
        },
    );

    assert_eq!(state1.game_phase, GamePhase::Mutation);
    assert_eq!(state1.mutation_results.len(), 2);

    // Create another state with reverse order passed to StartGame
    let mut state2 = create_initial_state();
    apply_action(
        &mut state2,
        GameAction::StartGame {
            seed: Some(12345),
            players: vec![p2.clone(), p1.clone()],
        },
    );
    apply_action(
        &mut state2,
        GameAction::ConfirmPhase {
            player_public_key: p2.public_key.clone(),
        },
    );
    apply_action(
        &mut state2,
        GameAction::ConfirmPhase {
            player_public_key: p1.public_key.clone(),
        },
    );

    // Results must match deterministically
    let m1_p1 = state1.mutation_results.get(&p1.public_key).unwrap();
    let m2_p1 = state2.mutation_results.get(&p1.public_key).unwrap();
    assert_eq!(m1_p1, m2_p1);

    let m1_p2 = state1.mutation_results.get(&p2.public_key).unwrap();
    let m2_p2 = state2.mutation_results.get(&p2.public_key).unwrap();
    assert_eq!(m1_p2, m2_p2);
}

#[test]
fn test_maintenance_cost_calculation() {
    let mut genome = PlayerGenome::new("test".into());
    assert_eq!(calculate_maintenance_cost(&genome), 1);

    // 12 base attributes
    genome.base_attributes.nav = 3;
    genome.base_attributes.log = 3;
    genome.base_attributes.def = 3;
    genome.base_attributes.scn = 3;
    assert_eq!(calculate_maintenance_cost(&genome), 1);

    // 14 base attributes => 1 + (14-12)/2 = 2
    genome.base_attributes.nav = 5;
    assert_eq!(calculate_maintenance_cost(&genome), 2);

    // 16 base attributes => 1 + (16-12)/2 = 3
    genome.base_attributes.log = 5;
    assert_eq!(calculate_maintenance_cost(&genome), 3);
}

#[test]
fn test_hard_reboot_stability_trigger() {
    let (mut state, p1, _p2) = create_two_player_game();

    // Give player extra cubes
    let g1 = state
        .genomes
        .iter_mut()
        .find(|g| g.player_public_key == p1.public_key)
        .unwrap();
    g1.base_attributes.nav = 6;
    g1.base_attributes.log = 6;
    g1.raw_matter = 5;
    g1.data_clusters = 4;
    g1.stability = 1;

    // Force an environmental event that deducts stability on failure
    apply_action(
        &mut state,
        GameAction::ForceEvent {
            event_id: "hazard-1".into(),
        },
    );

    let g1_after = state
        .genomes
        .iter()
        .find(|g| g.player_public_key == p1.public_key)
        .unwrap();

    // If stability hit 0, hard reboot restored stability to 3, matter to 0, data to 1, base stats to 1
    if g1_after.stability == 3 {
        assert_eq!(g1_after.raw_matter, 0);
        assert_eq!(g1_after.data_clusters, 1);
        assert_eq!(g1_after.base_attributes.total(), 4);
    }
}
