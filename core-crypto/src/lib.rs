use wasm_bindgen::prelude::*;

mod crypto;
mod kdf;

pub use crypto::{encrypt, decrypt};
pub use kdf::derive_key;

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
