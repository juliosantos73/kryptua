use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    Login,
    Card,
    SecureNote,
}

/// Payload de credencial de login — dado sensível, sempre encriptado.
#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
}

/// Payload de cartão de pagamento — dado sensível, sempre encriptado.
#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct CardPayload {
    pub number: String,
    pub holder: String,
    pub expiry: String,
    pub cvv: String,
    pub notes: String,
}

/// Payload de nota segura — dado sensível, sempre encriptado.
#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct NotePayload {
    pub content: String,
}

/// Union tipada dos payloads — serializada para JSON antes de encriptar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data", rename_all = "snake_case")]
pub enum ItemPayload {
    Login(LoginPayload),
    Card(CardPayload),
    SecureNote(NotePayload),
}

/// Metadados de um item armazenados localmente (não sensíveis para listagem).
/// O `encrypted_payload` contém o ItemPayload serializado e encriptado.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub vault_id: String,
    pub item_type: ItemType,
    pub title: String,
    pub encrypted_payload: Vec<u8>,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Metadados do vault — o `salt` é armazenado em texto claro (necessário para Argon2id).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMeta {
    pub id: String,
    pub name: String,
    pub salt: Vec<u8>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn item_payload_roundtrip_login() {
        let payload = ItemPayload::Login(LoginPayload {
            username: "user@example.com".into(),
            password: "s3cr3t".into(),
            url: "https://example.com".into(),
            notes: String::new(),
        });
        let json = serde_json::to_string(&payload).unwrap();
        let decoded: ItemPayload = serde_json::from_str(&json).unwrap();
        match decoded {
            ItemPayload::Login(l) => assert_eq!(l.username, "user@example.com"),
            _ => panic!("tipo errado"),
        }
    }

    #[test]
    fn item_payload_roundtrip_card() {
        let payload = ItemPayload::Card(CardPayload {
            number: "4111111111111111".into(),
            holder: "João Silva".into(),
            expiry: "12/28".into(),
            cvv: "123".into(),
            notes: String::new(),
        });
        let json = serde_json::to_string(&payload).unwrap();
        let decoded: ItemPayload = serde_json::from_str(&json).unwrap();
        match decoded {
            ItemPayload::Card(c) => assert_eq!(c.number, "4111111111111111"),
            _ => panic!("tipo errado"),
        }
    }
}
