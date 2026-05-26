# AIOS-in-Claude-Capstone-Project

## Overview

We looked at having AI employees that can perform complex stacks across systems, and we used a third-party provider called Spinnable to achieve that. Now we're building our own AI operating system: interconnectivity with different applications, scheduled tasks, and channel access through WhatsApp or Telegram.

Same outcome as Spinnable's AI Employees. Our own setup.

Marta is the first use case.

<img width="1080" height="551" alt="image" src="https://github.com/user-attachments/assets/fe90fadc-1291-4e3f-90c9-8631bfc70e16" />

## Components

<img width="1080" height="542" alt="image" src="https://github.com/user-attachments/assets/4092e785-2df6-48a5-ae16-fa0978978e2e" />

---

## What an AI OS needs (TODO)

Working list of capabilities the OS has to ship. Grouped by layer, not by priority. Reference: Claude Code superpowers / open skills framework for what counts as a "skill," and Composio for connectors.

### 1. Runtime & orchestration
- [ ] Agent loop (plan → tool → observe → repeat) with a chosen base model
- [ ] Multi-agent dispatch (a primary agent that can spawn sub-agents for parallel work)
- [ ] Long-horizon task execution with checkpointing (resume after restart)
- [ ] Worktree / isolation per task so agents don't trample each other
- [ ] Cost & token accounting per agent / per task

### 2. Skills library
- [ ] Catalog of reusable skills, each with a description + trigger conditions (mirror the superpowers pattern: `name`, `description`, when-to-use)
- [ ] Process skills: brainstorming, planning, debugging, code review, verification
- [ ] Writing skills: brand voice, anti-AI style, channel-specific tone
- [ ] Workflow skills: research, summarization, scheduling, drafting
- [ ] Skill discovery: agent reads index at session start, loads skill on demand
- [ ] Skill versioning so old agents don't break when a skill evolves

### 3. Memory
- [ ] Short-term: conversation context, current task state
- [ ] Long-term: facts about the user, preferences, feedback, project state
- [ ] Episodic: what happened in past sessions, decisions made, why
- [ ] Semantic search across memory (vector store)
- [ ] Memory hygiene: dedupe, decay stale entries, resolve conflicts
- [ ] Per-employee memory namespace so Marta's memory is separate from another AI employee's

### 4. Channels (the inbox layer)
- [ ] Telegram — done at the bot level, needs richer attachment handling
- [ ] WhatsApp — spec only, needs implementation
- [ ] iMessage — Mac-only, allowlist-based
- [ ] Email (inbound + outbound) via Gmail
- [ ] Voice in: transcription pipeline (whisper.cpp, done)
- [ ] Voice out: TTS reply option
- [ ] Channel router: one message in any channel reaches the right AI employee with the right context
- [ ] Per-channel access control (who can talk to whom)

### 5. Connectors (the action layer)
Composio is the primary connector library. The OS shouldn't reimplement OAuth per app.
- [ ] Composio integration as the default connector path
- [ ] Multi-account support per app (e.g. 3 Gmail accounts, 2 Drive accounts, each tagged by purpose)
- [ ] Account selection logic: which Gmail to use for a given task, decided by employee + context
- [ ] Calendar (Google Calendar, multiple)
- [ ] Drive / Docs (Google Drive, multiple)
- [ ] Gmail (multiple inboxes)
- [ ] CRM (Notion, Airtable, HubSpot — pick one to start)
- [ ] Payments / billing (Stripe)
- [ ] Storage (S3 / R2 for files the AI produces)
- [ ] Custom MCP servers for the bits Composio doesn't cover

### 6. AI Employees (personas)
- [ ] Employee definition format: role, voice, skills allowlist, connector allowlist, schedule, channels
- [ ] Marta (assistant — first use case)
- [ ] Template for spinning up a new employee from a brief
- [ ] Inter-employee handoff (Marta can ask a research employee for a deep-dive)
- [ ] Shared org context all employees read (company brief, current projects)

### 7. Triggers & scheduling
- [ ] Cron-based recurring jobs (daily briefing, weekly review)
- [ ] Event triggers (new email matching X, calendar event 10 min before)
- [ ] Manual triggers from a channel ("Marta, do X")
- [ ] One-shot scheduled tasks ("remind me at 3pm")
- [ ] Trigger conflict resolution (two triggers firing at once)

### 8. Knowledge base
- [ ] Vector index of project docs, past outputs, brand voice files
- [ ] RAG over the knowledge base for any employee
- [ ] Per-project knowledge isolation
- [ ] Auto-ingest from Drive / Notion when a doc changes

### 9. Dashboard & control plane
- [ ] Live view of running agents and their tasks (the `dashboard/` is the start of this)
- [ ] Cost / usage per employee
- [ ] Logs and traces per task (what did the agent decide, what did it call, what did it return)
- [ ] Kill switch + pause per employee
- [ ] Approval queue for high-stakes actions

### 10. Safety & guardrails
- [ ] Per-employee permissions: which tools, which data, which channels
- [ ] Human-in-the-loop for irreversible actions (sending external email, payments, deletes)
- [ ] Prompt injection defense on inbound channels (especially Telegram / email)
- [ ] Secrets management (never store keys in agent context)
- [ ] Audit log of every external action

### 11. Identity & access
- [ ] Who is the user talking to me right now (per channel allowlist)
- [ ] Multi-tenant ready (later — Rui first, others later)
- [ ] Service account separation: each Composio account is a distinct identity

### 12. Voice & writing layer
- [ ] Brand voice files (done — `ABOUT-ME/`)
- [ ] Voice enforcement: every external output passes through a voice check
- [ ] Per-channel formatting (Telegram is terse, email can be longer)

### 13. Observability
- [ ] Structured logs per agent run
- [ ] Latency, token, and cost metrics
- [ ] Failure alerting (a job didn't run, an integration broke)
- [ ] Replay: re-run a past task with the same inputs

---

## Open questions

- Hosting: local Mac vs. cloud vs. hybrid. Where does the always-on runtime live?
- Base agent: Claude Code as the runtime, or a custom loop on top of the Anthropic SDK?
- Persistence: SQLite for memory + Postgres for connectors? Or one store?
- Cost model: per-employee budget caps and what happens when hit
- Eval: how do we know an employee is doing a good job, not just running

## Confirm before next step

- "OpenClaw" in the brief — assumed this means **Claude Code's superpowers / open skills framework** (the `docs/superpowers/` dir is the local mirror). Flag if wrong.
