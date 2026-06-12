use argon2::{Argon2, Params, Version, Algorithm};
use wasm_bindgen::prelude::*;
use zeroize::Zeroizing;

/// Deriva uma chave de 32 bytes (AES-256) a partir da Master Password.
/// O salt deve ser único por vault (gerado na criação, armazenado em texto claro).
#[wasm_bindgen]
pub fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, JsError> {
    let params = Params::new(
        64 * 1024, // 64 MiB de memória
        3,         // 3 iterações
        4,         // 4 threads de paralelismo
        Some(32),  // 256-bit output
    )
    .map_err(|e| JsError::new(&e.to_string()))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let password_bytes = Zeroizing::new(password.as_bytes().to_vec());

    let mut key = vec![0u8; 32];
    argon2
        .hash_password_into(&password_bytes, salt, &mut key)
        .map_err(|e| JsError::new(&e.to_string()))?;

    Ok(key)
}
