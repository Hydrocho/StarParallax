import { topViewDiagram } from './top-view.mjs';
import { ParallaxScan } from './measurement.mjs';
import { FlightGame } from './game.mjs';
import { BombCharge } from './charge.mjs';
import { openLesson } from './lesson.js';
import { readRecords, saveRecord } from './records.mjs';
let recordsStorage;
try { recordsStorage = window.localStorage; } catch { /* Storage may be blocked by browser settings. */ }
const $ = id => document.getElementById(id);
const game = new FlightGame();
const charge = new BombCharge();
let displayedRange = 20;
let measurement = null;
document.querySelector('.left-controls').prepend($('mini-panel'));
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
function triggerCombatScore(event) {
  const container = $('combat-score-container');
  if (!container) return;

  let posX = window.innerWidth / 2;
  let posY = window.innerHeight * 0.38;
  if (scene && typeof scene.project === 'function') {
    const proj = scene.project(event.x, event.depth);
    if (Number.isFinite(proj.x) && Number.isFinite(proj.y)) {
      const marginX = Math.min(140, window.innerWidth * 0.22);
      posX = Math.max(marginX, Math.min(window.innerWidth - marginX, proj.x));
      posY = Math.max(90, Math.min(window.innerHeight - 170, proj.y - 25));
    }
  }

  const isMulti = event.count >= 2;
  const isLong = !isMulti && (event.distanceBonus >= 15);
  let badgeText = '✦ HIT! ✦';
  let badgeClass = 'badge-normal';
  if (isMulti) {
    badgeText = `🔥 ${event.count}X MULTI CRUSH! 🔥`;
    badgeClass = 'badge-multi';
  } else if (isLong) {
    badgeText = '⚡ LONG RANGE HIT! ⚡';
    badgeClass = 'badge-long';
  }

  const popup = document.createElement('div');
  popup.className = `combat-popup ${isMulti ? 'is-multi' : isLong ? 'is-long' : 'is-normal'}`;
  popup.style.left = `${posX}px`;
  popup.style.top = `${posY}px`;

  const basePoints = (event.count || 1) * 10;
  popup.innerHTML = `
    <div class="combat-fx-ring"></div>
    <div class="combat-badge ${badgeClass}">${badgeText}</div>
    <div class="combat-score-row">
      <span class="combat-plus">+</span><span class="combat-num">${event.points}</span><span class="combat-pts">PTS</span>
    </div>
    <div class="combat-breakdown">
      <span class="breakdown-chip">기본 ${basePoints}</span>
      ${event.distanceBonus > 0 ? `<span class="breakdown-plus">+</span><span class="breakdown-chip bonus">거리 보너스 ${event.distanceBonus}</span>` : ''}
    </div>
  `;

  container.appendChild(popup);
  setTimeout(() => popup.remove(), 1200);

  const cockpit = $('cockpit');
  if (cockpit) {
    cockpit.classList.remove('hit-shake');
    void cockpit.offsetWidth;
    cockpit.classList.add('hit-shake');
    setTimeout(() => cockpit.classList.remove('hit-shake'), 160);
  }

  const scoreEl = $('score');
  if (scoreEl) {
    scoreEl.classList.remove('score-bounce');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-bounce');
    setTimeout(() => scoreEl.classList.remove('score-bounce'), 350);
  }
}
function setUI() {
  const playing = game.status === 'playing';
  $('map-toggle').disabled = !scene || !playing || !!(measurement && !measurement.result);
  $('measure-again').disabled = !playing;
  $('start-card').hidden = game.status !== 'ready';
  $('pause-card').hidden = game.status !== 'paused' || !!document.querySelector('dialog[open]');
  $('result-card').hidden = game.status !== 'finished';
  $('fire').disabled = !playing || !!game.bomb || !scene;
  $('move-left').disabled = $('move-right').disabled = !playing || !scene;
  $('pause').disabled = !['playing', 'paused'].includes(game.status) || !scene;
  $('pause').textContent = playing ? 'Ⅱ' : '▷';
  $('pause').setAttribute('aria-label', playing ? '일시 정지' : '비행 계속하기');
  $('score').innerHTML = `${String(game.score).padStart(2, '0')} <small>점</small>`;
  const seconds = Math.ceil(game.remaining);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').setAttribute('aria-label', `남은 시간 ${seconds}초`);
  $('timer').classList.toggle('time-low', seconds <= 10);
  $('position').textContent = `${game.x >= 0 ? '+' : ''}${game.x.toFixed(1)}`;
  updateCharge();
  if (game.status === 'finished') {
    $('result-title').textContent = '60초 시차 탐사 완료!';
    $('result-copy').textContent = '같은 거리만큼 움직일 때 가까운 바위가 더 크게 어긋납니다. 겉보기 크기와 실제 거리는 다르다는 것도 기억하세요.';
    $('result-stats').textContent = `${game.score}점 · 파괴 ${game.kills}개 · 발사 ${game.shots}회`;
  }
}
function start() { if (!scene) return; game.start(); lastTime = performance.now(); snapshot = null; setUI(); notify('60초 도전! 좌우로 관측하고, 거리를 맞춰 최대한 많이 부수세요.'); }
function restart() {
  clearInput(); game.reset(); clearMeasurement(); scene?.reset(); lastEventId = 0; snapshot = null;
  $('toast').classList.remove('visible'); displayedRange = 20; updateCharge();
  $('combat-score-container')?.replaceChildren(); start();
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
  const recommended = measurement?.result;
  $('range-guide').classList.toggle('on-target', !!recommended && charge.active && Math.abs(displayedRange - recommended.depth) <= 4);
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
  } else if (event.code === 'ArrowUp') {
    if (game.status === 'playing') {
      event.preventDefault();
      if (!event.repeat) {
        if (!measurement) beginMeasurement();
        else if (measurement.result) clearMeasurement();
      }
    }
  } else if ((event.code === 'Space' && (!event.target.matches('button') || event.target.matches('#move-left,#move-right,#fire'))) || (event.code === 'Enter' && event.target.id === 'fire')) { event.preventDefault(); if (!event.repeat) beginCharge(`key:${event.code}`); }
  else if (event.code === 'KeyP' && !event.repeat) { game.status === 'playing' ? pause() : resume(); }
});
document.addEventListener('keyup', event => { keys.delete(event.code); if (charge.source === `key:${event.code}`) { event.preventDefault(); releaseCharge(`key:${event.code}`); } });
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function nearestTarget() {
  return scene?.pickTarget(game.rocks, game.x) || null;
}
function clearMeasurement() {
  $('measurement-top-view').hidden = true;
  measurement = null;
  $('mini-content').hidden = true;
  $('mini-panel').classList.add('collapsed');
  document.querySelector('.left-controls').prepend($('mini-panel'));
  $('map-toggle').textContent = '시차 측정 ＋';
  $('map-toggle').setAttribute('aria-expanded', 'false');
  $('range-guide').hidden = true;
  $('charge-guide').hidden = true;
  $('mini-panel').hidden = true;
}
function beginMeasurement() {
  if (game.status !== 'playing') return;
  const target = nearestTarget();
  if (!target || Math.abs(target.x - game.x) > target.radius + 2) {
    notify('측정할 바위를 중앙 조준점에 맞춰 주세요.', true); return;
  }
  if (Math.abs(game.x) > 64) { notify('양쪽 관측 공간이 부족해요. 중앙 쪽으로 이동해 주세요.', true); return; }
  measurement = new ParallaxScan(target.id, { x: game.x, angle: Math.atan2(target.x - game.x, target.depth) });
  $('mini-panel').hidden = false;
  $('mini-content').hidden = false;
  $('mini-panel').classList.remove('collapsed');
  $('cockpit').append($('mini-panel'));
  $('map-toggle').setAttribute('aria-expanded', 'true');
  $('range-guide').hidden = $('charge-guide').hidden = true;
  $('toast').classList.remove('visible');
  updateScan();
}
$('map-toggle').addEventListener('click', () => {
  if (!measurement) beginMeasurement();
  else if (measurement.result) clearMeasurement();
});
function advanceMeasurement() {
  if (!measurement || measurement.result || game.status !== 'playing') return;
  const target = game.rocks.find(r => r.id === measurement.id);
  if (!target) { clearMeasurement(); return; }
  const phase = measurement.phase;
  measurement.sample({ x: game.x, angle: Math.atan2(target.x - game.x, target.depth) });
  if (measurement.phase !== phase) {
    if (measurement.result) notify('✓ 측정 완료');
    else notify(measurement.side > 0 ? '✓ 관측 A · ← 반대쪽으로' : '✓ 관측 A · 반대쪽으로 →');
    updateScan();
  }
}
$('measure-again').addEventListener('click', () => { clearMeasurement(); beginMeasurement(); });
$('measure-cancel').addEventListener('click', clearMeasurement);
function showDialog(kind) {
  dialogWasPlaying = game.status === 'playing'; pause();
  if (kind === 'lesson') openLesson();
  else if (kind === 'records') { renderRecords(); $('records-dialog').showModal(); }
  else $('guide-dialog').showModal();
  setUI();
}
function renderRecords() {
  const today = new Date();
  $('records-date').textContent = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const records = readRecords(recordsStorage, today);
  $('records-list').replaceChildren(...records.map((record, index) => {
    const row = document.createElement('li');
    const rank = document.createElement('span'); rank.textContent = `${index + 1}위`;
    const score = document.createElement('strong'); score.textContent = `${record.score}점`;
    const time = document.createElement('time'); time.textContent = new Date(record.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    row.append(rank, score, time); return row;
  }));
  $('records-empty').hidden = records.length > 0;
}
$('records-open').addEventListener('click', () => showDialog('records'));
$('result-records').addEventListener('click', () => showDialog('records'));
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
function positionObservationDiagram() {
  const panel = $('measurement-top-view');
  if (panel.hidden) return;
  const move = $('move-right').getBoundingClientRect();
  const gap = 12;
  let width = innerWidth <= 700 ? 140 : 200;
  const obstacles = [$('range-value').closest('.range-panel'), $('mini-panel')]
    .filter(el => !el.hidden).map(el => el.getBoundingClientRect());
  let left, top;
  for (;;) {
    const height = width * 218 / 220 + 2;
    left = move.left - gap - width;
    top = move.bottom - height;
    for (const box of obstacles) {
      if (left < box.right + gap && left + width > box.left - gap && top + height > box.top - gap && top < box.bottom + gap) top = box.top - gap - height;
    }
    if ((left >= gap && top >= 65) || width <= 90) break;
    width -= 10;
  }
  panel.style.width = `${width}px`;
  panel.style.left = `${Math.max(gap, left)}px`;
  panel.style.top = `${Math.max(12, top)}px`;
}
window.addEventListener('resize', positionObservationDiagram);
function updateScan() {
  if (!scene) return;
  if (measurement && !game.rocks.some(r => r.id === measurement.id)) {
    clearMeasurement();
  }
  const target = measurement ? game.rocks.find(r => r.id === measurement.id) : nearestTarget();
  $('target-marker').hidden = !target || game.status === 'ready';
  if (!target) { $('mini-panel').hidden = true; return; }
  const projected = scene.project(target.x + target.radius * 1.3, target.depth);
  $('target-marker').style.left = `${Math.max(12, Math.min(scene.width - 110, projected.x + 8))}px`;
  $('target-marker').style.top = `${projected.y - 15}px`;
  $('target-code').textContent = `${measurement ? '고정 · ' : ''}ROCK ${String(target.id + 1).padStart(2, '0')}`;
  $('target-marker').querySelector('small').textContent = measurement?.result ? `측정 약 ${Math.round(measurement.result.depth)} u` : '거리 미확인';
  const aligned = Math.abs(target.x - game.x) < target.radius + 2;
  $('mini-panel').hidden = !measurement && !(aligned && game.status === 'playing' && Math.abs(game.x) <= 64);
  const reticle = document.querySelector('.reticle');
  reticle.classList.toggle('aligned', aligned);
  reticle.style.top = `${scene.project(target.x, target.depth).y}px`;
  $('aim-state').style.top = `${scene.project(target.x, target.depth).y + 42}px`;
  $('aim-state').textContent = measurement?.result ? (aligned ? '측정 대상 정렬 · 추천 구간까지 충전하세요' : '측정한 바위를 다시 중앙에 맞추세요') : aligned ? '방향 정렬 · 시차 측정으로 거리를 알아보세요' : '좌우로 움직여 바위를 조준점에 맞추세요';
  $('aim-state').hidden = !!measurement;
  $('target-marker').hidden = !!measurement || game.status === 'ready';
  if (!measurement) return;
  const angle = Math.atan2(target.x - game.x, target.depth);
  const a = measurement.a || { x: measurement.origin, angle: measurement.previous.angle };
  const b = measurement.b || { x: game.x, angle };
  const delta = measurement.a ? Math.abs(b.angle - a.angle) * 180 / Math.PI : 0;
  const progress = measurement.progress(game.x);
  const directionText = progress.direction < 0 ? '← 왼쪽' : progress.direction > 0 ? '오른쪽 →' : '← 왼쪽 또는 오른쪽 →';
  $('map-toggle').textContent = measurement.result ? '측정 종료' : '자동 관측 중';
  $('map-toggle').disabled = !measurement.result || game.status !== 'playing';
  $('measure-again').hidden = !measurement.result;
  $('scan-progress').value = progress.fraction;
  $('scan-progress').hidden = !!measurement.result;
  $('parallax-hint').textContent = measurement.result ? `시차 ${delta.toFixed(2)}° · ${Math.round(measurement.result.depth)} u` : `${directionText} ${progress.remaining.toFixed(1)} u`;
  $('scan-principle').hidden = true;
  $('parallax-hint').hidden = !!measurement.result;
  $('scan-principle').textContent = '입체 개념 모형 · 거리/각도 확대';

  const result = measurement.result;
  $('measurement-top-view').hidden = !result;
  if (result) $('top-view-svg').innerHTML = topViewDiagram(measurement);
  $('range-guide').hidden = $('charge-guide').hidden = !result;
  if (result) {
    $('charge-guide').style.left = `${(result.depth - 20 - 4) / 220 * 100}%`;
    $('range-guide').textContent = `측정 ${Math.round(result.depth)} u · 약 ${result.seconds.toFixed(1)}초`;
    positionObservationDiagram();
  }
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
    advanceMeasurement();
    if (game.lastEvent && game.lastEvent.id !== lastEventId) {
      lastEventId = game.lastEvent.id;
      const event = game.lastEvent;
      if (event.kind === 'hit' || event.kind === 'miss') scene.explode(event);
      if (event.kind === 'hit') {
        notify(`바위 ${event.count}개 파괴 · +${event.points}점 (거리 보너스 +${event.distanceBonus}점)`);
        triggerCombatScore(event);
        snapshot = null;
      }
      else if (event.kind === 'miss') notify(event.hint, true);
    }
    if (game.status !== previousStatus) {
      clearInput();
      if (game.status === 'finished') {
        clearMeasurement();
        const saved = saveRecord(recordsStorage, game.score);
        $('record-save-status').textContent = saved ? '오늘의 TOP 5 기록을 저장했습니다.' : '브라우저 저장소를 사용할 수 없어 기록을 저장하지 못했습니다.';
      }
    }
    scene.render(game, game.status === 'playing' ? dt : 0, measurement);
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
