import { orbitGeometry } from './orbit.mjs';
const $ = id => document.getElementById(id);
const svgLine = (x1,y1,x2,y2,color,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
const svgText = (x,y,text,fill='#8ca2bb',extra='') => `<text x="${x}" y="${y}" fill="${fill}" font-family="system-ui,sans-serif" font-size="9" ${extra}>${text}</text>`;
const svgCircle = (x,y,r,fill,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
export function openLesson() { drawOrbit(); document.getElementById('lesson-dialog').showModal(); }
function drawOrbit() {
  const month = Number($('orbit-time').value);
  const distance = Number($('star-distance').value);
  // The star lies above the orbital plane: A and B form the symmetric 2p diagram.
  // Elliptical orbit below is a perspective drawing, not an eccentric orbit.
  const { earthX, earthY, starLocalY, starY, apparentX, offset, p } = orbitGeometry(month, distance);
  // Extend the current sight line past the stationary star onto a distant
  // reference backdrop. The screen projection is schematic, not a distance scale.
  const backgroundY = 55;
  let html = '<defs><linearGradient id="orbit-fade" x2="0" y2="1"><stop stop-color="#80ebd4" stop-opacity=".08"/><stop offset="1" stop-color="#80ebd4" stop-opacity=".01"/></linearGradient></defs>';
  html += '<rect x="16" y="26" width="328" height="67" rx="10" fill="#15283b" stroke="#3f617a" stroke-opacity=".6"/>';
  html += svgText(180, 17, '아주 먼 배경별 · 위치 비교의 기준', '#9ab8d0', 'text-anchor="middle"');
  html += '<g id="background-stars">';
  for (const [x,y,r] of [[32,45,1.4],[57,69,2],[82,39,1.4],[101,75,1],[148,39,1.5],[177,69,2],[204,34,1],[244,74,1.5],[266,43,2],[294,71,1],[323,42,1.5]]) {
    html += svgCircle(x,y,r,'#9cb7d0');
    if(r===2) html += svgLine(x-4,y,x+4,y,'#9cb7d0')+svgLine(x,y-4,x,y+4,'#9cb7d0');
  }
  html += '</g>';
  html += svgLine(180-offset,55,180+offset,55,'#7893ad','stroke-dasharray="2 4" opacity=".5"');
  html += svgCircle(180-offset,55,4,'none','stroke="#80ebd4" opacity=".6"') + svgCircle(180+offset,55,4,'none','stroke="#7faaff" opacity=".6"');
  html += svgText(Math.max(53,180-offset),85,'A에서 본 위치','#80ebd4','text-anchor="middle"') + svgText(Math.min(307,180+offset),85,'B에서 본 위치','#7faaff','text-anchor="middle"');
  html += svgLine(180,starY,180-offset,55,'#80ebd4','stroke-dasharray="4 4" opacity=".4"');
  html += svgLine(180,starY,180+offset,55,'#7faaff','stroke-dasharray="4 4" opacity=".4"');
  html += '<g transform="translate(0 110)">';
  html += `<path d="M75 239 L180 ${starLocalY} L285 239 Z" fill="url(#orbit-fade)"/>`;
  html += '<ellipse cx="180" cy="239" rx="105" ry="31" fill="none" stroke="#34465c" stroke-dasharray="4 5"/>';
  html += svgLine(180, starLocalY, 180, 239, '#465a70', 'stroke-dasharray="3 5"');
  html += svgLine(75, 239, 180, starLocalY, '#7faaff', 'opacity=".7"');
  html += svgLine(285, 239, 180, starLocalY, '#80ebd4', 'opacity=".7"');
  html += svgLine(earthX, earthY, 180, starLocalY, '#f2f7fc', 'stroke-width="1.5"');
  const arcX = 180 + 36 * Math.sin(p), arcY = starLocalY + 36 * Math.cos(p), bottom = starLocalY + 36;
  html += `<path d="M${360-arcX} ${arcY} A36 36 0 0 0 180 ${bottom}" fill="none" stroke="#607489" opacity=".5"/>`;
  html += `<path d="M180 ${starLocalY} L180 ${bottom} A36 36 0 0 0 ${arcX} ${arcY} Z" fill="#ffb077" fill-opacity=".18"/>`;
  html += `<path id="parallax-arc" d="M180 ${bottom} A36 36 0 0 0 ${arcX} ${arcY}" fill="none" stroke="#ffb077" stroke-width="2"/>`;
  html += svgLine(190, starLocalY+40, 202, starLocalY+51, '#ffb077', 'opacity=".7"');
  html += svgText(205, starLocalY+56, '연주 시차 p', '#ffb077');
  html += svgText(205, starLocalY+69, '전체 각도의 ½', '#c1a58b');
  html += '<g id="physical-star">' + svgCircle(180, starLocalY, 5, '#80ebd4') + '</g>' + svgText(197, starLocalY, '관측할 별', '#80ebd4');
  html += svgCircle(180, 239, 12, '#ffb07718') + svgCircle(180, 239, 7, '#ffb077') + svgText(180, 263, '태양', '#ffb077', 'text-anchor="middle"');
  html += svgLine(75, 287, 285, 287, '#5d728c') + svgText(180, 302, '기준선 2 AU (지구–태양 거리의 두 배)', '#8298b2', 'text-anchor="middle" font-size="8"');
  html += svgText(294, 239, 'A · 0개월', '#80ebd4', 'font-size="8"') + svgText(10, 239, 'B · 6개월', '#7faaff', 'font-size="8"');
  html += svgCircle(earthX, earthY, 10, '#7faaff20') + svgCircle(earthX, earthY, 5, '#8fbaff');
  html += svgText(earthX, earthY - 17, '지구', '#d8eaff', 'text-anchor="middle"');
  html += '</g>';
  html += svgLine(180,starY,apparentX,backgroundY,'#ffe0a0','stroke-width="1.5" stroke-dasharray="5 3"');
  html += svgCircle(apparentX,backgroundY,10,'#ffe0a018','stroke="#ffe0a0" stroke-opacity=".7"');
  html += `<circle id="projected-star" cx="${apparentX}" cy="${backgroundY}" r="4" fill="#ffe0a0"/>`;
  html += svgText(180,113,'노란 점: 배경에 겹쳐 보이는 위치','#ffe0a0','text-anchor="middle"');
  $('orbit-map').innerHTML = html;
  $('orbit-month').textContent = `${month.toFixed(1).replace('.0', '')}개월${month === 0 || month === 12 ? ' · 첫 관측 위치' : month === 6 ? ' · 반대편 관측' : ''}`;
  // A fixed screen scale is essential: normalizing by the changing offset would
  // hide the reduction in apparent motion when the star is moved farther away.
  const apparent = (apparentX - 180) / 160;
  $('apparent-star').style.left = `${50 + apparent * 40}%`;
  $('star-distance-value').textContent = distance < 154 ? '가까운 별' : distance < 188 ? '중간 거리의 별' : '먼 별';
  $('sky-direction').textContent = Math.abs(apparent) < 0.08 ? '좌우 어긋남이 거의 없음' : `${apparent < 0 ? '왼쪽' : '오른쪽'}으로 어긋나 보임`;
}
let orbitFrame = null;
let orbitStartedAt = 0;
let orbitStartMonth = 0;
function stopOrbit() {
  if (orbitFrame !== null) cancelAnimationFrame(orbitFrame);
  orbitFrame = null;
  $('orbit-play').textContent = '▶';
  $('orbit-play').setAttribute('aria-label', '지구 공전 재생');
  $('orbit-play').setAttribute('aria-pressed', 'false');
}
function animateOrbit(now) {
  if (!$('lesson-dialog').open || document.hidden) { stopOrbit(); return; }
  // One simulated month per second, wrapping continuously after twelve months.
  const month = (orbitStartMonth + (now - orbitStartedAt) / 1000) % 12;
  const value = (Math.floor(month * 10) / 10).toFixed(1);
  if (Number($('orbit-time').value) !== Number(value)) {
    $('orbit-time').value = value;
    drawOrbit();
  }
  orbitFrame = requestAnimationFrame(animateOrbit);
}
$('orbit-play').addEventListener('click', () => {
  if (orbitFrame !== null) { stopOrbit(); return; }
  orbitStartMonth = Number($('orbit-time').value);
  orbitStartedAt = performance.now();
  $('orbit-play').textContent = 'Ⅱ';
  $('orbit-play').setAttribute('aria-label', '지구 공전 일시 정지');
  $('orbit-play').setAttribute('aria-pressed', 'true');
  orbitFrame = requestAnimationFrame(animateOrbit);
});
$('orbit-time').addEventListener('input', () => { stopOrbit(); drawOrbit(); });
$('lesson-dialog').addEventListener('close', stopOrbit);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopOrbit(); });
$('star-distance').addEventListener('input', drawOrbit);
document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
  $('quiz-feedback').textContent = button.dataset.answer === 'far' ? '정답! 같은 관측 간격에서 더 먼 별일수록 연주 시차가 작습니다.' : '다시 생각해 보세요. 가까운 암석은 더 크게 어긋나 보였어요.';
}));


