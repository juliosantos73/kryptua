use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use wasm_bindgen::prelude::*;

const NONCE_LEN: usize = 12;

pub(crate) fn encrypt_inner(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| e.to_string())?;

    // Formato do blob: [nonce (12 bytes) || ciphertext+tag]
    let mut blob = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    blob.extend_from_slice(&nonce);
    blob.extend_from_slice(&ciphertext);
    Ok(blob)
}

pub(crate) fn decrypt_inner(key: &[u8], blob: &[u8]) -> Result<Vec<u8>, String> {
    if blob.len() <= NONCE_LEN {
        return Err("blob too short".into());
    }

    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&blob[..NONCE_LEN]);

    cipher
        .decrypt(nonce, &blob[NONCE_LEN..])
        .map_err(|_| "decryption failed — chave incorreta ou dado corrompido".into())
}

/// Exposto ao Wasm: encripta bytes com AES-256-GCM. Retorna [nonce || ciphertext].
#[wasm_bindgen]
pub fn encrypt(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsError> {
    encrypt_inner(key, plaintext).map_err(|e| JsError::new(&e))
}

/// Exposto ao Wasm: decripta um blob [nonce || ciphertext]. Falha com chave errada.
#[wasm_bindgen]
pub fn decrypt(key: &[u8], blob: &[u8]) -> Result<Vec<u8>, JsError> {
    decrypt_inner(key, blob).map_err(|e| JsError::new(&e))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key_32() -> Vec<u8> {
        vec![0x42u8; 32]
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let plaintext = b"senha super secreta 123!";
        let blob = encrypt_inner(&key_32(), plaintext).unwrap();
        let recovered = decrypt_inner(&key_32(), &blob).unwrap();
        assert_eq!(recovered, plaintext);
    }

    #[test]
    fn blob_is_larger_than_plaintext() {
        let plaintext = b"test";
        let blob = encrypt_inner(&key_32(), plaintext).unwrap();
        // nonce (12) + GCM tag (16) + plaintext
        assert_eq!(blob.len(), NONCE_LEN + 16 + plaintext.len());
    }

    #[test]
    fn nonces_are_unique() {
        let plaintext = b"same plaintext";
        let blob1 = encrypt_inner(&key_32(), plaintext).unwrap();
        let blob2 = encrypt_inner(&key_32(), plaintext).unwrap();
        // Nonces diferentes → blobs diferentes (mesmo plaintext)
        assert_ne!(&blob1[..NONCE_LEN], &blob2[..NONCE_LEN]);
    }

    #[test]
    fn wrong_key_fails_decryption() {
        let plaintext = b"dado secreto";
        let blob = encrypt_inner(&key_32(), plaintext).unwrap();
        let wrong_key = vec![0x00u8; 32];
        let result = decrypt_inner(&wrong_key, &blob);
        assert!(result.is_err());
    }

    #[test]
    fn tampered_blob_fails_decryption() {
        let plaintext = b"integridade importa";
        let mut blob = encrypt_inner(&key_32(), plaintext).unwrap();
        blob[20] ^= 0xFF; // flip bit no ciphertext
        let result = decrypt_inner(&key_32(), &blob);
        assert!(result.is_err());
    }

    #[test]
    fn short_blob_is_rejected() {
        let result = decrypt_inner(&key_32(), &[0u8; 12]);
        assert!(result.is_err());
    }

    #[test]
    fn invalid_key_length_is_rejected() {
        let bad_key = vec![0u8; 16]; // AES-128, não AES-256
        let result = encrypt_inner(&bad_key, b"test");
        assert!(result.is_err());
    }
}
