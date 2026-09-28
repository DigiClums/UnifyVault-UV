# X (Twitter) API Capability & Integration Audit

## 1. Overview

This document audits the X API v2 capabilities, OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange), required scopes, rate limits, tier restrictions, and integration considerations for UnifyVault Early Radar.

---

## 2. OAuth 2.0 Authorization Code Flow with PKCE

### Specifications

- **Flow:** Authorization Code Flow with PKCE (`RFC 7636`)
- **Authorization URL:** `https://twitter.com/i/oauth2/authorize`
- **Token URL:** `https://api.twitter.com/2/oauth2/token`
- **Code Challenge Method:** `S256` (`BASE64URL-ENCODE(SHA256(code_verifier))`)
- **Code Verifier Requirements:** Cryptographically random high-entropy string (43–128 characters)

### Security Principles

1. **Confidentiality:** Client secrets and refresh/access tokens are encrypted at rest using server-side AES-256-GCM.
2. **State Protection:** Anti-CSRF `state` parameter generated with high entropy, stored securely with a 10-minute TTL, and single-use validation.
3. **PKCE Bypass Prevention:** `code_verifier` is stored server-side bound to the OAuth `state` and never exposed to the client browser.
4. **Least Privilege Scopes:** Request only the minimum scopes required for identity and public signal ingestion.

---

## 3. Required Scopes

| Scope            | Purpose                                                                                        | Mandatory |
| ---------------- | ---------------------------------------------------------------------------------------------- | --------- |
| `users.read`     | Retrieves authorized X user identity (`id`, `username`, `name`, profile) via `GET /2/users/me` | Yes       |
| `tweet.read`     | Reads public tweets, mentions, and author timelines                                            | Yes       |
| `offline.access` | Issues a Refresh Token for long-lived background integration without recurring login prompts   | Yes       |

_Note: Write permissions (`tweet.write`, `like.write`, `dm.write`) are strictly NOT requested to enforce read-only safety._

---

## 4. Endpoints & Early Radar Usage

### 1. Identity Verification (`GET /2/users/me`)

- **Endpoint:** `https://api.twitter.com/2/users/me`
- **Rate Limit:** 75 requests per 15-minute window (User context)
- **Access Tier:** Available on Free, Basic, Pro, and Enterprise tiers.
- **Payload Returned:** `data.id`, `data.name`, `data.username`, `data.verified`

### 2. Recent Search (`GET /2/tweets/search/recent`)

- **Endpoint:** `https://api.twitter.com/2/tweets/search/recent`
- **Query Params:** `query`, `tweet.fields` (`created_at`, `public_metrics`, `entities`, `author_id`), `max_results`
- **Rate Limit:**
  - **Basic Tier ($100/mo):** 60 requests per 15-minute window, max 10,000 tweets/month.
  - **Pro Tier ($5,000/mo):** 300 requests per 15-minute window, max 1,000,000 tweets/month.
  - **Free Tier:** Search endpoint is restricted/unavailable on v2 (Free tier supports write and `/users/me` only).
- **Capability Flag:** `SEARCH_RECENT` (Handled gracefully with fallback when tier restricts search).

### 3. User Mentions / Timeline (`GET /2/users/:id/tweets` & `GET /2/users/:id/mentions`)

- **Rate Limit:** 180 requests per 15-minute window (Basic/Pro).
- **Usage:** Track verified founder/project account public posts for `X_BUILDING_SIGNAL` and `X_TESTNET_SIGNAL`.

---

## 5. Token Lifecycle & Encryption

1. **Storage Security:**
   - Access Token & Refresh Token are encrypted with **AES-256-GCM** (authenticated encryption with 128-bit authentication tag and random 96-bit initialization vector).
   - Stored in database table `XIntegration`.
2. **Token Refresh Flow:**
   - When `expiresAt` is within 5 minutes or an API call returns `401 Unauthorized`, `XIntegrationService` uses the stored encrypted refresh token at `POST https://api.twitter.com/2/oauth2/token` (`grant_type=refresh_token`).
3. **Disconnection / Revocation:**
   - User can disconnect at any time via `POST /api/radar/integrations/x/disconnect`.
   - Cleanses stored tokens and sets status to `DISCONNECTED`.

---

## 6. Rate Limiting & Reliability Architecture

- **Request Timeout:** 10,000 ms with Axios cancellation.
- **Backoff Strategy:** Exponential backoff with jitter on `429 Too Many Requests` or `5xx Server Errors`.
- **Rate-Limit Detection:** Inspects `x-rate-limit-remaining` and `x-rate-limit-reset` HTTP headers.
- **Bounded Polling:** Scheduled jobs run at bounded intervals; no uncontrolled polling loops.
- **Signal Deduplication:** Signals are hashed by `(source, sourceUrl, tweetId)` to prevent duplicate ingestion into PostgreSQL.

---

## 7. Human-Selection-Bias & Frozen Baseline Protection

- **Frozen Cohort Inviolability:** Ingestion of X signals is purely additive. It **DOES NOT** modify, overwrite, or re-rank the frozen 17-project baseline candidates ($T_0$ 18 Sep 2026).
- **Dual Cohort Routing:**
  - If an X post references a frozen project, it is recorded as an external observation on the timeline without altering original baseline scores.
  - New independent signals are routed into Cohort B (Observational stream).
