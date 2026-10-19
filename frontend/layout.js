export const BRIDGES = [[0, 1], [1, 2], [2, 0]];

export function segmentDistance(x, z, a, b) {
  const dx = b.x-a.x, dz = b.z-a.z;
  const t = Math.max(0, Math.min(1, ((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a.x-t*dx, z-a.z-t*dz);
}

export function walkable(x, z, regions, obstacles = []) {
  const ground = regions.some(r => Math.hypot(x-r.x, z-r.z) < r.radius-1)
    || BRIDGES.some(([a,b]) => segmentDistance(x,z,regions[a],regions[b]) < 1.65);
  return ground && !obstacles.some(o => Math.hypot(x-o.x,z-o.z) < o.radius+.55);
}

export function buildings(regions) {
  return regions.flatMap((r,i) => Array.from({length:4},(_,n) => {
    const angle=n*Math.PI/2+.8;
    return {x:r.x+18*Math.cos(angle),z:r.z+18*Math.sin(angle),radius:2.1,region:i};
  }));
}
