import test from 'node:test';
import assert from 'node:assert/strict';
import { localDay, readRecords, saveRecord, RECORDS_KEY } from '../records.mjs';
const date = new Date(2026, 9, 22, 12);
const storage = () => ({ value: null, getItem() { return this.value; }, setItem(key, value) { assert.equal(key, RECORDS_KEY); this.value = value; } });
test('top five persist, sort by score, preserve earlier ties', () => {
 const s = storage();
 [2, 7, 3, 7, 0, 9, 5].forEach((score, i) => assert.ok(saveRecord(s, score, new Date(+date + i * 1000))));
 const rows = readRecords(s, date);
 assert.deepEqual(rows.map(r => r.score), [9, 7, 7, 5, 3]);
 assert.ok(rows[1].at < rows[2].at);
});
test('local date rollover hides previous day and new score replaces it', () => {
 const s = storage(); saveRecord(s, 9, date);
 const tomorrow = new Date(2026, 9, 23, 0, 1);
 assert.equal(localDay(tomorrow), '2026-10-23');
 assert.deepEqual(readRecords(s, tomorrow), []);
 saveRecord(s, 0, tomorrow);
 assert.deepEqual(readRecords(s, tomorrow).map(r => r.score), [0]);
});
test('bad or unavailable storage never breaks the game', () => {
 const s = storage(); s.value = '{bad'; assert.deepEqual(readRecords(s, date), []);
 assert.deepEqual(readRecords(undefined, date), []);
 assert.equal(saveRecord(undefined, 3, date), false);
 s.value = JSON.stringify({day: localDay(date), records:[{score:-1, at:+date},{score:'8',at:+date}]});
 assert.deepEqual(readRecords(s, date), []);
});
