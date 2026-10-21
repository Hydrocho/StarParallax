import { FlightGame } from './game.mjs';
import { BombCharge } from './charge.mjs';
import { openLesson } from './lesson.js';
const $ = id => document.getElementById(id);
const game = new FlightGame();
const charge = new BombCharge();
let displayedRange = 20;
let scene, lastTime = 0, lastEventId = 0, toastUntil = 0, snapshot = null, lastScan = 0, dialogWasPlaying = false;
const keys = new Set(), pointers = new Map();
const clearInput = () => { charge.cancel(); keys.clear(); pointers.clear(); updateCharge(); for (const id of ['move-left', 'move-right']) $(id).classList.remove('pressed'); };
function direction() {
  const left = keys.has('ArrowLeft') || keys.has('KeyA') || [...pointers.values()].includes(-1);
  const right = keys.has('ArrowRight') || keys.has('KeyD') || [...pointers.values()].includes(1);
  return Number(right) - Number(left);
}
function notify(text, miss = false) {
  $('toast').textContent = text; $('toast').classList.add('visible'); $('toast').classList.toggle('miss', miss); toastUntil = performance.now() + 4200;
}
function setUI() {
  const playing = game.status === 'playing';
  $('start-card').hidden = game.status !== 'ready';
  $('pause-card').hidden = game.status !== 'paused' || !!document.querySelector('dialog[open]');
  $('result-card').hidden = game.status !== 'finished';
  $('fire').disabled = !playing || !!game.bomb || !scene;
  $('move-left').disabled = $('move-right').disabled = !playing || !scene;
  $('pause').disabled = !['playing', 'paused'].includes(game.status) || !scene;
  $('pause').textContent = playing ? 'Ⅱ' : '▷';
  $('pause').setAttribute('aria-label', playing ? '일시 정지' : '비행 계속하기');
  $('score').innerHTML = `${String(game.kills).padStart(2, '0')} <small>개</small>`;
  const seconds = Math.ceil(game.remaining);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').setAttribute('aria-label', `남은 시간 ${seconds}초`);
  $('timer').classList.toggle('time-low', seconds <= 10);
  $('position').textContent = `${game.x >= 0 ? '+' : ''}${game.x.toFixed(1)}`;
  updateCharge();
  if (game.status === 'finished') {
    $('result-title').textContent = '60초 시차 탐사 완료!';
    $('result-copy').textContent = '같은 거리만큼 움직일 때 가까운 바위가 더 크게 어긋납니다. 겉보기 크기와 실제 거리는 다르다는 것도 기억하세요.';
    $('result-stats').textContent = `파괴 ${game.kills}개 · 발사 ${game.shots}회`;
  }
}
function start() { if (!scene) return; game.start(); lastTime = performance.now(); snapshot = null; setUI(); notify('60초 도전! 좌우로 관측하고, 거리를 맞춰 최대한 많이 부수세요.'); }
function restart() {
  clearInput(); game.reset(); scene?.reset(); lastEventId = 0; snapshot = null;
  $('toast').classList.remove('visible'); displayedRange = 20; updateCharge(); start();
}
function pause() { clearInput(); game.pause(); setUI(); }
function resume() { if (document.querySelector('dialog[open]')) return; game.resume(); lastTime = performance.now(); setUI(); }
function beginCharge(source) {
  if (!scene || game.status !== 'playing' || game.bomb) return;
  charge.begin(source, performance.now()); updateCharge();
}
function releaseCharge(source) {
  const range = charge.release(source, performance.now());
  if (range !== null && game.fire(range)) { displayedRange = range; setUI(); notify(`${range} u에 폭발 지점 설정 · 발사`); }
  updateCharge();
}
function updateCharge() {
  if (charge.active) displayedRange = charge.range(performance.now());
  $('range-value').innerHTML = `${displayedRange} <small>u</small>`;
  $('charge-meter').value = displayedRange;
  $('fire').classList.toggle('charging', charge.active);
  $('fire').querySelector('strong').textContent = charge.active ? '놓으면 발사' : '눌러서 충전';
  $('bomb-status').textContent = game.bomb ? `비행 중 · ${game.bomb.range} u에서 폭발` : charge.active ? (displayedRange === 240 ? '최대 거리 · 손을 떼면 발사' : '충전 중 · 손을 떼면 발사') : '길게 누를수록 멀리 · 2초에 최대 거리';
}
$('start').addEventListener('click', start);
$('pause').addEventListener('click', () => game.status === 'paused' ? resume() : pause());
$('resume').addEventListener('click', resume);
$('replay').addEventListener('click', restart); $('pause-restart').addEventListener('click', restart);
$('fire').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  $('fire').setPointerCapture(event.pointerId);
  beginCharge(`pointer:${event.pointerId}`);
});
$('fire').addEventListener('pointerup', event => releaseCharge(`pointer:${event.pointerId}`));
for (const type of ['pointercancel', 'lostpointercapture']) $('fire').addEventListener(type, event => {
  if (charge.source === `pointer:${event.pointerId}`) { charge.cancel(); updateCharge(); }
});
$('fire').addEventListener('contextmenu', event => event.preventDefault());
// Assistive activation without key/pointer events can toggle start/release.
$('fire').addEventListener('click', event => {
  if (event.detail === 0) charge.source === 'assistive' ? releaseCharge('assistive') : beginCharge('assistive');
});
for (const [id, value] of [['move-left', -1], ['move-right', 1]]) {
  const button = $(id);
  button.addEventListener('pointerdown', event => {
    if (game.status !== 'playing') return;
    event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, value); button.classList.add('pressed');
  });
  const release = event => { pointers.delete(event.pointerId); if (![...pointers.values()].includes(value)) button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
}
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.target.matches('input,textarea,select')) return;
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
    if (game.status === 'playing') { event.preventDefault(); keys.add(event.code); }
  } else if ((event.code === 'Space' && (!event.target.matches('button') || event.target.matches('#move-left,#move-right,#fire'))) || (event.code === 'Enter' && event.target.id === 'fire')) { event.preventDefault(); if (!event.repeat) beginCharge(`key:${event.code}`); }
  else if (event.code === 'KeyP' && !event.repeat) { game.status === 'playing' ? pause() : resume(); }
});
document.addEventListener('keyup', event => { keys.delete(event.code); if (charge.source === `key:${event.code}`) { event.preventDefault(); releaseCharge(`key:${event.code}`); } });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('map-toggle').addEventListener('click', () => {
  const hidden = !$('mini-content').hidden; $('mini-content').hidden = hidden;
  $('mini-panel').classList.toggle('collapsed', hidden);
  $('map-toggle').setAttribute('aria-expanded', String(!hidden)); $('map-toggle').textContent = hidden ? '시차 보기 ＋' : '닫기 −';
});
function showDialog(kind) {
  dialogWasPlaying = game.status === 'playing'; pause();
  if (kind === 'lesson') openLesson(); else $('guide-dialog').showModal();
  setUI();
}
$('help').addEventListener('click', () => showDialog('guide'));
$('lesson-open').addEventListener('click', () => showDialog('lesson'));
$('result-lesson').addEventListener('click', () => showDialog('lesson'));
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    const shouldResume = dialogWasPlaying; dialogWasPlaying = false;
    if (shouldResume && !document.hidden) resume(); else setUI();
  });
}
function updateScan() {
  if (!scene) return;
  const target = [...game.rocks].sort((a, b) => Math.abs(Math.atan2(a.x - game.x, a.depth)) - Math.abs(Math.atan2(b.x - game.x, b.depth)))[0];
  $('target-marker').hidden = !target || game.status === 'ready';
  if (!target) return;
  const projected = scene.project(target.x + target.radius * 1.3, target.depth);
  $('target-marker').style.left = `${Math.max(12, Math.min(scene.width - 86, projected.x + 8))}px`;
  $('target-marker').style.top = `${projected.y - 15}px`;
  $('target-code').textContent = `ROCK ${String(target.id + 1).padStart(2, '0')}`;
  const aligned = Math.abs(target.x - game.x) < target.radius + 2;
  document.querySelector('.reticle').classList.toggle('aligned', aligned);
  $('aim-state').textContent = aligned ? '방향 정렬 · 폭발 거리를 판단하세요' : '좌우로 움직여 바위를 조준점에 맞추세요';
  const angle = Math.atan2(target.x - game.x, target.depth);
  if (!snapshot || snapshot.id !== target.id) snapshot = { id: target.id, x: game.x, angle };
  const delta = Math.abs(angle - snapshot.angle) * 180 / Math.PI;
  const px = a => 120 + Math.max(-100, Math.min(100, Math.tan(a) * 260));
  const oldX = px(snapshot.angle), currentX = px(angle);
  $('mini-map').innerHTML = `<path d="M20 22 Q120 -7 220 22 M40 40 Q120 17 200 40 M60 58 Q120 40 180 58" fill="none" stroke="#578497" opacity=".18"/><path d="M120 92 L${oldX} 18" stroke="#829bce" stroke-dasharray="3 4" opacity=".7"/><path d="M120 92 L${currentX} 18" stroke="#87edda" opacity=".8"/><circle cx="${oldX}" cy="18" r="3" fill="none" stroke="#829bce"/><circle cx="${currentX}" cy="18" r="4" fill="#87edda"/><path d="M120 84 l-5 10 h10z" fill="#c2e8ec"/><path d="M${oldX} 9 H${currentX}" stroke="#ffbd82" opacity=".7"/><text x="120" y="70" fill="#6b93a7" font-size="8" text-anchor="middle">방향만 표시 · 실제 거리 아님</text>`;
  $('parallax-hint').textContent = Math.abs(game.x - snapshot.x) > 1 ? `이동 ${Math.abs(game.x - snapshot.x).toFixed(1)} u · 방향 변화 ${delta.toFixed(1)}°` : '좌우 이동 시 가까운 바위가 더 크게 어긋나요.';
  if (Math.abs(game.x - snapshot.x) > 18) snapshot = { id: target.id, x: game.x, angle };
}
function fail() {
  pause(); scene = null; $('scene-error').hidden = false;
  $('start-card').hidden = true; $('pause-card').hidden = true;
  for (const id of ['start', 'fire', 'move-left', 'move-right', 'pause']) $(id).disabled = true;
}
$('viewport').addEventListener('scene-failed', fail);
function frame(time) {
  const dt = lastTime ? Math.max(0, (time - lastTime) / 1000) : 0; lastTime = time;
  if (scene && !document.hidden) {
    const previousStatus = game.status; game.step(dt, direction());
    if (game.lastEvent && game.lastEvent.id !== lastEventId) {
      lastEventId = game.lastEvent.id;
      const event = game.lastEvent;
      if (event.kind === 'hit' || event.kind === 'miss') scene.explode(event);
      if (event.kind === 'hit') { notify(`정확한 거리! 바위 ${event.count}개 파괴`); snapshot = null; }
      else if (event.kind === 'miss') notify(event.hint, true);
    }
    if (game.status !== previousStatus) clearInput();
    scene.render(game, game.status === 'playing' ? dt : 0);
    if (time - lastScan > 80) { setUI(); updateScan(); lastScan = time; }
    if (time > toastUntil) $('toast').classList.remove('visible');
  }
  requestAnimationFrame(frame);
}
setUI();
try {
  const { FlightScene } = await import('./flight-scene.js');
  scene = new FlightScene($('viewport')); $('start').disabled = false; $('start').textContent = '비행 시작 →';
  scene.render(game, 0); updateScan(); requestAnimationFrame(frame);
} catch (error) { console.error('3D initialization failed', error); fail(); }
