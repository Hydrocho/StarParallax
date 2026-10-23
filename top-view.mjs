// Symmetric teaching diagram; measured depth and angle remain unchanged.
export function topViewDiagram(scan) {
  const { depth } = scan.result;
  const far=300;
  const spread=8*(far/depth-1);
  const extent=Math.max(12,spread);
  const sx=v=>110+v/extent*78;
  const ax=sx(-8),bx=sx(8),rx=110,ry=172-depth/far*142;
  const pax=sx(spread),pbx=sx(-spread);
  const side=scan.b.x<scan.a.x?-1:1;
  const selectedX=side<0?ax:bx;
  const leftLabel=side<0?'B':'A';
  const rightLabel=side>0?'B':'A';
  const delta=Math.abs(scan.a.angle-scan.b.angle)*180/Math.PI;
  return `<text x="110" y="14" text-anchor="middle" fill="#a8cbd6" font-size="9">위에서 본 관측 · 대칭 모형</text>
    <path d="M20 24Q110 14 200 24L200 44Q110 34 20 44Z" fill="#327ca033" stroke="#7ab5d555"/>
    <path d="M35 30h2m30-4h2m41 1h2m45 0h2m28 5h2" stroke="#d1e9ff"/>
    <path d="M${ax} 172L${rx} ${ry}L${bx} 172Z" fill="#63f5c112" stroke="#63f5c177"/>
    <path data-part="right-triangle" d="M110 ${ry}V172H${selectedX}Z" fill="#63f5c166" stroke="#a0ffe0" stroke-width="1.4"/>
    <path d="M110 ${ry}V172" stroke="#edfff8" stroke-dasharray="3 3"/>
    <path d="M110 166H${110+side*6}V172" fill="none" stroke="#edfff8" stroke-width="1"/>
    <text x="${(110+selectedX)/2}" y="165" text-anchor="middle" fill="#d2ffed" font-size="9">8 u</text>
    <path data-part="back-triangle" d="M${pax} 30L${rx} ${ry}L${pbx} 30Z" fill="none" stroke="#ffbd69aa"/>
    <path d="M${ax} 172L${pax} 30M${bx} 172L${pbx} 30" stroke="#dfeddf88" fill="none"/>
    <circle cx="110" cy="172" r="4" fill="none" stroke="#e5fff5"/><text x="110" y="188" text-anchor="middle" fill="#c0dbd8" font-size="9">중앙</text>
    <circle cx="${ax}" cy="172" r="4" fill="#91bcff"/><circle cx="${bx}" cy="172" r="4" fill="#87ffbc"/>
    <circle cx="${pax}" cy="30" r="3" fill="#91bcff"/><circle cx="${pbx}" cy="30" r="3" fill="#ffce87"/>
    <path d="M${rx} ${ry-5}l5 3-1 6-6 1-3-5z" fill="#e5f5ec"/>
    <text x="${rx+9}" y="${ry+3}" fill="#ffdbb2" font-size="12">${Math.round(depth)} u</text>
    <text x="${ax}" y="188" text-anchor="middle" fill="#91bcff" font-size="10">${leftLabel}</text><text x="${bx}" y="188" text-anchor="middle" fill="#87ffbc" font-size="10">${rightLabel}</text>
    <text x="110" y="207" text-anchor="middle" fill="#baf9e9" font-size="11">시차 ${delta.toFixed(2)}° · 간격 16 u</text>`;
}
