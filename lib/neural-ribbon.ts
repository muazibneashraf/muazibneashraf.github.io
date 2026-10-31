export const RIBBON_STRANDS = 10;
export type RibbonPoint = { x: number; y: number; z: number };

// Open, twisted filaments leave a quiet central space for the Projects title.
// Samples circulate beyond the viewport edges, so no visible loop seam forms.
export function sampleNeuralRibbon(index: number, count: number, width: number, height: number, time: number, out: RibbonPoint) {
  const strand = index % RIBBON_STRANDS;
  const band = strand < RIBBON_STRANDS / 2 ? -1 : 1;
  const lane = strand % (RIBBON_STRANDS / 2) - 2;
  const samples = Math.max(2, Math.ceil(count / RIBBON_STRANDS));
  const progress = ((Math.floor(index / RIBBON_STRANDS) / (samples - 1) + time * .035 * band) % 1 + 1) % 1;
  const t = progress * 2 - 1;
  out.z = Math.sin(t * 2.6 + time * .55 + lane * .32 + band * .7);
  const thickness = lane * Math.min(width * .012, 16) * Math.cos(t * 3 + time * .45);
  const bow = height * (.19 + .04 * Math.sin(t * 2 + time * .4 + band * .6)) + thickness;
  out.x = width * .5 + t * width * .78 * (.88 + out.z * .1) + width * .045 * Math.sin(t * 2 + time * .25 + band * .4);
  out.y = height * .5 + band * Math.hypot(bow, height * .12) + height * .03 * Math.sin(t * 3.4 + time * .35 + band);
  return out;
}
