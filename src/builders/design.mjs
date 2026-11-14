// Design builder: deterministic, original SVG artwork generated from the
// bounty brief — a typographic broadsheet poster, with a small geometric owl
// mark (the Proof Owl) for the mascot bounty. No stock art, no copied logo,
// no network calls: the same input always produces the same file.
import fs from "node:fs";
import path from "node:path";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 6);
}

function owlMark(cx, cy, s) {
  // Minimal geometric owl: body, ear tufts, eyes, beak. Original mark.
  return (
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    `<ellipse cx="0" cy="10" rx="52" ry="58" fill="#111"/>` +
    `<polygon points="-38,-32 -22,-58 -8,-34" fill="#111"/>` +
    `<polygon points="38,-32 22,-58 8,-34" fill="#111"/>` +
    `<circle cx="-20" cy="-6" r="16" fill="#f5f1e6"/><circle cx="20" cy="-6" r="16" fill="#f5f1e6"/>` +
    `<circle cx="-20" cy="-6" r="7" fill="#111"/><circle cx="20" cy="-6" r="7" fill="#111"/>` +
    `<polygon points="0,4 -9,16 9,16" fill="#c0392b"/>` +
    `<rect x="-34" y="-46" width="68" height="10" fill="#1e6b3a"/>` +
    `</g>`
  );
}

function posterSvg({ masthead, title, brief, mascot }) {
  const briefLines = wrapText(brief, 58);
  const briefText = briefLines
    .map((l, i) => `<text x="600" y="${880 + i * 34}" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#222">${esc(l)}</text>`)
    .join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <rect width="1200" height="1600" fill="#f5f1e6"/>
  <rect x="40" y="40" width="1120" height="1520" fill="none" stroke="#111" stroke-width="3"/>
  <line x1="70" y1="230" x2="1130" y2="230" stroke="#111" stroke-width="4"/>
  <line x1="70" y1="290" x2="1130" y2="290" stroke="#111" stroke-width="2"/>
  <text x="600" y="190" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="130" fill="#111">${esc(masthead)}</text>
  <text x="600" y="272" text-anchor="middle" font-family="Georgia, serif" font-size="24" letter-spacing="4" fill="#111">THE ARENA EDITION</text>
  ${mascot ? owlMark(600, 470, 1.6) : ""}
  <text x="600" y="700" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="64" fill="#111">${esc(title)}</text>
  <line x1="70" y1="760" x2="1130" y2="760" stroke="#111" stroke-width="3"/>
  ${briefText}
  <rect x="70" y="1120" width="1060" height="110" fill="#111"/>
  <text x="600" y="1190" text-anchor="middle" font-family="monospace" font-size="34" fill="#4ade80">$ prove --verify entry … ✓ PROVEN</text>
  <text x="600" y="1310" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="30" fill="#222">Your agent builds it. A sandbox proves it. Paid in stock.</text>
  <line x1="70" y1="1400" x2="1130" y2="1400" stroke="#111" stroke-width="2"/>
  <text x="600" y="1460" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="3" fill="#555">BROADSHEET × TERMINAL — ORIGINAL WORK BY THE AIPROVE AGENT</text>
</svg>
`;
}

export function buildDesign(bounty, workdir) {
  const dir = path.join(workdir, bounty.slug);
  fs.mkdirSync(dir, { recursive: true });
  const mascot = bounty.slug === "aiprove-mascot";
  const svg = posterSvg({
    masthead: "AIProve",
    title: bounty.title || bounty.slug,
    brief: bounty.brief || "",
    mascot,
  });
  fs.writeFileSync(path.join(dir, "poster.svg"), svg);
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# ${bounty.title}\n\n` +
      `Entry for the AIProve bounty \`${bounty.slug}\` (${bounty.lane}, ${bounty.metric}).\n\n` +
      `Artwork: \`poster.svg\` — an original broadsheet-style poster generated\n` +
      `deterministically by the AIProve agent (handle kay-goblog) from the bounty\n` +
      `brief. No stock art, no copied logo: the AIProve wordmark here is a\n` +
      `typographic riff and the owl is a geometric mark drawn for this entry.\n` +
      `${mascot ? `\nMascot: the Proof Owl — a stern broadsheet proofreader in a green\nprinter's eyeshade, drawn as a geometric mark so it scales from a badge to\na billboard.\n` : ""}\n` +
      `Regenerate: run the agent loop; the same brief always produces the same file.\n`
  );
  return {
    dir,
    linkFile: "poster.svg",
    summary: `SVG poster generated for ${bounty.slug} (${svg.length} bytes, deterministic)`,
  };
}
