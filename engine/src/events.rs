use crate::types::{
    EffectKind, EnvironmentalEvent, EventCardType, EventCheckType, EventEffect,
    EventEffects, EventThreshold,
};

pub fn get_initial_event_deck() -> Vec<EnvironmentalEvent> {
    vec![
        // HAZARDS
        EnvironmentalEvent {
            id: "hazard-1".into(),
            card_type: EventCardType::Hazard,
            name: "Solar Flare".into(),
            description: "Intense solar radiation testing hull integrity.".into(),
            check_type: EventCheckType::Def,
            threshold: EventThreshold::Fixed(4),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Stability,
                    amount: Some(1),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "hazard-2".into(),
            card_type: EventCardType::Hazard,
            name: "Logic Plague".into(),
            description: "Viral code fragments disrupting systems.".into(),
            check_type: EventCheckType::Log,
            threshold: EventThreshold::Fixed(5),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::StatModTemp,
                    amount: Some(-1),
                    attribute: None, // None = all attributes
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "hazard-3".into(),
            card_type: EventCardType::Hazard,
            name: "Ion Storm".into(),
            description: "Electromagnetic interference causing displacement.".into(),
            check_type: EventCheckType::Nav,
            threshold: EventThreshold::Fixed(3),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Displacement,
                    amount: Some(2),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "hazard-4".into(),
            card_type: EventCardType::Hazard,
            name: "Data Leak".into(),
            description: "Signal interference purging data clusters.".into(),
            check_type: EventCheckType::Scn,
            threshold: EventThreshold::Fixed(4),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Data,
                    amount: Some(2),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "hazard-5".into(),
            card_type: EventCardType::Hazard,
            name: "Gravity Well".into(),
            description: "Sudden gravitational pull increasing effort.".into(),
            check_type: EventCheckType::Nav,
            threshold: EventThreshold::Fixed(5),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::MovementCost,
                    amount: Some(2),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        // PRESSURE
        EnvironmentalEvent {
            id: "pressure-1".into(),
            card_type: EventCardType::Pressure,
            name: "The Great Filter".into(),
            description: "Universal threshold check.".into(),
            check_type: EventCheckType::TotalSum,
            threshold: EventThreshold::AvgPlus2("AVG+2".into()),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::HardReboot,
                    amount: None,
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "pressure-2".into(),
            card_type: EventCardType::Pressure,
            name: "Weight Decay".into(),
            description: "Entropic decay of optimized systems.".into(),
            check_type: EventCheckType::None,
            threshold: EventThreshold::Fixed(0),
            effects: EventEffects {
                global: Some(EventEffect {
                    effect_type: EffectKind::StatModPerm,
                    amount: Some(-1),
                    attribute: None,
                    target: Some("highest_stat".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "pressure-3".into(),
            card_type: EventCardType::Pressure,
            name: "System Heat".into(),
            description: "Overheating components require matter or stability.".into(),
            check_type: EventCheckType::Def,
            threshold: EventThreshold::Fixed(5),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Matter,
                    amount: Some(1),
                    attribute: None,
                    target: Some("self".into()),
                    details: Some(serde_json::json!({ "fallback": "stability" })),
                }),
                ..Default::default()
            },
        },
        // SHIFT
        EnvironmentalEvent {
            id: "shift-1".into(),
            card_type: EventCardType::Shift,
            name: "Grid Re-Sync".into(),
            description: "Spatial recalibration.".into(),
            check_type: EventCheckType::None,
            threshold: EventThreshold::Fixed(0),
            effects: EventEffects {
                global: Some(EventEffect {
                    effect_type: EffectKind::MapShift,
                    amount: None,
                    attribute: None,
                    target: Some("priority".into()),
                    details: Some(serde_json::json!({ "action": "swap_adjacent_t2_t3" })),
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "shift-2".into(),
            card_type: EventCardType::Shift,
            name: "Space Fold".into(),
            description: "Brief window for efficient travel.".into(),
            check_type: EventCheckType::Nav,
            threshold: EventThreshold::Fixed(6),
            effects: EventEffects {
                on_success: Some(EventEffect {
                    effect_type: EffectKind::Displacement,
                    amount: Some(1),
                    attribute: None,
                    target: Some("self".into()),
                    details: Some(serde_json::json!({ "free": true })),
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "shift-3".into(),
            card_type: EventCardType::Shift,
            name: "Core Drift".into(),
            description: "The singularity shifts.".into(),
            check_type: EventCheckType::None,
            threshold: EventThreshold::Fixed(0),
            effects: EventEffects {
                global: Some(EventEffect {
                    effect_type: EffectKind::MapShift,
                    amount: None,
                    attribute: None,
                    target: Some("lowest_sum".into()),
                    details: Some(serde_json::json!({ "action": "move_singularity_toward" })),
                }),
                ..Default::default()
            },
        },
        // APEX LEAD
        EnvironmentalEvent {
            id: "apex-1".into(),
            card_type: EventCardType::ApexLead,
            name: "Thermal Throttle".into(),
            description: "Safety protocols for high-power systems.".into(),
            check_type: EventCheckType::Def,
            threshold: EventThreshold::Fixed(6),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Stability,
                    amount: Some(2),
                    attribute: None,
                    target: Some("sum_26_plus".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "apex-2".into(),
            card_type: EventCardType::ApexLead,
            name: "Data Corruption".into(),
            description: "High-density storage interference.".into(),
            check_type: EventCheckType::Log,
            threshold: EventThreshold::Fixed(5),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Data,
                    amount: None,
                    attribute: None,
                    target: Some("most_data".into()),
                    details: Some(serde_json::json!({ "fraction": true })),
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "apex-3".into(),
            card_type: EventCardType::ApexLead,
            name: "Resource Leach".into(),
            description: "Subtle energy drain on matter reserves.".into(),
            check_type: EventCheckType::Scn,
            threshold: EventThreshold::Fixed(5),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Matter,
                    amount: Some(3),
                    attribute: None,
                    target: Some("most_matter".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "apex-4".into(),
            card_type: EventCardType::ApexLead,
            name: "System Bloat".into(),
            description: "Inefficient allocation of top resources.".into(),
            check_type: EventCheckType::Log,
            threshold: EventThreshold::Fixed(6),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::StatModPerm,
                    amount: Some(-1),
                    attribute: None,
                    target: Some("highest_stat".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "apex-5".into(),
            card_type: EventCardType::ApexLead,
            name: "Parasitic Drift".into(),
            description: "Siphoning data to weaker frames.".into(),
            check_type: EventCheckType::None,
            threshold: EventThreshold::Fixed(0),
            effects: EventEffects {
                global: Some(EventEffect {
                    effect_type: EffectKind::Transfer,
                    amount: Some(1),
                    attribute: None,
                    target: Some("priority".into()),
                    details: Some(serde_json::json!({
                        "from": "highest_sum",
                        "to": "lowest_sum",
                        "resource": "data"
                    })),
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "apex-6".into(),
            card_type: EventCardType::ApexLead,
            name: "Overfit Fragile".into(),
            description: "Strained hulls from extreme specialization.".into(),
            check_type: EventCheckType::Nav,
            threshold: EventThreshold::Fixed(4),
            effects: EventEffects {
                on_failure: Some(EventEffect {
                    effect_type: EffectKind::Stability,
                    amount: Some(1),
                    attribute: None,
                    target: Some("stat_8_plus".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        // BONUS
        EnvironmentalEvent {
            id: "bonus-1".into(),
            card_type: EventCardType::Bonus,
            name: "Deep Scan".into(),
            description: "Opportunity for extra data harvest.".into(),
            check_type: EventCheckType::Scn,
            threshold: EventThreshold::Fixed(6),
            effects: EventEffects {
                on_success: Some(EventEffect {
                    effect_type: EffectKind::Data,
                    amount: Some(1),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "bonus-2".into(),
            card_type: EventCardType::Bonus,
            name: "Matter Vacuum".into(),
            description: "Universal resource drain.".into(),
            check_type: EventCheckType::None,
            threshold: EventThreshold::Fixed(0),
            effects: EventEffects {
                global: Some(EventEffect {
                    effect_type: EffectKind::Matter,
                    amount: Some(1),
                    attribute: None,
                    target: Some("all".into()),
                    details: Some(serde_json::json!({ "fallback": "stability" })),
                }),
                ..Default::default()
            },
        },
        EnvironmentalEvent {
            id: "bonus-3".into(),
            card_type: EventCardType::Bonus,
            name: "Model Sync".into(),
            description: "Perfect alignment of internal models.".into(),
            check_type: EventCheckType::Log,
            threshold: EventThreshold::Fixed(4),
            effects: EventEffects {
                on_success: Some(EventEffect {
                    effect_type: EffectKind::GainInsight,
                    amount: Some(1),
                    attribute: None,
                    target: Some("self".into()),
                    details: None,
                }),
                ..Default::default()
            },
        },
    ]
}
