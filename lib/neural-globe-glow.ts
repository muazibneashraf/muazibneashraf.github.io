interface NeuralGlowTheme { accent: string; blue: string }

// Only a feathered light field: no filled disk, glass shell, or circular rim.
// Shared by the network and its burst so the light dissolves continuously.
export function drawNeuralGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  theme: NeuralGlowTheme, charge = 0, opacity = 1) {
  if (opacity <= 0) return;
  const glow = ctx.createRadialGradient(x - radius * 0.14, y - radius * 0.18, 0, x, y, radius * 1.08);
  glow.addColorStop(0, theme.blue);
  glow.addColorStop(0.45, theme.accent);
  glow.addColorStop(1, "transparent");
  ctx.globalAlpha = (0.045 + charge * 0.035) * opacity;
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 1.2, y - radius * 1.2, radius * 2.4, radius * 2.4);
  ctx.globalAlpha = 1;
}
