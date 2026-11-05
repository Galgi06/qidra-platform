# Qidra Messenger: product and technical specification

Status: approved discovery scope, 2026-11-05.

## 1. Product goal

Qidra Messenger is a standalone Qidra communication product. Its first release provides a secure support channel between a Qidra investor and the Qidra technical support team.

The MVP is not a social messenger. Investors cannot discover or message other investors. Audio calls, video calls, public channels, groups and bots are outside the MVP.

## 2. Brand and naming

- Product name: `Qidra Messenger`.
- The application uses the existing Qidra `Q` brand mark with the characteristic tail.
- The visual system must remain recognisably Qidra while clearly identifying Messenger as a separate application.
- The application must support Russian and English from the first release.

## 3. MVP users and permissions

### Investor

- Signs in with the Qidra account through Google OAuth or an existing Qidra email/password account.
- Can create and continue a conversation only with technical support.
- Can send text and approved attachments.
- Can see delivery, read and support-response states.
- Can close a resolved request and rate the response.
- Cannot message another investor or access another user's conversation.

### Technical support operator

- Sees the assigned support queue and unread counter.
- Can accept, assign, transfer, reply to, mark pending and close a request.
- Can add internal notes that are never visible to the investor.
- Can view only the investor profile fields required to resolve the request.

### Administrator / owner

- Sees all conversations, assignments, response times and audit events.
- Can configure operators, notification recipients, retention and attachment policy.
- Receives an alert about a new investor message by email.
- Receives the same alert inside Qidra Messenger when the owner application is active.

## 4. Core user journeys

1. The investor signs in and opens `Support`.
2. The investor selects a subject, enters a message and optionally adds attachments.
3. The server creates or reopens a technical-support thread and confirms delivery.
4. The support queue and owner receive an unread event; configured recipients also receive an email alert with a safe link to the conversation.
5. An operator accepts the request and replies.
6. The investor receives an in-app notification and an optional email notification.
7. Either side continues the thread until the operator closes it; the investor can rate the result.

## 5. Required MVP capabilities

- One-to-one support threads: one investor and the authorised Qidra support team.
- Text messages with server timestamps and stable message IDs.
- Attachments: PDF, DOC/DOCX, JPG/JPEG, PNG, WebP and TXT; maximum 5 files and 12 MB per file unless compliance approves a different policy.
- Delivery states: `sending`, `sent`, `delivered`, `read`, `failed`.
- Thread states: `open`, `pending investor`, `pending support`, `closed`.
- Unread counters, notification centre and email alerts.
- Search by thread ID, investor, subject, status and date for authorised staff.
- Assignment, transfer, internal notes, close/reopen and response rating.
- Russian and English interface and message templates.
- Responsive web application and installable PWA; native mobile applications are a later phase.

## 6. Notification policy

- A new investor message creates an in-app notification for the assigned operator and designated owner accounts.
- A new investor message sends email to `SUPPORT_ALERT_EMAILS` and authorised support recipients.
- Email contains a short preview and authenticated link, but no sensitive documents or financial data.
- Qidra Messenger push notifications must contain minimal text and no KYC/payment details on the lock screen.
- Notification failures are retried through a durable outbox and are visible to administrators.
- Telegram is not an authentication or notification dependency for the new product.

## 7. Technical architecture

### Applications

- `messenger-web`: standalone responsive web/PWA client.
- `messenger-api`: authenticated REST API for history, uploads, administration and read state.
- `messenger-realtime`: WebSocket/SSE gateway for message and presence events.
- `messenger-worker`: durable delivery, email and push notification jobs.

### Identity

- Qidra remains the identity authority.
- Google OAuth is configured with a dedicated active OAuth client owned by Qidra.
- Messenger links the authenticated identity to the existing Qidra user ID; it does not create duplicate investor identities.
- Staff permissions are derived from server-side Qidra roles and checked for every request and event subscription.

### Data

- Reuse the existing `SupportThread`, `SupportMessage`, `Notification` and attachment concepts through a versioned migration or service boundary.
- Add explicit message delivery/read receipts, durable notification outbox and audit events.
- Store attachments only in private object storage and serve them through authorised short-lived URLs.
- Preserve message order with server sequence numbers; client timestamps are display-only.

## 8. Security and compliance requirements

- TLS for all traffic and encryption at rest for database, backups and private attachments.
- Strict tenant/user isolation; an investor can access only their own support threads.
- Role-based staff access with mandatory MFA for administrators and support operators.
- Rate limits, spam controls, malware scanning and file signature validation.
- Immutable audit log for assignment, reads by staff, internal notes, exports and deletions.
- No secrets, tokens, KYC documents or payment details in application logs or email bodies.
- Configurable retention and legal hold; deletion must follow applicable financial, AML/KYC and privacy obligations.
- Account blocking and session revocation take effect immediately in Messenger.
- Security review and penetration test are release gates before real investor use.

## 9. Reliability and operations

- Durable message persistence before a successful send acknowledgement.
- Idempotency keys for message creation and notification delivery.
- Retry with backoff and dead-letter handling for email/push failures.
- Health checks, structured logs, metrics and alerts for queue age, delivery failures and WebSocket availability.
- Automated encrypted backups and a tested restore procedure.
- Target MVP availability: 99.9%; define RPO/RTO before production launch.

## 10. Existing Qidra foundation

The current platform already provides support threads, messages, attachments, operator roles, admin queue, investor support page, notifications and email alerts. The Messenger project should migrate or expose these capabilities instead of building a second incompatible support history.

Relevant current modules:

- `prisma/schema.prisma`: support, guest support and notification models.
- `app/investor/support/page.tsx`: authenticated investor support experience.
- `app/admin/support/page.tsx`: staff support queue.
- `app/api/support/*`: support APIs.
- `lib/support-alerts.ts`: in-app and email alert delivery.
- `lib/support-attachments.ts`: attachment policy and private storage integration.

## 11. Delivery stages

### Stage 0: foundation

- Confirm product domain, legal entity, privacy/retention policy and owner notification recipients.
- Restore production Google OAuth and document ownership/recovery.
- Define the Messenger design system using the Qidra `Q` mark.

### Stage 1: support MVP

- Standalone web/PWA, shared Qidra identity, technical-support-only threads, attachments, operator queue, email and in-app owner alerts.
- Import or expose existing Qidra support history without data loss.
- Security, accessibility, mobile and end-to-end testing.

### Stage 2: production hardening

- Durable realtime delivery, push notifications, MFA, malware scanning, audit exports, monitoring, backup/restore drill and penetration test.

### Deferred

- Investor-to-investor messaging.
- Groups, channels, public usernames and bots.
- Voice messages unless separately approved.
- Audio and video calls.
- Native iOS and Android applications.

## 12. MVP acceptance criteria

- An authenticated investor can communicate only with authorised Qidra technical support.
- No investor can enumerate users or read another investor's messages or attachments.
- A new investor message appears in the operator queue and triggers the configured owner email alert.
- Support replies generate an in-app investor notification and optional email.
- Message, attachment, assignment and closure events are auditable.
- Failed notifications retry without duplicating messages.
- The complete flow works on current desktop and mobile browsers in Russian and English.
- Google sign-in, email/password sign-in, account blocking, logout and session revocation pass end-to-end tests.

## 13. Decisions still required before implementation

- Final public domain and app-store naming.
- Legal retention period and countries where data may be stored.
- Exact owner/support email recipients.
- Whether voice messages belong in a later release.
- Whether a native mobile app is required after the PWA MVP.
