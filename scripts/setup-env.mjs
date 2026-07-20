/**
 * Interactive credential setup.
 *
 * This project ships no API keys. Anyone who clones it supplies their own, and this walks through
 * that once. Values are written to .env.local, which is gitignored, so nothing entered here can be
 * committed by accident.
 *
 * Run directly with: node scripts/setup-env.mjs
 * The install and run launchers call it automatically when .env.local is missing or incomplete.
 */

import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = join(ROOT, ".env.local");

const FIELDS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase project URL",
    where: "supabase.com/dashboard -> your project -> Project Settings -> API",
    hint: "Looks like https://abcdefghijk.supabase.co",
    required: true,
    validate: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v) || "That does not look like a Supabase project URL.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon key",
    where: "same page, the key labelled anon or publishable",
    hint: "Safe to expose to browsers; row level security constrains it",
    required: true,
    validate: (v) => v.startsWith("ey") || "Expected a JWT starting with 'ey'.",
  },
  {
    key: "TAVILY_API_KEY",
    label: "Tavily API key",
    where: "tavily.com -> dashboard",
    hint: "Used for open-web creator discovery",
    required: true,
  },
  {
    key: "YOUTUBE_API_KEY",
    label: "YouTube Data API v3 key",
    where: "console.cloud.google.com -> enable YouTube Data API v3 -> Credentials",
    hint: "Restrict it to the YouTube Data API",
    required: true,
  },
  {
    key: "GEMINI_API_KEY",
    label: "Google Gemini API key",
    where: "aistudio.google.com -> Get API key",
    hint: "Used to draft outreach copy",
    required: true,
  },
  {
    key: "GEMINI_MODEL",
    label: "Gemini model override",
    where: "optional",
    hint: "Leave blank to use gemini-flash-latest",
    required: false,
  },
  {
    key: "GMAIL_USER",
    label: "Gmail sending address",
    where: "optional, needed only to send outreach",
    hint: "Use a dedicated account, not your personal inbox",
    required: false,
  },
  {
    key: "GMAIL_APP_PASSWORD",
    label: "Gmail App Password",
    where: "myaccount.google.com/apppasswords, after enabling 2-Step Verification",
    hint: "16 characters. Never your account password",
    required: false,
    transform: (v) => v.replace(/\s+/g, ""),
  },
];

function readExisting() {
  if (!existsSync(ENV_PATH)) return {};
  const out = {};
  // Split on /\r?\n/: the file may carry CRLF, and JS "." does not match \r.
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const mask = (value) => {
  if (!value) return "";
  if (value.length <= 8) return "*".repeat(value.length);
  return `${value.slice(0, 4)}${"*".repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
};

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const existing = readExisting();

  console.log("");
  console.log("  Creator Match credential setup");
  console.log("  ------------------------------");
  console.log("  This project ships no keys of its own. Enter yours below.");
  console.log("  They are written to .env.local, which git ignores.");
  console.log("  Press Enter to keep an existing value or skip an optional one.");

  const values = { ...existing };

  for (const field of FIELDS) {
    console.log("");
    console.log(`  ${field.label}${field.required ? "" : "  (optional)"}`);
    console.log(`    where: ${field.where}`);
    console.log(`    ${field.hint}`);
    const current = existing[field.key];
    if (current) console.log(`    current: ${mask(current)}`);

    for (;;) {
      const answer = (await rl.question("    > ")).trim();

      if (!answer) {
        if (current) break;
        if (!field.required) {
          values[field.key] = "";
          break;
        }
        console.log("    This one is required.");
        continue;
      }

      const value = field.transform ? field.transform(answer) : answer;
      const verdict = field.validate ? field.validate(value) : true;
      if (verdict !== true) {
        console.log(`    ${verdict}`);
        continue;
      }
      values[field.key] = value;
      break;
    }
  }

  rl.close();

  const ordered = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TAVILY_API_KEY",
    "YOUTUBE_API_KEY",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
  ];
  const body = ordered.map((key) => `${key}=${values[key] ?? ""}`).join("\n");
  writeFileSync(ENV_PATH, `${body}\n`, { encoding: "utf8" });

  const missingSend = !values.GMAIL_USER || !values.GMAIL_APP_PASSWORD;
  console.log("");
  console.log("  Wrote .env.local");
  if (missingSend) {
    console.log("  Gmail is not configured, so outreach drafting works but sending returns 503.");
  }
  console.log("");
  console.log("  Remaining manual step: apply supabase/migrations/202607200001_initial.sql");
  console.log("  in your Supabase SQL editor, and allowlist /auth/callback under");
  console.log("  Authentication -> URL Configuration. See the README for detail.");
  console.log("");
}

main().catch((error) => {
  console.error("  Setup failed:", error.message);
  process.exit(1);
});
