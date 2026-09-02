use crate::prng::Mulberry32;
use crate::types::{AttributeType, HexCell, HexType, HexYield};

pub fn get_hex_distance(q1: i32, r1: i32, q2: i32, r2: i32) -> u32 {
    let dq = (q1 - q2).abs();
    let dqr = (q1 + r1 - q2 - r2).abs();
    let dr = (r1 - r2).abs();
    ((dq + dqr + dr) / 2) as u32
}

pub fn create_hex_grid(seed: u32) -> Vec<HexCell> {
    let mut hexes = Vec::new();
    let max_radius: i32 = 4;
    let mut prng = Mulberry32::new(seed);

    let mut tier3_dist = vec![
        HexType::Supernova,
        HexType::PulsarArchive,
        HexType::GravityWell,
        HexType::CoreDatabase,
        HexType::SingularityShard,
        HexType::SingularityShard,
    ];

    let mut tier2_dist = vec![
        HexType::SolarFlare,
        HexType::SolarFlare,
        HexType::DeepBuoy,
        HexType::DeepBuoy,
        HexType::IonCloud,
        HexType::IonCloud,
        HexType::SystemCache,
        HexType::SystemCache,
        HexType::EncryptedRelay,
        HexType::EncryptedRelay,
        HexType::EncryptedRelay,
        HexType::EncryptedRelay,
    ];

    let mut tier1_dist = vec![
        HexType::ScrapHeap,
        HexType::ScrapHeap,
        HexType::ScrapHeap,
        HexType::SignalPing,
        HexType::SignalPing,
        HexType::SignalPing,
        HexType::GravityEddy,
        HexType::GravityEddy,
        HexType::GravityEddy,
        HexType::LogicFragment,
        HexType::LogicFragment,
        HexType::LogicFragment,
        HexType::DataCluster,
        HexType::DataCluster,
        HexType::DataCluster,
        HexType::DataCluster,
        HexType::DataCluster,
        HexType::DataCluster,
    ];

    prng.shuffle(&mut tier3_dist);
    prng.shuffle(&mut tier2_dist);
    prng.shuffle(&mut tier1_dist);

    let mut i3 = 0;
    let mut i2 = 0;
    let mut i1 = 0;

    for q in -max_radius..=max_radius {
        let r_min = (-max_radius).max(-q - max_radius);
        let r_max = max_radius.min(-q + max_radius);

        for r in r_min..=r_max {
            let distance = q.abs().max(r.abs()).max((-q - r).abs());
            let id = format!("H-{}-{}", q, r);

            let mut hex_type = HexType::ScrapHeap;
            let mut threshold = 0;
            let mut yield_res = HexYield { matter: 0, data: 0 };
            let mut target_attr = vec![AttributeType::Def];

            if distance == 0 {
                hex_type = HexType::Singularity;
                threshold = 8;
                yield_res = HexYield { matter: 0, data: 0 };
                target_attr = vec![AttributeType::Log, AttributeType::Scn];
            } else if distance == 1 {
                hex_type = tier3_dist[i3];
                i3 += 1;
                threshold = 6;
                match hex_type {
                    HexType::Supernova => {
                        target_attr = vec![AttributeType::Def];
                        yield_res = HexYield { matter: 4, data: 0 };
                    }
                    HexType::PulsarArchive => {
                        target_attr = vec![AttributeType::Scn];
                        yield_res = HexYield { matter: 0, data: 4 };
                    }
                    HexType::GravityWell => {
                        target_attr = vec![AttributeType::Nav];
                        yield_res = HexYield { matter: 4, data: 0 };
                    }
                    HexType::CoreDatabase => {
                        target_attr = vec![AttributeType::Log];
                        yield_res = HexYield { matter: 0, data: 4 };
                    }
                    HexType::SingularityShard => {
                        target_attr = vec![
                            AttributeType::Nav,
                            AttributeType::Log,
                            AttributeType::Def,
                            AttributeType::Scn,
                        ];
                        yield_res = HexYield { matter: 4, data: 4 };
                    }
                    _ => {}
                }
            } else if distance == 2 {
                hex_type = tier2_dist[i2];
                i2 += 1;
                threshold = 4;
                match hex_type {
                    HexType::SolarFlare => {
                        target_attr = vec![AttributeType::Def];
                        yield_res = HexYield { matter: 2, data: 0 };
                    }
                    HexType::DeepBuoy => {
                        target_attr = vec![AttributeType::Scn];
                        yield_res = HexYield { matter: 0, data: 2 };
                    }
                    HexType::IonCloud => {
                        target_attr = vec![AttributeType::Nav];
                        yield_res = HexYield { matter: 2, data: 0 };
                    }
                    HexType::SystemCache => {
                        target_attr = vec![AttributeType::Log];
                        yield_res = HexYield { matter: 0, data: 2 };
                    }
                    HexType::EncryptedRelay => {
                        target_attr = vec![AttributeType::Log, AttributeType::Nav];
                        yield_res = HexYield { matter: 2, data: 2 };
                    }
                    _ => {}
                }
            } else if distance == 3 {
                hex_type = tier1_dist[i1];
                i1 += 1;
                threshold = 2;
                match hex_type {
                    HexType::ScrapHeap => {
                        target_attr = vec![AttributeType::Def];
                        yield_res = HexYield { matter: 1, data: 0 };
                    }
                    HexType::SignalPing => {
                        target_attr = vec![AttributeType::Scn];
                        yield_res = HexYield { matter: 0, data: 1 };
                    }
                    HexType::GravityEddy => {
                        target_attr = vec![AttributeType::Nav];
                        yield_res = HexYield { matter: 1, data: 0 };
                    }
                    HexType::LogicFragment => {
                        target_attr = vec![AttributeType::Log];
                        yield_res = HexYield { matter: 0, data: 1 };
                    }
                    HexType::DataCluster => {
                        target_attr = vec![AttributeType::Log];
                        yield_res = HexYield { matter: 1, data: 1 };
                    }
                    _ => {}
                }
            } else if distance == 4 {
                let is_home = (q == 4 && r == -2)
                    || (q == -2 && r == 4)
                    || (q == -4 && r == 2)
                    || (q == 2 && r == -4);
                if is_home {
                    hex_type = HexType::HomeNebula;
                    threshold = 0;
                    yield_res = HexYield { matter: 0, data: 0 };
                    target_attr = vec![AttributeType::Def];
                } else {
                    continue;
                }
            }

            hexes.push(HexCell {
                id,
                hex_type,
                threshold,
                yield_res,
                target_attribute: target_attr,
                x: q,
                y: r,
            });
        }
    }

    hexes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grid_count_and_home_positions() {
        let grid = create_hex_grid(12345);
        assert_eq!(grid.len(), 41);
        let homes: Vec<&HexCell> = grid.iter().filter(|h| h.hex_type == HexType::HomeNebula).collect();
        assert_eq!(homes.len(), 4);
    }

    #[test]
    fn test_distance_calculation() {
        assert_eq!(get_hex_distance(0, 0, 1, 0), 1);
        assert_eq!(get_hex_distance(0, 0, 0, 1), 1);
        assert_eq!(get_hex_distance(0, 0, 1, -1), 1);
        assert_eq!(get_hex_distance(0, 0, 2, 0), 2);
    }
}
