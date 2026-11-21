// GTA 5 vs GTA 6 — One Road, Two Generations.
// A split-screen comparison Short for the make.fun gta6-clipper-01 bounty.
//
// The idea: one action, two generations of Grand Theft Auto. The top half
// plays GTA VI (Trailer 2, Rockstar Games) — Jason driving, then the
// first-person causeway run into Vice City. The bottom half answers with
// GTA V (official trailer, Rockstar Games) — the blue convertible cruising
// Los Santos, then the red sports car. A giant hook lands in the first
// three seconds, each half carries its game label the whole way through,
// and an end card asks the only question that matters: which one wins?
//
// Default run (no arguments) copies VIDEO.json next to this file, which is
// the record the bounty grader reads. Render mode rebuilds the video:
//
//   bun main.ts --render <gta6-source> <gta5-source> <out.mp4>
//
// Sources are the two official trailers; they are inputs, not deliverables,
// so they are not committed to the repository.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";

// ---------------------------------------------------------------------------
// The edit plan. Times are seconds into each trailer. Both sides must show
// the same action — driving — for the whole main segment.
// ---------------------------------------------------------------------------

interface Slice {
  from: number;
  to: number;
}

interface Side {
  label: string;
  year: string;
  slices: Slice[];
  // Crop window inside the source frame, before scaling to the panel.
  crop: { w: number; h: number; x: number; y: number };
}

const PLAN = {
  canvas: { w: 1080, h: 1920, fps: 30 },
  panel: { w: 1080, h: 920 },
  bandH: 80, // black divider band between the two panels, carries the VS badge
  endCardSec: 2.6,
  top: {
    label: "GTA 6",
    year: "2026",
    // Trailer 2 is 1920x1080 letterboxed; the picture lives at y 108..972.
    crop: { w: 1014, h: 864, x: 453, y: 108 },
    slices: [
      { from: 27.5, to: 32.5 }, // Jason at the wheel, laughing
      { from: 35.2, to: 37.4 }, // first-person causeway drive into the city
    ],
  } as Side,
  bottom: {
    label: "GTA 5",
    year: "2013",
    // The GTA V trailer file is 1280x720, picture fills the frame.
    crop: { w: 845, h: 720, x: 217, y: 0 },
    slices: [
      { from: 49.2, to: 51.2 }, // blue convertible, palm-lined avenue
      { from: 64.3, to: 69.5 }, // red sports car chase, aerial, explosion
    ],
  } as Side,
  // Audio comes from the GTA VI side only: one score, no duelling trailers.
  // It follows the same slices as the top picture so cuts stay in sync.
  audioSlices: [
    { from: 27.5, to: 32.5 },
    { from: 35.2, to: 37.4 },
  ] as Slice[],
  hook: [
    { text: "ONE ROAD.", size: 168, color: "white", y: 878, from: 0.0, to: 1.4 },
    { text: "TWO GENERATIONS.", size: 96, color: "yellow", y: 900, from: 1.4, to: 3.4 },
  ],
  endCard: {
    lines: [
      { text: "WHICH ONE", size: 148, color: "white", y: 800 },
      { text: "WINS?", size: 148, color: "yellow", y: 960 },
      { text: "DROP YOUR PICK BELOW", size: 52, color: "white", y: 1180 },
    ],
  },
};

function sideDuration(side: Side): number {
  return side.slices.reduce((sum, s) => sum + (s.to - s.from), 0);
}

// One side of the split: trim its slices, join them, crop, scale, pad the
// frame rate. Returns the filter fragment and the label of its output pad.
function buildSide(
  inputIdx: number,
  side: Side,
  tag: string,
  parts: string[],
): string {
  const pads: string[] = [];
  side.slices.forEach((s, i) => {
    const pad = `${tag}s${i}`;
    parts.push(
      `[${inputIdx}:v]trim=start=${s.from}:end=${s.to},setpts=PTS-STARTPTS,` +
        `crop=${side.crop.w}:${side.crop.h}:${side.crop.x}:${side.crop.y},` +
        `scale=${PLAN.panel.w}:${PLAN.panel.h},fps=${PLAN.canvas.fps}[${pad}]`,
    );
    pads.push(`[${pad}]`);
  });
  parts.push(`${pads.join("")}concat=n=${pads.length}:v=1:a=0[${tag}]`);
  return tag;
}

function drawText(opts: {
  text: string;
  size: number;
  color: string;
  x: string;
  y: number;
  border?: number;
  box?: boolean;
  enable?: string;
}): string {
  let f =
    `drawtext=fontfile=${FONT}:text='${opts.text}':fontsize=${opts.size}` +
    `:fontcolor=${opts.color}:x=${opts.x}:y=${opts.y}`;
  if (opts.border !== undefined) {
    f += `:borderw=${opts.border}:bordercolor=black`;
  }
  if (opts.box) {
    f += `:box=1:boxcolor=black@0.55:boxborderw=18`;
  }
  if (opts.enable) {
    f += `:enable='${opts.enable}'`;
  }
  return f;
}

function buildFilter(): string {
  const parts: string[] = [];
  const topTag = buildSide(0, PLAN.top, "top", parts);
  const botTag = buildSide(1, PLAN.bottom, "bot", parts);
  const mainSec = sideDuration(PLAN.top);

  // Stack: top panel, black band, bottom panel.
  parts.push(
    `color=c=black:s=${PLAN.canvas.w}x${PLAN.panel.h * 2 + PLAN.bandH}:r=${PLAN.canvas.fps}:d=${mainSec}[base]`,
  );
  parts.push(`[base][${topTag}]overlay=0:0[st1]`);
  parts.push(`[st1][${botTag}]overlay=0:${PLAN.panel.h + PLAN.bandH}[stack]`);

  // Labels ride the whole main segment; the VS badge sits in the band.
  const labelY2 = PLAN.panel.h + PLAN.bandH + 26;
  let chain =
    `[stack]` +
    drawText({
      text: PLAN.top.label,
      size: 62,
      color: "white",
      x: "36",
      y: 30,
      box: true,
    }) +
    "," +
    drawText({
      text: PLAN.top.year,
      size: 40,
      color: "yellow",
      x: "40",
      y: 128,
      border: 3,
    }) +
    "," +
    drawText({
      text: PLAN.bottom.label,
      size: 62,
      color: "white",
      x: "36",
      y: labelY2,
      box: true,
    }) +
    "," +
    drawText({
      text: PLAN.bottom.year,
      size: 40,
      color: "yellow",
      x: "40",
      y: labelY2 + 98,
      border: 3,
    }) +
    "," +
    drawText({
      text: "VS",
      size: 54,
      color: "white",
      x: "(w-text_w)/2",
      y: PLAN.panel.h + 8,
      border: 4,
    });
  for (const h of PLAN.hook) {
    chain +=
      "," +
      drawText({
        text: h.text,
        size: h.size,
        color: h.color,
        x: "(w-text_w)/2",
        y: h.y,
        border: 7,
        enable: `between(t,${h.from},${h.to})`,
      });
  }
  parts.push(chain + "[mainv]");
  // The main segment feeds both the final concat and the end-card source.
  parts.push(`[mainv]split=2[mainvA][mainvB]`);

  // End card: the split screen, blurred hard, with the question on top.
  const cardFrames = Math.round(PLAN.endCardSec * PLAN.canvas.fps);
  parts.push(
    `[mainvA]trim=start=${mainSec - 0.1}:end=${mainSec},setpts=PTS-STARTPTS,` +
      `boxblur=18:2,trim=end_frame=1,loop=loop=${cardFrames}:size=1,` +
      `setpts=N/(${PLAN.canvas.fps}*TB)[cardbg]`,
  );
  let card = "[cardbg]";
  PLAN.endCard.lines.forEach((line, i) => {
    card += drawText({
      text: line.text,
      size: line.size,
      color: line.color,
      x: "(w-text_w)/2",
      y: line.y,
      border: 6,
    });
    if (i < PLAN.endCard.lines.length - 1) card += ",";
  });
  parts.push(card + "[cardv]");
  parts.push(
    `[mainvB][cardv]concat=n=2:v=1:a=0,format=yuv420p[outv]`,
  );

  // Audio: GTA VI slices for the main segment, silence under the end card.
  const musicPads: string[] = [];
  PLAN.audioSlices.forEach((s, i) => {
    const pad = `mus${i}`;
    parts.push(
      `[0:a]atrim=start=${s.from}:end=${s.to},asetpts=PTS-STARTPTS[${pad}]`,
    );
    musicPads.push(`[${pad}]`);
  });
  parts.push(`${musicPads.join("")}concat=n=${musicPads.length}:v=0:a=1[music]`);
  parts.push(
    `anullsrc=r=48000:cl=stereo,atrim=end=${PLAN.endCardSec}[quiet]`,
  );
  parts.push(`[music][quiet]concat=n=2:v=0:a=1[outa]`);

  return parts.join(";\n");
}

function render(gta6Src: string, gta5Src: string, out: string): void {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    gta6Src,
    "-i",
    gta5Src,
    "-filter_complex",
    buildFilter(),
    "-map",
    "[outv]",
    "-map",
    "[outa]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    out,
    "-y",
  ];
  const res = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with status ${res.status}`);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv[0] === "--render") {
    const [, gta6Src, gta5Src, out] = argv;
    if (!gta6Src || !gta5Src || !out) {
      throw new Error("usage: main.ts --render <gta6-source> <gta5-source> <out.mp4>");
    }
    render(gta6Src, gta5Src, out);
    return;
  }
  // Default run: place the VIDEO.json record next to this file.
  const here = dirname(fileURLToPath(import.meta.url));
  const record = join(here, "VIDEO.json");
  if (!existsSync(record)) {
    throw new Error("VIDEO.json is missing from the repository");
  }
  const dest = join(process.cwd(), "VIDEO.json");
  copyFileSync(record, dest);
  console.log(`VIDEO.json -> ${dest}`);
}

main();
