# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI OS Capstone Project is a research and design initiative exploring AI operating system concepts. The repository documents:
- Personal brand voice and writing guidelines (ABOUT-ME/)
- Channel integrations for AI systems (channels/)
- Design specifications and system architectures
- n8n workflows for specific use cases (real estate, email triage)

This is not a traditional software project with tests or continuous integration — it's a design and research repository. Work focuses on documentation, workflow design, and system architecture.

## Key Context Files

**Read these first when starting work:**

1. **ABOUT-ME/** — brand voice, writing style, personal brand guidelines
   - `personal-brand.md` — personal positioning and values
   - `anti-ai-writing-style.md` — what NOT to sound like; authentic voice guidelines
   - `ainauts-space-brand-voice.md` — professional brand voice for company context

2. **Memory.md** — your persistent knowledge base across sessions
   - Sections: Voice, Process, People, Projects, Output, Tools
   - Update this after each session when you learn something new or get corrected
   - Keep it current; replace outdated info rather than appending

## Project Structure

```
├── ABOUT-ME/                    # Brand and voice documentation
├── channels/                    # Channel integrations (Telegram, WhatsApp)
├── context/                     # Context files for specific tasks (may be empty)
├── docs/                        # Reference docs (e.g. superpowers/)
├── mcps/                        # MCP server notes / configs
├── .claude/                     # Claude Code project settings
└── CLAUDE.md / Memory.md        # This file and knowledge base
```

## Commands

There is no build, test, or lint pipeline — this is a documentation and design repo. Don't look for `package.json`, `Makefile`, or CI configs. Work is verified by reading the resulting `.md` / workflow JSON, not by running it.

## Architecture Notes

**n8n Workflows:** Prior 4-workflow pipelines (real estate, email triage) live in sibling directories outside this project root (e.g. `../real-estate-ai/`), not in this repo. Git history of *this* directory references them (commits `271c8cf`, `882ebeb`) but the files are not checked in here. Restore from those commits or the sibling dir if you need to reference them.

**Channel System:** `channels/telegram.md` and `channels/whatsapp.md` are placeholders for channel integration specifications. These represent the channel abstraction layer of the AI OS.

## Startup Routine

When beginning any session:
1. Read ABOUT-ME files relevant to the task (brand voice, writing style)
2. Read Memory.md to understand prior learning and context
3. Read context/ if present (user may have staged specific background for the task)
4. Use git log to understand project history and prior decisions

## Writing and Tone

This project has specific brand and writing guidelines. Always:
- Check ABOUT-ME/anti-ai-writing-style.md before writing copy
- Follow the personal brand voice from ABOUT-ME/personal-brand.md
- Use authentic, non-corporate AI voice (not ChatGPT-style hedging)

## Git Workflow

- Primary branch: `main`
- All work should be committed with clear, descriptive messages
- Use conventional commits when possible (feat: ..., fix: ..., docs: ...)
- Document design decisions in the commit message or related .md file

## Memory System

The local `Memory.md` in this repo is the **project knowledge base** — the authoritative source for Voice/Process/People/Projects/Output/Tools. It is separate from Claude Code's auto-memory at `~/.claude/projects/.../memory/` (which is a user-scoped index of small facts across sessions). When the two disagree on project-specific context, trust local `Memory.md`.

Keep Memory.md up to date with sections:
- **Voice** — tone, phrasing, writing corrections from user feedback
- **Process** — how tasks should be done, workflows, preferences
- **People** — who's involved, relationships, context
- **Projects** — active work, deadlines, current status, blockers
- **Output** — expected formats, naming conventions, delivery preferences
- **Tools** — which tools to use, how to use them, integrations

When corrected on tone, process, or preferences, immediately update the relevant section. Replace outdated information in place rather than appending.

## Common Tasks

**Design Documentation:** Write in the brand voice, reference ABOUT-ME for guidelines.

**Channel Implementation:** Reference channels/ structure; design should follow AI OS abstraction patterns.

**Workflow Design:** Review prior n8n work in git history (commits 271c8cf, 882ebeb) for patterns and conventions.

**Research/Analysis:** Document findings in .md files; update Memory.md with non-obvious insights.
