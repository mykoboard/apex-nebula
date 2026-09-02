pub struct Mulberry32 {
    seed: u32,
}

impl Mulberry32 {
    pub fn new(seed: u32) -> Self {
        Self { seed }
    }

    pub fn next_f64(&mut self) -> f64 {
        self.seed = self.seed.wrapping_add(0x6d2b79f5);
        let s = self.seed;
        let mut t = (s ^ (s >> 15)).wrapping_mul(1 | s);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t));
        let res = t ^ (t >> 14);
        (res as f64) / 4294967296.0
    }

    pub fn roll_dice(&mut self, sides: u32) -> u32 {
        let val = self.next_f64();
        ((val * (sides as f64)).floor() as u32) + 1
    }

    pub fn shuffle<T>(&mut self, slice: &mut [T]) {
        for i in (1..slice.len()).rev() {
            let val = self.next_f64();
            let j = (val * ((i + 1) as f64)).floor() as usize;
            slice.swap(i, j);
        }
    }
}

pub fn get_deterministic_offset(id: &str) -> u32 {
    let mut hash: i32 = 0;
    for ch in id.chars() {
        let code = ch as i32;
        hash = hash.wrapping_shl(5).wrapping_sub(hash).wrapping_add(code);
    }
    if hash == i32::MIN {
        i32::MAX as u32
    } else {
        hash.abs() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prng_sequence() {
        let mut prng = Mulberry32::new(12345);
        let r1 = prng.roll_dice(6);
        let r2 = prng.roll_dice(4);
        assert!((1..=6).contains(&r1));
        assert!((1..=4).contains(&r2));
    }

    #[test]
    fn test_deterministic_offset() {
        let off1 = get_deterministic_offset("pub-A");
        let off2 = get_deterministic_offset("pub-B");
        assert_ne!(off1, off2);
        assert_eq!(off1, get_deterministic_offset("pub-A"));
    }
}
