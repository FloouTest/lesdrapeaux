import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as create } from '../functions/api/versus/create.js';
import { onRequestPost as join } from '../functions/api/versus/join.js';
import { onRequestPost as start } from '../functions/api/versus/start.js';
import { onRequestPost as answer } from '../functions/api/versus/answer.js';
import { onRequestGet as state } from '../functions/api/versus/state.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const DB = {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
        async first() { return sqlite.prepare(sql).get(...args) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...args) }; },
        async execute() { return /^\s*SELECT/i.test(sql) ? this.all() : this.run(); },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await statement.execute()); sqlite.exec('COMMIT'); return result; }
      catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
  return { DB, sqlite };
}
const flags = Array.from({ length: 5 }, () => ['France', 'https://flagcdn.com/w320/fr.png']);
async function call(handler, env, body, query = '') {
  const request = new Request('https://quiz.test/api/versus/' + query, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {});
  const response = await handler({ request, env });
  return { statusCode: response.status, ...await response.json() };
}

test('five-player lobby, host start, private state, replay and elimination guards', async () => {
  const env = database();
  const host = await call(create, env, { pseudo: 'Host', maxPlayers: 5, flags });
  assert.equal(host.ok, true);
  assert.equal((await call(start, env, host)).statusCode, 409);
  const players = [host];
  for (let i = 2; i <= 5; i++) players.push(await call(join, env, { code: host.code, pseudo: 'Player' + i }));
  assert.deepEqual(players.map(p => p.playerId), [1, 2, 3, 4, 5]);
  assert.equal((await call(join, env, { code: host.code, pseudo: 'Extra' })).statusCode, 409);
  assert.equal((await call(start, env, players[1])).statusCode, 403);
  assert.equal((await call(start, env, host)).ok, true);
  const snapshot = await call(state, env, null, `?code=${host.code}&token=${host.token}`);
  assert.equal(snapshot.players.length, 5);
  assert.equal(JSON.stringify(snapshot).includes('France'), false);
  const submission = { code: host.code, token: host.token, index: 0, answer: 'france' };
  const hit = await call(answer, env, submission);
  assert.equal(hit.applied, true);
  assert.deepEqual(hit.players.map(p => p.hp), [1000, 900, 900, 900, 900]);
  assert.equal((await call(answer, env, submission)).applied, false);
  env.sqlite.prepare('UPDATE versus_players SET hp = 0 WHERE slot = 2').run();
  const dead = await call(answer, env, { code: host.code, token: players[1].token, index: 0, answer: 'France' });
  assert.equal(dead.applied, false);
  assert.equal(dead.players[1].hp, 0);
  env.sqlite.prepare('UPDATE versus_players SET question_index = 5 WHERE hp > 0').run();
  const end = await call(answer, env, submission);
  assert.equal(end.status, 'finished');
  assert.equal(end.winner, 'Host');
  assert.equal((await call(answer, env, { ...submission, index: 1 })).applied, false);
});

import { readFileSync } from 'node:fs';
import { onRequestPost as ranked } from '../functions/api/ranked/index.js';
import { onRequestGet as rankings, onRequestPost as saveScore } from '../functions/api/leaderboard.js';

test('capital ranked progress and leaderboard stay independent of flags', async () => {
  const env = database();
  env.sqlite.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  for (const category of ['flags', 'capitals']) {
    const result = await call(ranked, env, { pseudo: 'Alice', category, score: 20, total: 20 });
    assert.equal(result.ok, true);
    assert.equal(result.gamesToday, 1);
    assert.equal((await call(saveScore, env, { pseudo: category, category, continent: 'Monde', score: 10, total: 10 })).ok, true);
    const list = await call(rankings, env, null, '?category=' + category);
    assert.deepEqual(list.entries.map(e => e.pseudo), [category]);
  }
  assert.equal(env.sqlite.prepare('SELECT games_played FROM players').get().games_played, 1);
  assert.equal(env.sqlite.prepare('SELECT games_played FROM ranked_players').get().games_played, 1);
  for (let i = 0; i < 5; i++) assert.equal((await call(ranked, env, { pseudo: 'Alice', category: 'capitals', score: 20, total: 20 })).ok, true);
  assert.equal(env.sqlite.prepare('SELECT games_played FROM ranked_players').get().games_played, 5);
  assert.equal(env.sqlite.prepare('SELECT games_played FROM players').get().games_played, 1);
});

import vm from 'node:vm';

test('capitals migration preserves existing scores', () => {
  const env = database();
  env.sqlite.exec(`CREATE TABLE leaderboard (pseudo TEXT, continent TEXT, mode TEXT, score INTEGER, total INTEGER, mistakes INTEGER, seconds INTEGER);
    CREATE TABLE ranked_history (pseudo TEXT, created_at TEXT);`);
  env.sqlite.exec("INSERT INTO leaderboard (pseudo,continent,mode,score,total,mistakes,seconds) VALUES ('Legacy','Monde','qcm',10,10,0,30)");
  env.sqlite.exec(readFileSync(new URL('../migration_v5_capitals.sql', import.meta.url), 'utf8'));
  assert.equal(env.sqlite.prepare('SELECT category FROM leaderboard').get().category, 'flags');
  assert.equal(env.sqlite.prepare('SELECT score FROM leaderboard').get().score, 10);
});

test('every quiz country has a capital and frontend scripts parse', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const context = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(new URL('../capitals.js', import.meta.url), 'utf8'), context);
  const start = html.indexOf('const DATA =');
  const end = html.indexOf('\n};', start) + 3;
  vm.runInContext(html.slice(start, end) + ';globalThis.countries=Object.values(DATA).flat().map(pair=>pair[0]);', context);
  for (const country of context.countries) assert.ok(context.window.CAPITALS[country], country);
});
