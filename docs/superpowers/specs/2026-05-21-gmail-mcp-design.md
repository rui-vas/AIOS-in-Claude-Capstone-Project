# Gmail MCP Channel — Design

Status: approved 2026-05-21
Owner: Rui Vas

## Goal

Give Claude Code first-class access to two Gmail accounts (`company` = hi@superoperator.ai, `personal` = rui.vas10x@gmail.com) for inbox triage: read, search, label/archive, and draft replies. No outbound sending — drafts only, the user sends manually from Gmail.

## Why a local MCP server (not the hosted connector)

Anthropic's hosted Gmail connector supports a single Google account per Claude session. Re-authing replaces the previous account. This project needs both accounts available in parallel, which only a local server holding two refresh tokens can do.

## Architecture

Local MCP server, same pattern as the existing telegram channel.

- Location: `~/.claude/channels/gmail/`
- Stack: Bun + TypeScript
- Libraries: `@modelcontextprotocol/sdk` (MCP), `googleapis` (Gmail)
- Registered in `~/.claude/mcp.json` so all Claude Code sessions pick it up after `/reload-plugins`
- One OAuth Desktop client (user creates in GCP); each account authorizes independently against it and produces its own refresh token

```
~/.claude/channels/gmail/
├── server.ts              # MCP server (stdio)
├── auth.ts                # CLI for `bun run auth <alias>`
├── gmail.ts               # Thin Gmail API client (auth + helpers)
├── package.json
├── oauth-client.json      # gitignored, user-supplied
└── tokens/
    ├── company.json       # refresh token (chmod 600)
    └── personal.json      # refresh token (chmod 600)
```

## Tools

All tools take `account: "company" | "personal"`. Unknown alias → structured error.

| Tool | Args | Returns |
|---|---|---|
| `gmail_search` | `account`, `query`, `maxResults?`, `pageToken?` | message IDs + snippets + threadId + nextPageToken |
| `gmail_get` | `account`, `messageId`, `format?: "full" \| "metadata"` | headers, text body, html body, attachment list (no content) |
| `gmail_draft` | `account`, `to`, `cc?`, `bcc?`, `subject`, `body`, `replyToMessageId?`, `threadId?` | draftId, messageId |
| `gmail_modify` | `account`, `messageId`, `addLabels?: string[]`, `removeLabels?: string[]` | updated labelIds |
| `gmail_labels` | `account` | array of `{id, name, type}` |

Deliberately excluded (YAGNI, add later if needed): send, trash/delete, attachment download, filter management, batch ops.

`gmail_draft` threads correctly: when `replyToMessageId` is set, the draft sets `In-Reply-To` and `References` headers and reuses the source message's `threadId`.

## OAuth

- Scopes: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.modify`, `https://www.googleapis.com/auth/gmail.compose`
- Client type: Desktop app (loopback redirect, no client secret protection needed beyond filesystem)
- Consent screen: External, both Gmail addresses added as test users so the app stays in Testing mode (no verification required)
- Workspace note: `superoperator.ai` is a Workspace domain. If admin restricts third-party OAuth apps, user must whitelist their own OAuth client in the Workspace admin console.

## Setup flow (one-time)

1. In GCP project: enable Gmail API; configure External OAuth consent screen with the three scopes above; add both Gmail addresses as test users; create Desktop OAuth client; download JSON.
2. Place JSON at `~/.claude/channels/gmail/oauth-client.json`.
3. `cd ~/.claude/channels/gmail && bun install`
4. `bun run auth company` — opens browser, sign in as hi@superoperator.ai, consent. Local server captures loopback callback, exchanges code, writes `tokens/company.json` (mode 0600).
5. `bun run auth personal` — same for rui.vas10x@gmail.com.
6. `/reload-plugins` in Claude Code. Tools appear as `mcp__gmail__*`.

## Token handling

- Only refresh tokens persist on disk.
- Access tokens minted on demand by `googleapis` OAuth2 client and held in memory.
- Token files mode 0600.
- `tokens/` and `oauth-client.json` listed in `.gitignore`.
- Refresh failure (revoked/expired) → tool returns `{error: "auth_failed", code: "invalid_grant", hint: "run: bun run auth <alias>"}`.

## Error handling

Each tool wraps Gmail API calls and returns structured errors:

```ts
{ error: string, code: string, hint?: string }
```

Categories:
- `auth_failed` — refresh token bad → instruct user to re-auth
- `not_found` — invalid messageId/labelId
- `rate_limited` — Gmail quota → suggest retry
- `bad_request` — malformed args (e.g. unknown account alias) → echo what was wrong
- `upstream` — anything else with the Gmail error code passed through

## MCP registration

`~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "bun",
      "args": ["run", "--cwd", "/Users/ruivas/.claude/channels/gmail", "--silent", "server.ts"]
    }
  }
}
```

If `~/.claude/mcp.json` already exists, merge into existing `mcpServers` rather than overwriting.

## Testing approach

- Unit: pure helpers (header parsing, MIME assembly for drafts, label name → id lookup) — fast, no network
- Integration: against a real test account using recorded fixtures (skip in CI absent token); enough to confirm tool shapes round-trip
- Manual: walk through search → get → draft → modify with both aliases after setup

## Out of scope

- Sending mail (drafts only by design)
- Attachment upload/download
- Calendar, Contacts, other Google APIs
- Push notifications / webhook-driven triage (would need server.ts to be long-running and Pub/Sub plumbing; revisit later)
- More than two accounts (trivial extension when needed — drop another `tokens/<alias>.json`)
