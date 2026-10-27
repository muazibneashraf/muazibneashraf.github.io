interface NeuralSurfaceTheme { accent: string; blue: string; surface: string; bg: string }

// Shared by the globe and the first burst frames, so the shaded body dissolves
// into the particles instead of vanishing at the animation handoff.
export function drawNeuralSurface(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  theme: NeuralSurfaceTheme, charge = 0, opacity = 1) {
  if (opacity <= 0) return;
  const aura = ctx.createRadialGradient(x, y, radius * 0.97, x, y, radius * 1.1);
  aura.addColorStop(0, "transparent"); aura.addColorStop(0.3, theme.accent); aura.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.055 * opacity; ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2); ctx.fill();
  const material = ctx.createRadialGradient(x - radius * 0.38, y - radius * 0.42, 0,
    x + radius * 0.18, y + radius * 0.2, radius * 1.22);
  material.addColorStop(0, theme.blue); material.addColorStop(0.62, theme.surface);
  material.addColorStop(1, theme.surface);
  ctx.globalAlpha = 0.42 * opacity; ctx.fillStyle = material;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  const glass = ctx.createRadialGradient(x - radius * 0.12, y - radius * 0.18, radius * 0.4, x, y, radius);
  glass.addColorStop(0, "transparent"); glass.addColorStop(0.72, theme.blue); glass.addColorStop(1, theme.accent);
  ctx.globalAlpha = 0.055 * opacity; ctx.fillStyle = glass;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  const light = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.45, 0, x, y, radius);
  light.addColorStop(0, theme.accent); light.addColorStop(0.65, "transparent"); light.addColorStop(1, "transparent");
  ctx.globalAlpha = (0.13 + charge * 0.04) * opacity; ctx.fillStyle = light;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  const rim = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  rim.addColorStop(0, theme.accent); rim.addColorStop(0.45, theme.blue); rim.addColorStop(1, theme.surface);
  ctx.globalAlpha = 0.38 * opacity; ctx.strokeStyle = rim; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
}
