import { readFileSync } from "node:fs";

// The assignment fixes the copy lengths, and the app enforces them at generation and send time.
// These files are the human-authored reference set, so they are held to the identical bounds.
const FILES = [
  { path: "deliverables/email-templates.md", label: "email", min: 60, max: 90 },
  { path: "deliverables/instagram-dm-templates.md", label: "DM", min: 15, max: 30 },
];

const BLOCK = /```text\n([\s\S]*?)```/g;
const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;

let failures = 0;
let checked = 0;

for (const file of FILES) {
  const source = readFileSync(new URL(`../${file.path}`, import.meta.url), "utf8");
  const blocks = [...source.matchAll(BLOCK)].map((match) => match[1]);

  if (!blocks.length) {
    console.error(`✗ ${file.path}: no template blocks found`);
    failures += 1;
    continue;
  }

  blocks.forEach((block, index) => {
    const words = countWords(block);
    const ok = words >= file.min && words <= file.max;
    checked += 1;
    if (!ok) {
      failures += 1;
      console.error(`✗ ${file.path} ${file.label} #${index + 1}: ${words} words, expected ${file.min}–${file.max}`);
    } else {
      console.log(`✓ ${file.label} #${index + 1}: ${words} words`);
    }
  });
}

if (failures) {
  console.error(`\n${failures} template(s) outside the required range.`);
  process.exit(1);
}
console.log(`\nAll ${checked} templates are within range.`);
