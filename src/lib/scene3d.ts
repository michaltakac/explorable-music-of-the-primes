// Helpers for the 3D MathBox scenes.

/** Text labels pinned to 3D points of a view. */
export function labels3d(view: any, pts: number[][], texts: string[], color: string, size = 14, offset: [number, number] = [0, 14]) {
  view.array({ data: pts, channels: 3, live: false });
  view.text({ data: texts, font: "Helvetica, Arial, sans-serif", weight: "bold" });
  view.label({ color, size, offset, outline: 0, depth: 0.6, zIndex: 3 });
}

/** A polyline through fixed 3D points. */
export function path3d(view: any, pts: number[][], color: string, width = 2, opacity = 1) {
  view.array({ data: pts, channels: 3, live: false });
  view.line({ color, width, opacity, zBias: 4 });
}

/** "#rrggbb" to [r, g, b] in 0..1 */
export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
