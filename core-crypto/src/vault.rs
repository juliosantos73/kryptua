use wasm_bindgen::prelude::*;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::crypto::{decrypt_inner, encrypt_inner};

/// Mantém a chave derivada em memória durante a sessão aberta.
/// Instanciado uma vez após `derive_key()` e descartado no lock/logout.
#[wasm_bindgen]
pub struct VaultManager {
    key: KeyBuffer,
}

/// Wrapper para garantir que a chave é zerada da memória ao sair de escopo.
#[derive(Zeroize, ZeroizeOnDrop)]
struct KeyBuffer([u8; 32]);

// Lógica interna sem JsError — usada nos testes nativos e pelos wrappers Wasm.
impl VaultManager {
    pub(crate) fn new_inner(key: &[u8]) -> Result<VaultManager, String> {
        if key.len() != 32 {
            return Err(format!("chave deve ter 32 bytes, recebeu {}", key.len()));
        }
        let mut buf = [0u8; 32];
        buf.copy_from_slice(key);
        Ok(VaultManager { key: KeyBuffer(buf) })
    }

    pub(crate) fn encrypt_item_inner(&self, payload_json: &str) -> Result<Vec<u8>, String> {
        encrypt_inner(&self.key.0, payload_json.as_bytes())
    }

    pub(crate) fn decrypt_item_inner(&self, blob: &[u8]) -> Result<String, String> {
        let bytes = decrypt_inner(&self.key.0, blob)?;
        String::from_utf8(bytes).map_err(|e| e.to_string())
    }
}

// Wrappers Wasm: convertem String error para JsError.
#[wasm_bindgen]
impl VaultManager {
    #[wasm_bindgen(constructor)]
    pub fn new(key: &[u8]) -> Result<VaultManager, JsError> {
        Self::new_inner(key).map_err(|e| JsError::new(&e))
    }

    /// Encripta um payload JSON de item. Retorna o blob [nonce || ciphertext].
    pub fn encrypt_item(&self, payload_json: &str) -> Result<Vec<u8>, JsError> {
        self.encrypt_item_inner(payload_json).map_err(|e| JsError::new(&e))
    }

    /// Decripta um blob e retorna o payload JSON do item.
    pub fn decrypt_item(&self, blob: &[u8]) -> Result<String, JsError> {
        self.decrypt_item_inner(blob).map_err(|e| JsError::new(&e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ItemPayload, LoginPayload};

    fn test_key() -> Vec<u8> {
        vec![0xABu8; 32]
    }

    fn make_manager() -> VaultManager {
        VaultManager::new_inner(&test_key()).unwrap()
    }

    fn login_payload_json() -> String {
        let payload = ItemPayload::Login(LoginPayload {
            username: "user@kryptua.com".into(),
            password: "P@ssw0rd!".into(),
            url: "https://kryptua.com".into(),
            notes: String::new(),
        });
        serde_json::to_string(&payload).unwrap()
    }

    #[test]
    fn encrypt_decrypt_item_roundtrip() {
        let mgr = make_manager();
        let original = login_payload_json();
        let blob = mgr.encrypt_item_inner(&original).unwrap();
        let recovered = mgr.decrypt_item_inner(&blob).unwrap();
        assert_eq!(recovered, original);
    }

    #[test]
    fn wrong_key_cannot_decrypt() {
        let mgr = make_manager();
        let blob = mgr.encrypt_item_inner(&login_payload_json()).unwrap();
        let wrong_mgr = VaultManager::new_inner(&vec![0x00u8; 32]).unwrap();
        assert!(wrong_mgr.decrypt_item_inner(&blob).is_err());
    }

    #[test]
    fn invalid_key_size_is_rejected() {
        assert!(VaultManager::new_inner(&[0u8; 16]).is_err());
        assert!(VaultManager::new_inner(&[0u8; 64]).is_err());
    }

    #[test]
    fn decrypted_json_is_valid_payload() {
        let mgr = make_manager();
        let blob = mgr.encrypt_item_inner(&login_payload_json()).unwrap();
        let json = mgr.decrypt_item_inner(&blob).unwrap();
        let payload: ItemPayload = serde_json::from_str(&json).unwrap();
        match payload {
            ItemPayload::Login(l) => assert_eq!(l.username, "user@kryptua.com"),
            _ => panic!("tipo errado após decrypt"),
        }
    }
}
