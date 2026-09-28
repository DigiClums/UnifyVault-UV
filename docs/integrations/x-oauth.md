# X (Twitter) OAuth 2.0 PKCE Integration Guide

## 1. Architecture Overview

UnifyVault Early Radar integrates X public signals via **OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange, RFC 7636)**.

```text
User Browser               Radar Backend                 X API (api.twitter.com)
    │                            │                                  │
    │ 1. Connect X               │                                  │
    ├───────────────────────────►│                                  │
    │                            │ 2. Generate state + PKCE S256    │
    │                            │    Save XOAuthSession (10m TTL)  │
    │ 3. Redirect to X           │                                  │
    │◄───────────────────────────┤                                  │
    │                            │                                  │
    │ 4. Authorize Permissions   │                                  │
    ├──────────────────────────────────────────────────────────────►│
    │                            │                                  │
    │ 5. Redirect with Code      │                                  │
    ├───────────────────────────►│                                  │
    │                            │ 6. Validate State (Anti-CSRF)    │
    │                            │    Exchange Code + Verifier      │
    │                            ├─────────────────────────────────►│
    │                            │ 7. Return Access & Refresh Token │
    │                            │◄─────────────────────────────────┤
    │                            │ 8. Fetch User Profile (/users/me)│
    │                            ├─────────────────────────────────►│
    │                            │ 9. Encrypt Tokens (AES-256-GCM)  │
    │                            │    Save to XIntegration          │
    │ 10. Redirect to Radar      │                                  │
    │◄───────────────────────────┤                                  │
```

---

## 2. Security & Compliance Properties

- **Passwordless:** Never asks for or stores user X passwords.
- **PKCE Protection (`S256`):** Prevents authorization code interception attacks.
- **Server-Side Token Encryption:** Access and Refresh tokens are encrypted using authenticated **AES-256-GCM** before database persistence.
- **Least-Privilege Scopes:** Requests only read-only scopes (`users.read`, `tweet.read`, `offline.access`).
- **Zero Client Exposure:** Frontend never receives raw or encrypted tokens.
- **Frozen Baseline Protection:** Ingested X signals are strictly additive (Cohort B) and do not overwrite or modify Cohort A ($T_0$ 18 Sep 2026 frozen baseline candidates).

---

## 3. X Developer Console Configuration

To configure your X Developer App:

1. Navigate to the **[X Developer Portal](https://developer.twitter.com/en/portal/dashboard)**.
2. Select your Project/App and navigate to **User authentication settings** -> **Set up**.
3. Configure the following settings:
   - **App permissions:** `Read`
   - **Type of App:** `Web App, Automated App or Bot`
   - **Callback / Redirect URL:** `https://app.unifyvault.xyz/api/radar/integrations/x/callback`
   - **Website URL:** `https://app.unifyvault.xyz`
4. Copy the generated **Client ID** and **Client Secret**.

---

## 4. Environment Variables (`apps/radar-backend/.env`)

```env
# X (Twitter) OAuth 2.0 PKCE Configuration
X_CLIENT_ID="YOUR_X_OAUTH2_CLIENT_ID"
X_CLIENT_SECRET="YOUR_X_OAUTH2_CLIENT_SECRET"
X_REDIRECT_URI="https://app.unifyvault.xyz/api/radar/integrations/x/callback"
X_SCOPES="users.read tweet.read offline.access"
X_REQUEST_TIMEOUT_MS=10000
ENCRYPTION_KEY="64_HEX_CHAR_OR_32_BYTE_STRING_FOR_AES_256_GCM"
```

---

## 5. API Endpoints

| Endpoint                               | Method | Description                                                                |
| -------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `/api/radar/integrations/x/connect`    | `GET`  | Initiates PKCE flow and returns authorization URL                          |
| `/api/radar/integrations/x/callback`   | `GET`  | Handles OAuth callback, state verification, token exchange, and encryption |
| `/api/radar/integrations/x/status`     | `GET`  | Returns sanitized connection status (`connected`, `@username`, scopes)     |
| `/api/radar/integrations/x/disconnect` | `POST` | Disconnects integration and revokes stored tokens                          |
| `/api/radar/integrations/x/collect`    | `POST` | Triggers public signal collection scan using authorized token              |

---

## 6. Token Lifecycle & Auto-Refresh

- If `tokenExpiresAt` is within 5 minutes of expiration during an API call, `XOAuthService` automatically performs a refresh request using the encrypted `refresh_token` (`grant_type=refresh_token`) and updates the database seamlessly.
