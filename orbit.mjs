// Schematic screen projection; these drawing units are not astronomical units.
export function orbitGeometry(month, separation) {
  const theta = month / 12 * Math.PI * 2;
  const earthX = 180 + Math.cos(theta) * 105;
  const earthY = 239 + Math.sin(theta) * 31;
  const starLocalY = 239 - separation, starY = starLocalY + 110;
  const offset = 105 * (starY - 55) / separation;
  const apparentX = 180 + (180 - earthX) * (starY - 55) / (earthY - starLocalY);
  return { earthX, earthY, starLocalY, starY, offset, apparentX, p: Math.atan2(105, separation) };
}
