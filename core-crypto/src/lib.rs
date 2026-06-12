use wasm_bindgen::prelude::*;

pub mod crypto;
pub mod kdf;
pub mod models;
pub mod vault;

pub use crypto::{decrypt, encrypt};
pub use kdf::derive_key;
pub use vault::VaultManager;

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
