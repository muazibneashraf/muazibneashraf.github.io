// Screen-space rotations keep a grabbed point following the hand, even upside down.
export function createGlobeMotion() {
  return {
    x: 0.14, y: -0.17, z: 0.024, w: Math.sqrt(1 - 0.14 ** 2 - 0.17 ** 2 - 0.024 ** 2),
    velocityX: 0, velocityY: 0, charge: 0, scale: 1,
    dragging: false, interacted: false,
  };
}

export type GlobeMotion = ReturnType<typeof createGlobeMotion>;

export function rotateGlobe(state: GlobeMotion, dx: number, dy: number) {
  const angle = Math.hypot(dx, dy);
  if (angle < 0.000001) return;
  const sine = Math.sin(angle / 2) / angle;
  const ax = dx * sine, ay = dy * sine, aw = Math.cos(angle / 2);
  const { x, y, z, w } = state;
  state.x = aw * x + ax * w + ay * z;
  state.y = aw * y - ax * z + ay * w;
  state.z = aw * z + ax * y - ay * x;
  state.w = aw * w - ax * x - ay * y;
  const length = Math.hypot(state.x, state.y, state.z, state.w);
  state.x /= length; state.y /= length; state.z /= length; state.w /= length;
}

export function advanceGlobe(state: GlobeMotion, dt: number, automatic: boolean) {
  if (!automatic) {
    state.velocityX = state.velocityY = state.charge = 0;
    state.scale = 1;
    return;
  }
  if (!state.dragging) {
    const decay = Math.exp(-1.7 * dt);
    rotateGlobe(state, state.velocityX * (1 - decay) / 1.7, state.velocityY * (1 - decay) / 1.7);
    state.velocityX *= decay;
    state.velocityY *= decay;
    if (Math.hypot(state.velocityX, state.velocityY) < 0.08) rotateGlobe(state, 0, -0.1 * dt);
  }
  const speed = Math.hypot(state.velocityX, state.velocityY);
  const gain = state.interacted && speed > 3.5 ? Math.min(0.45, (speed - 3.5) / 6) : -0.26;
  state.charge = Math.max(0, Math.min(1, state.charge + gain * dt));
  const growth = state.charge * state.charge * (3 - 2 * state.charge);
  state.scale += (1 + growth * 0.48 - state.scale) * (1 - Math.exp(-7 * dt));
}

export interface GlobeBurst {
  theme: Record<string, string>;
  centerX: number;
  centerY: number;
  radius: number;
  points: { x: number; y: number; z: number }[];
  edges: [number, number][];
}
