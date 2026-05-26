# AI Employee Format — Design Spec

**Date:** 2026-05-26
**Status:** Approved (pending user review of this doc)
**Author:** Rui Vas + Claude

---

## Purpose

Define the file format and runtime contract for an "AI Employee" in the AI OS. An employee is a persona with a role, voice, channel access, connector access, skills, triggers, memory scope, and a budget. Marta is the first instance.

The format has to do two jobs:
1. Boot a working agent today inside Claude Code (where Marta already lives).
2. Survive a swap to a custom runtime daemon later, when employees need to run autonomously on schedules and events outside an interactive session.

## Decisions

| Question | Choice |
|---|---|
| Coupling to Claude Code | **Hybrid.** Portable YAML spec is source of truth; compiles to Claude Code `.md` subagent + runtime JSON. |
| Trigger model | **Schedule + channel + event.** All three declared in the spec from day 1; rolled out in that order. |
| Access control | **Explicit allowlist with `preset:` shorthand.** Presets resolve to full allowlists at compile time so the runtime always sees the explicit list. |
| Memory model | **Shared org namespaces + private per-employee scratch.** Org facts live once; per-employee state is namespaced and isolated. |
| Voice | **Inline block OR `$ref:` to a file.** Files for rich, reused voices; blocks for throwaways. |

## File Layout

```
employees/
  marta.yaml              # the spec (source of truth)
  andre.yaml
  _voices/
    marta-pt.md           # reusable voice docs ($ref'd from specs)
  _presets/
    assistant.yaml        # role bundles (allowlists, default triggers)
    researcher.yaml
  _compiled/              # generated, gitignored
    marta.md              # Claude Code subagent file
    marta.runtime.json    # resolved spec for the OS daemon
    andre.md
    andre.runtime.json
```

Rules:
- One employee = one YAML file. No nesting, no multi-employee files. Diffs stay clean.
- `_`-prefixed dirs hold referenced content (voices, presets), not standalone employees.
- `_compiled/` is generated and gitignored — never edited by hand.

## Schema

Worked example (Marta):

```yaml
# employees/marta.yaml
name: marta
role: "Inbox triage & daily briefing"
preset: assistant                    # bundle of skills/connectors; overridable below

voice:
  $ref: ./_voices/marta-pt.md        # or inline block (see andre.yaml)

memory:
  shared: [org, projects, people]    # which org namespaces she reads
  # private memory is implicit, always on, namespaced to `marta`

channels:
  - telegram                          # listens here
  - email                             # later

triggers:
  - type: schedule
    cron: "0 8 * * *"                # 8am daily
    task: morning_briefing
  - type: channel
    on: [telegram, email]            # respond to inbound
  - type: event                      # example shape
    source: gmail
    match: "from:nifty.com label:urgent"
    task: flag_urgent

skills:                              # explicit allowlist on top of preset
  extra: [calendar-briefing, email-triage]
  deny:  [code-review]               # exclude one the preset includes

connectors:
  gmail:    [rui-assistant]          # which Composio account(s) she can use
  calendar: [rui-personal]
  drive:    [rui-shared]

permissions:
  human_in_loop:                     # actions that need approval
    - send_external_email
    - calendar_invite_create
  budget:
    daily_tokens: 200000
    daily_usd: 5

tasks:                               # named jobs the triggers reference
  morning_briefing:
    description: "Compose daily briefing in PT and send to Rui's Telegram"
    output: telegram:rui
  flag_urgent:
    description: "Summarize + ping Rui"
    output: telegram:rui
```

### Field reference

- `name` (required) — unique slug, lowercase. File stem must match.
- `role` (required) — one-line job description.
- `preset` (optional) — string referencing a file in `_presets/`. Merged under explicit fields.
- `voice` (required) — block with `tone`, `language`, `formatting`, etc., OR `{ $ref: path }` to a markdown file.
- `memory.shared` (optional, default `[]`) — list of org-level namespace names this employee mounts read-only.
- `memory.private` — implicit, always on, namespace `<name>`.
- `channels` (required, ≥1) — list of channel names the employee listens on.
- `triggers` (required, ≥1) — array of trigger objects:
  - `type: schedule` — `cron:` string + `task:` reference
  - `type: channel` — `on:` list of channels (subset of `channels`)
  - `type: event` — `source:` + `match:` + `task:` reference
- `skills.extra` — skills added beyond the preset.
- `skills.deny` — skills excluded from the preset.
- `connectors.<app>: [account_ids]` — Composio accounts the employee may use. Empty list = no access to that app.
- `permissions.human_in_loop` — action names that block on approval queue.
- `permissions.budget` — daily caps; employee pauses on hit.
- `tasks` — map of named jobs. Each task has `description` and `output` (channel target, file path, or `employee:<name>` handoff).

## Compile Pipeline

`employees compile <name>` (or `employees compile --all`):

1. Read `employees/<name>.yaml`.
2. Resolve `preset` → merge its skills/connectors/permissions defaults *under* the explicit fields (explicit wins).
3. Resolve `voice.$ref` → inline the markdown body.
4. Resolve `memory.shared` → list of mountable namespace paths.
5. Validate:
   - Every skill in `extra` exists in the skill registry.
   - Every Composio account in `connectors` is currently connected.
   - Every channel in `channels` is configured.
   - Every `task` referenced by a trigger is defined in `tasks`.
   - Every `output` target resolves.
6. Emit two artifacts:
   - `_compiled/<name>.md` — Claude Code subagent (frontmatter + system prompt assembled from role + voice + operating guidelines + tools list).
   - `_compiled/<name>.runtime.json` — fully resolved spec for the OS daemon (triggers, schedules, budgets, allowlists).

Validation errors block both artifacts from being written.

## Runtime Flow

Per trigger fire:

```
trigger fires (cron / channel msg / event)
    │
    ▼
OS daemon looks up employee + task in runtime.json
    │
    ▼
spawn isolated agent session
  - mount memory namespaces (shared + private/<name>)
  - load voice + operating guidelines as system prompt
  - load skill allowlist
  - bind connector accounts (Composio tokens scoped to allowlisted accounts)
    │
    ▼
agent executes task
    │
    ▼
gate: is any pending action in permissions.human_in_loop?
  yes → queue for approval (dashboard) → wait
  no  → proceed
    │
    ▼
write output to task.output target (channel / file / employee handoff)
write run record to logs + private memory
update budget counters
```

## Error Handling & Lifecycle

- **Compile-time validation errors:** block artifact write, print path + reason.
- **Runtime errors** (connector down, model overloaded, transient network): retry with exponential backoff up to 3 times, then notify Rui via the employee's primary channel with a one-line failure summary and the run ID.
- **Budget hit:** employee pauses, sends one notification, doesn't fire again until reset or manually resumed via dashboard.
- **Approval timeout:** if a human-in-loop action sits unapproved beyond a per-task timeout (default 24h), the task is marked `expired` and logged; no retry.
- **Trigger collision:** if two triggers for the same employee fire simultaneously and the employee is mid-task, the second queues. Queue depth is capped per employee (default 5); overflow drops oldest with a notification.

## Open Items

- **Preset definitions:** the `_presets/assistant.yaml` and `_presets/researcher.yaml` contents are not specified here. Define when the first second-employee ships.
- **Output target grammar:** `telegram:rui`, `file:/path`, `employee:research` — formal grammar TBD when implementing the dispatcher.
- **Skill registry source of truth:** where does the compiler look up valid skill names? Likely `skills/` dir in the OS repo. Confirm when the skill layer is designed.
- **Memory namespace schema:** what does an `org` namespace look like on disk? Decided when the memory layer is designed.

These do not block this spec — they are downstream specs that will reference this one.

## Non-Goals

- No multi-tenant support in v1 (Rui is the only user).
- No web-based employee editor — YAML files only.
- No hot-reload — re-run `employees compile` to pick up changes.
- No employee-to-employee direct messaging beyond declared `output: employee:<name>` handoffs.
