use argon2::{Argon2, Algorithm, Params, Version};
use wasm_bindgen::prelude::*;
use zeroize::Zeroizing;

/// Parâmetros Argon2id: 64 MiB / 3 iterações / 4 threads — adequado para uso interativo.
const MEMORY_KIB: u32 = 64 * 1024;
const ITERATIONS: u32 = 3;
const PARALLELISM: u32 = 4;
const KEY_LEN: usize = 32;

pub(crate) fn derive_key_inner(
    password: &str,
    salt: &[u8],
) -> Result<Zeroizing<Vec<u8>>, String> {
    let params = Params::new(MEMORY_KIB, ITERATIONS, PARALLELISM, Some(KEY_LEN))
        .map_err(|e| e.to_string())?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let password_bytes = Zeroizing::new(password.as_bytes().to_vec());

    let mut key = Zeroizing::new(vec![0u8; KEY_LEN]);
    argon2
        .hash_password_into(&password_bytes, salt, &mut key)
        .map_err(|e| e.to_string())?;

    Ok(key)
}

/// Exposto ao Wasm: deriva uma chave AES-256 a partir da Master Password e do salt do vault.
#[wasm_bindgen]
pub fn derive_key(password: &str, salt: &[u8]) -> Result<Vec<u8>, JsError> {
    derive_key_inner(password, salt)
        .map(|k| k.to_vec())
        .map_err(|e| JsError::new(&e))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn salt() -> Vec<u8> {
        vec![0u8; 32]
    }

    #[test]
    fn derive_key_is_deterministic() {
        let k1 = derive_key_inner("master-password", &salt()).unwrap();
        let k2 = derive_key_inner("master-password", &salt()).unwrap();
        assert_eq!(*k1, *k2);
    }

    #[test]
    fn different_passwords_give_different_keys() {
        let k1 = derive_key_inner("password-a", &salt()).unwrap();
        let k2 = derive_key_inner("password-b", &salt()).unwrap();
        assert_ne!(*k1, *k2);
    }

    #[test]
    fn different_salts_give_different_keys() {
        let salt_a = vec![0u8; 32];
        let salt_b = vec![1u8; 32];
        let k1 = derive_key_inner("same-password", &salt_a).unwrap();
        let k2 = derive_key_inner("same-password", &salt_b).unwrap();
        assert_ne!(*k1, *k2);
    }

    #[test]
    fn output_is_32_bytes() {
        let k = derive_key_inner("password", &salt()).unwrap();
        assert_eq!(k.len(), 32);
    }

    #[test]
    fn empty_salt_is_rejected() {
        let result = derive_key_inner("password", &[]);
        assert!(result.is_err());
    }
}
