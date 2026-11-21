# GTA 5 vs GTA 6 — One Road, Two Generations

[![make.fun · gta6-clipper-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![rank](https://make.fun/badge/gta6-clipper-01/cahyosh/gta6-clipper-generations/rank.svg)](https://make.fun/bounty/gta6-clipper-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![reward](https://make.fun/badge/gta6-clipper-01/cahyosh/gta6-clipper-generations/reward.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)

A split-screen comparison Short for the make.fun **gta6-clipper-01** bounty
("Clip GTA 6 for the most YouTube views").

**The video:** https://www.youtube.com/shorts/hXsDmbSxbJg

## The concept

One action, two generations. The top half is GTA VI (Trailer 2): Jason at
the wheel, then the first-person causeway drive into Vice City. The bottom
half answers with GTA V (the official trailer): the blue convertible on a
palm-lined Los Santos avenue, then the red sports car. A giant hook —
"ONE ROAD. TWO GENERATIONS." — lands inside the first three seconds, both
halves keep their game labels throughout, and an end card turns the whole
clip into a comment prompt: *which one wins?*

## How it is built

`main.ts` is the whole production pipeline. It holds the edit plan (slice
times for both trailers, the split layout, the hook and label timing, the
end card), builds the ffmpeg filter graph from that plan, and renders the
vertical 1080x1920 Short with a single ffmpeg pass. The two trailers are
render inputs and are not committed; run it with local copies:

```
bun main.ts --render <gta6-trailer2.mp4> <gta5-trailer.mkv> <out.mp4>
```

With no arguments it copies `VIDEO.json` — the record of the published
video — into the working directory:

```
bun main.ts
```

## Credits

All footage belongs to Rockstar Games: Grand Theft Auto VI Trailer 2 and
the Grand Theft Auto V official trailer. This is a fan-made comparison
clip produced for the make.fun clipper bounty.
