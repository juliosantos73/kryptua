use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use wasm_bindgen::prelude::*;

/// Encripta plaintext com AES-256-GCM. Retorna [nonce (12 bytes) || ciphertext].
#[wasm_bindgen]
pub fn encrypt(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let mut output = Vec::with_capacity(12 + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

/// Decripta um blob [nonce (12 bytes) || ciphertext] com AES-256-GCM.
#[wasm_bindgen]
pub fn decrypt(key: &[u8], blob: &[u8]) -> Result<Vec<u8>, JsError> {
    if blob.len() < 12 {
        return Err(JsError::new("blob too short"));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let nonce = Nonce::from_slice(&blob[..12]);
    let ciphertext = &blob[12..];

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| JsError::new("decryption failed"))
}
