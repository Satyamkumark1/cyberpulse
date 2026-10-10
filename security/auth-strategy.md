# AUTHENTICATION STRATEGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| **Status in v1.0** | **There is no authentication.** The role selector is a demonstration affordance and is not a security control. |
| Related | ADR-019, `security/authorization.md`, `architecture/security-architecture.md` §4 |

---

## 1. Statement of Position

CyberPulse AI v1.0 does not authenticate users. Anyone who can reach the deployed URL can use the application and can select any of the three roles from the header.

This is a deliberate, documented decision (ADR-019) taken because:

1. The source specification explicitly permits role switching in the prototype.
2. There is no real data to protect — every record is synthetic, and the schema has no columns for personal data.
3. Building real identity management would consume days of a three-week window for a capability that adds nothing to the demonstrated value chain.
4. A prototype that *hid* the role mechanism behind a login screen would be less honest, not more secure.

What the prototype **does** do is enforce authorisation server-side once a role is asserted. That is what makes the boundary demonstrable rather than cosmetic: a request carrying `x-cyberpulse-role: BANK` genuinely receives 403 from `POST /api/investigations`, and genuinely receives 404 rather than 403 for out-of-scope objects.

**This document must never be summarised as "the prototype uses role-based authentication."** It uses role-based *authorisation* over an *unauthenticated* role assertion. The distinction is the whole point.

---

## 2. What Exists

### 2.1 Role assertion

```
POST /api/role  { "role": "BANK" }
```

Sets an `httpOnly`, same-site cookie carrying the selected role. Subsequent requests resolve the role from that cookie, or from an `x-cyberpulse-role` header when present (which is how the test suite exercises role boundaries).

Each role in the header switcher opens its home page in a new tab carrying `?as=ROLE` (ADR-024). `middleware.ts` turns that into the `x-cyberpulse-role` header for the page, keeps `?as=` on the address when the tab follows a link, and gives an API call the role of the tab that made it (read from the same-site `Referer`). Precedence: an explicit header, then `?as=` on the request, then `?as=` on the calling page, then the cookie. No role, ADMIN included, needs a code (ADR-023 is superseded).

The `/safety` pages (FEAT-17) always send `x-cyberpulse-role: CITIZEN`, so the citizen side never depends on the cookie. CITIZEN is asserted exactly like every other role (ADR-022); what protects a citizen's report status is the one-time tracking code, not the role.

### 2.2 Role resolution

```ts
export function resolveRole(req: Request, nowMs = Date.now()): ActorRole {
  const header = req.headers.get('x-cyberpulse-role');
  return header !== null
    ? claimedRole(header)                                  // any role but ADMIN
    : cookieRole(getCookie(req, 'cyberpulse_role'), nowMs); // ADMIN only if signed and unexpired
}
```

An unrecognised or unverified value falls back to LEA rather than erroring or granting ADMIN. LEA is not the most restrictive role — GUARD is (ADR-021) — but it is the safe default this prototype's cookie-less experience is built around: existing demo/map E2E specs never set a role cookie and expect full LEA-level capability. The correctness property this guards is narrower and still holds regardless of what else exists: never escalate to ADMIN on unrecognised input.

### 2.3 UI labelling

The header control reads **"Prototype role"** rather than "Signed in as". The settings page states the system mode. No screen implies that a session belongs to a person.

---

## 3. What Does Not Exist

| Absent | Consequence |
|---|---|
| User accounts | No identity to attribute actions to beyond a role |
| Passwords or credentials | Nothing to steal, nothing to rotate |
| Sessions with expiry | Role selection persists until changed |
| MFA | — |
| SSO / directory integration | — |
| Password reset, lockout, brute-force protection | No login surface exists to attack |
| Per-user audit attribution | Audit records carry `actor_role`, not an actor identity |

The last row is the most consequential for the product's stated purpose. An audit trail that records "LEA dispatched this alert" is sufficient to demonstrate that the mechanism exists and is transactional, but it is not sufficient for real accountability. That gap is V1 scope and is stated in `security/security-checklist.md`.

---

## 4. V1 Target State

When real data is introduced, authentication becomes mandatory — and the architecture already has the gate that forces the issue.

### 4.1 The classification gate

`architecture/integrations.md` §3.1 defines every ingestion adapter as carrying a `dataClassification`. A deployment whose data is classified `RESTRICTED` fails its own startup check unless real identity, audit retention and state partitioning are enabled. This means authentication cannot be "forgotten" when the first real adapter is connected: the application refuses to start.

### 4.2 Intended design

| Concern | V1 approach |
|---|---|
| Identity provider | Government-operated OIDC provider, or the deploying department's directory |
| Protocol | OIDC authorisation code flow with PKCE |
| Session | httpOnly, secure, same-site cookie; short-lived access token with refresh |
| MFA | Required for LEA and ADMIN; enforced at the provider |
| Role source | Group or claim from the provider — **never** client-selectable |
| Attribution | Audit events gain a stable pseudonymous subject identifier |
| Scope | State and district derived from the verified identity, driving row-level security |
| Sign-out | Local session clear plus provider logout |
| Service-to-service | mTLS or a signed service token between Next.js and the ML service |

### 4.3 Migration path

1. Add the OIDC integration behind a feature flag, defaulting off.
2. Change `resolveRole` to read from the verified session when the flag is on, and remove the header path entirely in that mode.
3. Add row-level security policies keyed on the identity's state.
4. Extend `audit_events` with a subject identifier column.
5. Remove `POST /api/role` and the header control.
6. Flip the classification gate to require the flag whenever data is not `SYNTHETIC`.

Step 2 is the only step touching application logic, because authorisation is already isolated in the service layer and already operates on a resolved role. The prototype was built so that the authentication gap is a *replaceable component* rather than a structural assumption — which is the one thing a prototype without authentication can do to earn the right to be called production-shaped.

---

## 5. Threats Accepted in v1.0

| Threat | Accepted because | Bounded by |
|---|---|---|
| Any caller can assume any role, ADMIN included | No real data exists | Synthetic-only constraint (CR-01) |
| No attribution beyond role | Prototype audit demonstrates the mechanism, not real accountability | Declared in `security/security-checklist.md` |
| No session expiry | No credential to expire | — |
| Non-ADMIN role cookies never expire | They grant nothing a caller could not claim anyway | — |

The role cookie is not `httpOnly`, and no role needs a code: dressing a demonstration affordance in security clothing makes reviewers trust it more than they should (ADR-024).

---

## 6. Verification

| Check | Test |
|---|---|
| Unknown role falls back to LEA, never ADMIN | TC-SEC-010 |
| BANK role is refused LEA-only actions server-side | TC-SEC-011 |
| Out-of-scope objects return 404, not 403 | TC-SEC-012 |
| The role control is labelled as a prototype affordance | TC-UI-080 |
| No screen implies an authenticated user session | TC-UX-012 |
| No credential or secret is present in the client bundle | TC-SEC-003 |
