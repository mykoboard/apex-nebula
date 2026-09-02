pub mod engine;
pub mod events;
pub mod grid;
pub mod prng;
pub mod types;

use engine::{apply_action as engine_apply_action, create_initial_state, get_valid_actions_list};
use serde::Serialize;
use sha2::{Digest, Sha256};
use types::{ActionResult, GameAction, GameState};

static mut STATE: Option<GameState> = None;

fn state() -> &'static GameState {
    unsafe {
        let ptr = std::ptr::addr_of!(STATE);
        (*ptr).as_ref().expect("game not initialised")
    }
}

fn state_mut() -> &'static mut GameState {
    unsafe {
        let ptr = std::ptr::addr_of_mut!(STATE);
        (*ptr).as_mut().expect("game not initialised")
    }
}

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}

fn write_json_output<T: Serialize>(value: &T) -> u64 {
    let json = serde_json::to_vec(value).expect("serialisation failed");
    let len = json.len();
    let ptr = alloc(len);
    unsafe {
        std::ptr::copy_nonoverlapping(json.as_ptr(), ptr, len);
    }
    ((ptr as u64) << 32) | (len as u64)
}

fn read_guest_bytes(ptr: *const u8, len: usize) -> &'static [u8] {
    unsafe { std::slice::from_raw_parts(ptr, len) }
}

#[no_mangle]
pub extern "C" fn init() {
    unsafe {
        STATE = Some(create_initial_state());
    }
}

#[no_mangle]
pub extern "C" fn apply_action(ptr: *const u8, len: usize) -> u64 {
    let bytes = read_guest_bytes(ptr, len);
    let action: GameAction = match serde_json::from_slice(bytes) {
        Ok(a) => a,
        Err(e) => {
            let result = ActionResult {
                valid: false,
                error: Some(format!("Invalid action JSON: {}", e)),
            };
            return write_json_output(&result);
        }
    };

    let result = engine_apply_action(state_mut(), action);
    write_json_output(&result)
}

#[no_mangle]
pub extern "C" fn get_state() -> u64 {
    write_json_output(state())
}

#[no_mangle]
pub extern "C" fn get_state_hash() -> u64 {
    let json = serde_json::to_vec(state()).expect("serialisation failed");
    let mut hasher = Sha256::new();
    hasher.update(&json);
    let hash = hasher.finalize();

    let ptr = alloc(32);
    unsafe {
        std::ptr::copy_nonoverlapping(hash.as_ptr(), ptr, 32);
    }
    ((ptr as u64) << 32) | 32u64
}

#[no_mangle]
pub extern "C" fn serialize_snapshot() -> u64 {
    write_json_output(state())
}

#[no_mangle]
pub extern "C" fn load_snapshot(ptr: *const u8, len: usize) -> u32 {
    let bytes = read_guest_bytes(ptr, len);
    match serde_json::from_slice::<GameState>(bytes) {
        Ok(s) => {
            unsafe {
                STATE = Some(s);
            }
            1
        }
        Err(_) => 0,
    }
}

#[no_mangle]
pub extern "C" fn get_valid_actions() -> u64 {
    let actions = get_valid_actions_list(state());
    write_json_output(&actions)
}
