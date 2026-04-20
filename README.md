# lucas-orange-tool

Backend de tools pour l'agent WhatsApp Retell.ai "Lucas" (Orange Maison Protégée).

## Endpoints

### `POST /tool/send_recap_video`
Envoie un récap WhatsApp via Twilio à la fin de la conversation.

Args :
- `conversation_summary` (string)
- `phone_number` (string, format E.164)

Variables d'env requises : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`.

### `POST /tool/search_company`
Recherche une entreprise française via l'API publique
[recherche-entreprises.api.gouv.fr](https://recherche-entreprises.api.gouv.fr/)
(même source que le MCP data.gouv.fr). Alternative gratuite et sans clé à Pappers.

Args :
- `query` (string) — nom, SIREN (9 chiffres) ou SIRET (14 chiffres)

Réponse :
```json
{
  "result": "Phrase courte que l'agent peut lire",
  "companies": [
    {
      "nom": "...",
      "siren": "...",
      "siret_siege": "...",
      "activite": "...",
      "categorie": "PME|ETI|GE",
      "tranche_effectif": "...",
      "date_creation": "YYYY-MM-DD",
      "etat": "A|C",
      "adresse": "...",
      "code_postal": "...",
      "ville": "...",
      "dirigeants": ["..."]
    }
  ]
}
```

#### Configuration Retell.ai

Dans l'agent Retell, ajouter un **Custom Function** :
- Name : `search_company`
- URL : `https://<votre-host>/tool/search_company`
- Parameters :
  - `query` (string, required) — "Nom, SIREN ou SIRET de l'entreprise prospect"
- Description : "Recherche une entreprise française dans la base Sirene
  (data.gouv.fr). Utiliser pour qualifier un prospect B2B avant de proposer
  l'offre Orange Maison Protégée."

## Lancement local

```bash
npm install
npm start
```
