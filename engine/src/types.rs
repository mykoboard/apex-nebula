use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AttributeType {
    #[serde(rename = "NAV")]
    Nav,
    #[serde(rename = "LOG")]
    Log,
    #[serde(rename = "DEF")]
    Def,
    #[serde(rename = "SCN")]
    Scn,
}

impl AttributeType {
    pub const ALL: [AttributeType; 4] = [
        AttributeType::Nav,
        AttributeType::Log,
        AttributeType::Def,
        AttributeType::Scn,
    ];
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum HexType {
    HomeNebula,
    ScrapHeap,
    SignalPing,
    GravityEddy,
    LogicFragment,
    DataCluster,
    SolarFlare,
    DeepBuoy,
    IonCloud,
    SystemCache,
    EncryptedRelay,
    Supernova,
    PulsarArchive,
    GravityWell,
    CoreDatabase,
    SingularityShard,
    Singularity,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HexYield {
    pub matter: u32,
    pub data: u32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HexCell {
    pub id: String,
    #[serde(rename = "type")]
    pub hex_type: HexType,
    pub threshold: u32,
    #[serde(rename = "yield")]
    pub yield_res: HexYield,
    #[serde(rename = "targetAttribute")]
    pub target_attribute: Vec<AttributeType>,
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BaseAttributes {
    #[serde(rename = "NAV")]
    pub nav: u32,
    #[serde(rename = "LOG")]
    pub log: u32,
    #[serde(rename = "DEF")]
    pub def: u32,
    #[serde(rename = "SCN")]
    pub scn: u32,
}

impl Default for BaseAttributes {
    fn default() -> Self {
        Self {
            nav: 1,
            log: 1,
            def: 1,
            scn: 1,
        }
    }
}

impl BaseAttributes {
    pub fn get(&self, attr: AttributeType) -> u32 {
        match attr {
            AttributeType::Nav => self.nav,
            AttributeType::Log => self.log,
            AttributeType::Def => self.def,
            AttributeType::Scn => self.scn,
        }
    }

    pub fn get_mut(&mut self, attr: AttributeType) -> &mut u32 {
        match attr {
            AttributeType::Nav => &mut self.nav,
            AttributeType::Log => &mut self.log,
            AttributeType::Def => &mut self.def,
            AttributeType::Scn => &mut self.scn,
        }
    }

    pub fn total(&self) -> u32 {
        self.nav + self.log + self.def + self.scn
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct AttributeModifiers {
    #[serde(rename = "NAV")]
    pub nav: i32,
    #[serde(rename = "LOG")]
    pub log: i32,
    #[serde(rename = "DEF")]
    pub def: i32,
    #[serde(rename = "SCN")]
    pub scn: i32,
}

impl AttributeModifiers {
    pub fn get(&self, attr: AttributeType) -> i32 {
        match attr {
            AttributeType::Nav => self.nav,
            AttributeType::Log => self.log,
            AttributeType::Def => self.def,
            AttributeType::Scn => self.scn,
        }
    }

    pub fn get_mut(&mut self, attr: AttributeType) -> &mut i32 {
        match attr {
            AttributeType::Nav => &mut self.nav,
            AttributeType::Log => &mut self.log,
            AttributeType::Def => &mut self.def,
            AttributeType::Scn => &mut self.scn,
        }
    }

    pub fn total(&self) -> i32 {
        self.nav + self.log + self.def + self.scn
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlayerGenome {
    #[serde(rename = "playerPublicKey")]
    pub player_public_key: String,
    pub stability: u32,
    #[serde(rename = "dataClusters")]
    pub data_clusters: u32,
    #[serde(rename = "rawMatter")]
    pub raw_matter: u32,
    #[serde(rename = "insightTokens")]
    pub insight_tokens: u32,
    #[serde(rename = "lockedSlots")]
    pub locked_slots: Vec<u32>,
    #[serde(rename = "baseAttributes")]
    pub base_attributes: BaseAttributes,
    #[serde(rename = "mutationModifiers")]
    pub mutation_modifiers: AttributeModifiers,
    #[serde(rename = "tempAttributeModifiers")]
    pub temp_attribute_modifiers: AttributeModifiers,
    #[serde(rename = "cubePool")]
    pub cube_pool: u32,
    #[serde(rename = "hasPassedSingularity", default)]
    pub has_passed_singularity: bool,
}

impl PlayerGenome {
    pub fn new(player_public_key: String) -> Self {
        Self {
            player_public_key,
            stability: 3,
            data_clusters: 0,
            raw_matter: 0,
            insight_tokens: 0,
            locked_slots: Vec::new(),
            base_attributes: BaseAttributes::default(),
            mutation_modifiers: AttributeModifiers::default(),
            temp_attribute_modifiers: AttributeModifiers::default(),
            cube_pool: 8,
            has_passed_singularity: false,
        }
    }

    pub fn effective_attribute(&self, attr: AttributeType) -> i32 {
        self.base_attributes.get(attr) as i32
            + self.mutation_modifiers.get(attr)
            + self.temp_attribute_modifiers.get(attr)
    }

    pub fn total_effective_stats(&self) -> i32 {
        self.base_attributes.total() as i32
            + self.mutation_modifiers.total()
            + self.temp_attribute_modifiers.total()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlayerPiece {
    #[serde(rename = "playerPublicKey")]
    pub player_public_key: String,
    #[serde(rename = "hexId")]
    pub hex_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Player {
    #[serde(rename = "publicKey")]
    pub public_key: String,
    pub name: String,
    pub color: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GamePhase {
    Waiting,
    Setup,
    Mutation,
    Phenotype,
    Environmental,
    Competitive,
    Optimization,
    Won,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum EventCardType {
    Hazard,
    Pressure,
    Shift,
    #[serde(rename = "Apex Lead")]
    ApexLead,
    Bonus,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum EventCheckType {
    #[serde(rename = "NAV")]
    Nav,
    #[serde(rename = "LOG")]
    Log,
    #[serde(rename = "DEF")]
    Def,
    #[serde(rename = "SCN")]
    Scn,
    #[serde(rename = "TOTAL_SUM")]
    TotalSum,
    #[serde(rename = "NONE")]
    None,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventThreshold {
    Fixed(u32),
    AvgPlus2(String),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EffectKind {
    Stability,
    Data,
    Matter,
    Displacement,
    MovementCost,
    StatModTemp,
    StatModPerm,
    HardReboot,
    MapShift,
    Transfer,
    GainInsight,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventEffect {
    #[serde(rename = "type")]
    pub effect_type: EffectKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attribute: Option<AttributeType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventEffects {
    #[serde(rename = "onSuccess", skip_serializing_if = "Option::is_none")]
    pub on_success: Option<EventEffect>,
    #[serde(rename = "onFailure", skip_serializing_if = "Option::is_none")]
    pub on_failure: Option<EventEffect>,
    #[serde(rename = "global", skip_serializing_if = "Option::is_none")]
    pub global: Option<EventEffect>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EnvironmentalEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub card_type: EventCardType,
    pub name: String,
    pub description: String,
    #[serde(rename = "checkType")]
    pub check_type: EventCheckType,
    pub threshold: EventThreshold,
    pub effects: EventEffects,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MutationResult {
    pub attr: AttributeType,
    pub magnitude: i32,
    #[serde(rename = "attrRoll")]
    pub attr_roll: u32,
    #[serde(rename = "magRoll")]
    pub mag_roll: u32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HarvestResult {
    #[serde(rename = "playerPublicKey")]
    pub player_public_key: String,
    pub success: bool,
    pub attribute: AttributeType,
    pub roll: u32,
    pub magnitude: i32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventResult {
    pub roll: u32,
    pub modifier: i32,
    pub success: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PhenotypeActionInfo {
    #[serde(rename = "movesMade")]
    pub moves_made: u32,
    #[serde(rename = "harvestDone")]
    pub harvest_done: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameState {
    pub players: Vec<Player>,
    #[serde(rename = "currentPlayerIndex")]
    pub current_player_index: usize,
    pub genomes: Vec<PlayerGenome>,
    pub pieces: Vec<PlayerPiece>,
    #[serde(rename = "hexGrid")]
    pub hex_grid: Vec<HexCell>,
    #[serde(rename = "eventDeck")]
    pub event_deck: Vec<EnvironmentalEvent>,
    #[serde(rename = "currentEvent")]
    pub current_event: Option<EnvironmentalEvent>,
    #[serde(rename = "gamePhase")]
    pub game_phase: GamePhase,
    pub round: u32,
    pub seed: u32,
    #[serde(rename = "mutationResults")]
    pub mutation_results: HashMap<String, MutationResult>,
    #[serde(rename = "priorityPublicKey")]
    pub priority_public_key: String,
    #[serde(rename = "turnOrder")]
    pub turn_order: Vec<String>,
    #[serde(rename = "dataSpentThisRound")]
    pub data_spent_this_round: HashMap<String, u32>,
    pub winners: Vec<String>,
    #[serde(rename = "lastHarvestResults")]
    pub last_harvest_results: Vec<HarvestResult>,
    #[serde(rename = "phenotypeActions")]
    pub phenotype_actions: HashMap<String, PhenotypeActionInfo>,
    #[serde(rename = "confirmedPlayers")]
    pub confirmed_players: Vec<String>,
    #[serde(rename = "lastEventResults")]
    pub last_event_results: HashMap<String, EventResult>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CubeDistribution {
    pub attribute: Option<AttributeType>,
    pub amount: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GameAction {
    #[serde(rename = "START_GAME")]
    StartGame {
        seed: Option<u32>,
        players: Vec<Player>,
    },
    #[serde(rename = "DISTRIBUTE_CUBES")]
    DistributeCubes {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
        distributions: Vec<CubeDistribution>,
    },
    #[serde(rename = "CONFIRM_PHASE")]
    ConfirmPhase {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
    },
    #[serde(rename = "MOVE_PLAYER")]
    MovePlayer {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
        #[serde(rename = "hexId")]
        hex_id: String,
    },
    #[serde(rename = "FINISH_TURN")]
    FinishTurn {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
    },
    #[serde(rename = "OPTIMIZE_DATA")]
    OptimizeData {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
    },
    #[serde(rename = "PRUNE_ATTRIBUTE")]
    PruneAttribute {
        #[serde(rename = "playerPublicKey")]
        player_public_key: String,
        attribute: AttributeType,
    },
    #[serde(rename = "FORCE_EVENT")]
    ForceEvent {
        #[serde(rename = "eventId")]
        event_id: String,
    },
    #[serde(rename = "RESET")]
    Reset,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ActionResult {
    pub valid: bool,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValidAction {
    pub action_type: String,
    pub description: String,
}
