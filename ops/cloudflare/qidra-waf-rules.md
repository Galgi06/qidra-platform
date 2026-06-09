# Qidra Cloudflare WAF and rate limiting

Date: 2026-06-09.

Cloudflare WAF can protect `qidra.io` only after the domain uses Cloudflare nameservers and the web DNS records are proxied.

## DNS records

Create or verify these DNS records in Cloudflare:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `@` | `165.22.30.89` | Proxied |
| A | `www` | `165.22.30.89` | Proxied |

Do not add an `AAAA` record unless IPv6 is explicitly configured and tested through Cloudflare.

Email records for Google Workspace must stay DNS only:

| Type | Name | Proxy status |
| --- | --- | --- |
| MX | `@` | DNS only |
| TXT | `@` SPF | DNS only |
| TXT | Google DKIM selector | DNS only |
| TXT | `_dmarc` | DNS only |

## SSL/TLS

Recommended Cloudflare settings:

- SSL/TLS encryption mode: `Full (strict)`.
- Always Use HTTPS: enabled.
- Automatic HTTPS Rewrites: enabled.
- Minimum TLS version: `1.2`.

## Managed protections

Enable:

- WAF Managed Rules.
- Cloudflare OWASP Core Ruleset.
- Bot Fight Mode or Super Bot Fight Mode, depending on the plan.
- Browser Integrity Check.

## Rate limiting rules

Create rate limiting rules in this order. Use IP as the counting characteristic unless the Cloudflare plan allows a better characteristic.

### 1. Auth endpoints

Expression:

```text
(http.host in {"qidra.io" "www.qidra.io"} and starts_with(http.request.uri.path, "/api/auth/"))
```

Recommended threshold:

- Requests: `30`
- Period: `60 seconds`
- Mitigation timeout: `600 seconds`
- Action: `Managed Challenge`

### 2. Wallet endpoints

Expression:

```text
(http.host in {"qidra.io" "www.qidra.io"} and starts_with(http.request.uri.path, "/api/wallet/"))
```

Recommended threshold:

- Requests: `60`
- Period: `60 seconds`
- Mitigation timeout: `600 seconds`
- Action: `Managed Challenge`

### 3. Investment endpoints

Expression:

```text
(http.host in {"qidra.io" "www.qidra.io"} and (http.request.uri.path eq "/api/investments" or starts_with(http.request.uri.path, "/api/investments/")))
```

Recommended threshold:

- Requests: `60`
- Period: `60 seconds`
- Mitigation timeout: `600 seconds`
- Action: `Managed Challenge`

### 4. Support endpoints

Expression:

```text
(http.host in {"qidra.io" "www.qidra.io"} and starts_with(http.request.uri.path, "/api/support/"))
```

Recommended threshold:

- Requests: `60`
- Period: `60 seconds`
- Mitigation timeout: `600 seconds`
- Action: `Managed Challenge`

## Custom WAF rules

### Challenge non-browser traffic to sensitive APIs

Expression:

```text
(http.host in {"qidra.io" "www.qidra.io"} and http.request.method in {"POST" "PUT" "PATCH" "DELETE"} and (starts_with(http.request.uri.path, "/api/auth/") or starts_with(http.request.uri.path, "/api/wallet/") or http.request.uri.path eq "/api/investments" or starts_with(http.request.uri.path, "/api/investments/") or starts_with(http.request.uri.path, "/api/support/")) and not cf.client.bot)
```

Action:

```text
Managed Challenge
```

### Block direct IP host header

Expression:

```text
(http.host eq "165.22.30.89")
```

Action:

```text
Block
```

## After enabling Cloudflare

Run:

```bash
dig +short NS qidra.io
dig +short A qidra.io
curl -I https://qidra.io
curl -o /dev/null -s -w "%{http_code}\n" https://qidra.io/
```

Expected:

- NS records are Cloudflare nameservers.
- A record resolves to Cloudflare IPs, not directly to `165.22.30.89`.
- `https://qidra.io` returns `200`.
- Cloudflare response headers are present.

Keep nginx rate limiting enabled as a second layer behind Cloudflare.
