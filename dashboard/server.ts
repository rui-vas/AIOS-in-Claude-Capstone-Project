#!/usr/bin/env bun
// AI OS — Operator Console server
// Serves the dashboard and writes subagent files into ../.claude/agents/

import { file, serve } from "bun";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..");
const AGENTS_DIR = join(PROJECT_ROOT, ".claude", "agents");

const PORT = Number(process.env.PORT || 5173);

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "agent";
}

function escapeYaml(s: string) {
  // Minimal: wrap in double quotes, escape backslashes and quotes
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
}

function buildAgentMarkdown(w: {
  name: string;
  role: string;
  desc: string;
  channels?: string;
  tools?: string;
}) {
  const slug = slugify(w.name);
  const front = [
    "---",
    `name: ${slug}`,
    `description: ${escapeYaml(w.desc)}`,
    ...(w.tools ? [`tools: ${w.tools}`] : []),
    "---",
  ].join("\n");

  const body = `
# ${w.name}

**Role:** ${w.role}
${w.channels ? `**Channels:** ${w.channels}\n` : ""}
## Mission

${w.desc}

## Operating Guidelines

- Stay in your lane: this agent owns the ${w.role.toLowerCase()} function.
- Default to action; ask for clarification only when the task is ambiguous.
- Report results back concisely — no preamble, no apology.

## Tools

${w.tools ? `Allowed tools: ${w.tools}` : "Inherits all tools from the parent context."}
`.trimStart();

  return { slug, content: `${front}\n\n${body}` };
}

const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Static
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(file(join(HERE, "index.html")));
    }

    // List existing agents
    if (req.method === "GET" && url.pathname === "/api/agents") {
      if (!existsSync(AGENTS_DIR)) return Response.json({ agents: [] });
      const entries = await readdir(AGENTS_DIR);
      const agents = entries.filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
      return Response.json({ agents });
    }

    // Activate — write subagent file
    if (req.method === "POST" && url.pathname === "/api/activate") {
      try {
        const body = (await req.json()) as {
          name: string;
          role: string;
          desc: string;
          channels?: string;
          tools?: string;
        };
        if (!body.name || !body.desc) {
          return Response.json({ ok: false, error: "name and desc required" }, { status: 400 });
        }
        await mkdir(AGENTS_DIR, { recursive: true });
        const { slug, content } = buildAgentMarkdown(body);
        const path = join(AGENTS_DIR, `${slug}.md`);
        await writeFile(path, content, "utf8");
        return Response.json({ ok: true, slug, path: path.replace(PROJECT_ROOT, "") });
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 500 });
      }
    }

    // Deactivate — delete subagent file
    if (req.method === "POST" && url.pathname === "/api/deactivate") {
      try {
        const body = (await req.json()) as { slug: string };
        if (!body.slug) return Response.json({ ok: false, error: "slug required" }, { status: 400 });
        const path = join(AGENTS_DIR, `${slugify(body.slug)}.md`);
        if (existsSync(path)) await unlink(path);
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`AI OS console → http://localhost:${server.port}`);
console.log(`Writing subagents to ${AGENTS_DIR}`);
