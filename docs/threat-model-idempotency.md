# Threat Model: Idempotency Semantics

This document outlines the threat model and security considerations for the idempotency middleware in the Veritasor Backend.

## Overview

The idempotency middleware provides protection against duplicate operations by caching responses based on a client-provided `Idempotency-Key`.

## Threat Vectors & Mitigations

### 1. Key Collision (Accidental or Malicious)
- **Threat**: Two different requests use the same `Idempotency-Key`.
- **Impact**: The second request receives the cached response of the first request, leading to incorrect state representation or data loss.
- **Mitigation**: 
  - **Request Body Hashing**: We store a SHA-256 hash of the request body along with the cached response. If a subsequent request uses the same key but has a different body hash, the middleware returns `409 Conflict`.
  - **User Scoping**: Keys are automatically prefixed with the User ID (or IP address as fallback). This prevents User A from accidentally or maliciously colliding with User B's keys.

### 2. Storage Exhaustion
- **Threat**: An attacker sends a large number of requests with unique `Idempotency-Keys` to fill up the storage (Redis/Memory).
- **Impact**: Service degradation or crash due to Out-Of-Memory (OOM) or storage limit hit.
- **Mitigation**:
  - **TTL (Time To Live)**: All entries have a mandatory TTL (default 24 hours). Expired entries are automatically evicted.
  - **Key Length Constraints**: Keys must be between 8 and 256 characters.
  - **Rate Limiting**: Standard rate limiting middleware should be applied before idempotency checks.

### 3. Clock Skew
- **Threat**: Discrepancies between application server clocks and storage server clocks.
- **Impact**: Early expiration or longer-than-intended retention of cached responses.
- **Mitigation**:
  - TTL is calculated relative to the storage engine's time (e.g., Redis `EXPIRE`) or absolute timestamps are handled with tolerance. For in-memory, it's local `Date.now()`.

### 4. Information Leakage
- **Threat**: Cached responses might contain sensitive data that shouldn't be accessible if the user's session changed.
- **Mitigation**:
  - Since keys are scoped to the User ID, a different user cannot retrieve a cached response for another user's key.

## Integration Specifics

### Authentication
- Idempotency is typically NOT applied to `/login` or `/signup` to avoid caching session tokens or passwords.
- It is highly recommended for `/reset-password` if it performs a heavy operation.

### Webhooks
- External services (like Stripe or Razorpay) often have their own idempotency logic.
- Our middleware should be used for *outgoing* requests or *internal* processing of webhooks if they are not already deduplicated by the source.

### Soroban Contracts / On-Chain Transactions
- Idempotency is CRITICAL for on-chain submissions to avoid double-spending or duplicate attestations.
- The middleware ensures that if a timeout occurs but the transaction was actually submitted, the subsequent retry will return the original transaction hash instead of attempting a new one.

## Operator Notes

- **Default TTL**: 24 hours.
- **Failure Mode**: The middleware fails open (logs an error but proceeds to the handler) if the cache store is unavailable. This prioritizes availability over strict idempotency in case of infrastructure failure.
