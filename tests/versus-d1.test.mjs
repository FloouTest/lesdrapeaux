import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { onRequestPost as create } from '../functions/api/versus/create.js';
import { onRequestPost as join } from '../functions/api/versus/join.js';

async function post(handler, env, body) {
  const response = await handler({
    env,
    request: new Request('https://quiz.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  return { status: response.status, body: await response.json() };
}

test('D1 runtime: allocate all eight slots and reject a full room', async () => {
  const runtime = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } };',
    d1Databases: ['DB'],
  });
  try {
    const env = { DB: await runtime.getD1Database('DB') };
    const host = await post(create, env, {
      pseudo: 'Host',
      maxPlayers: 8,
      flags: Array.from({ length: 5 }, () => ['France', 'https://flagcdn.com/w320/fr.png']),
    });
    assert.equal(host.status, 200);
    // A UNION ALL slot list works in ordinary SQLite but exceeds D1's
    // compound SELECT limit. Exercise the actual D1 runtime, not a DB mock.
    for (let slot = 2; slot <= 8; slot++) {
      const guest = await post(join, env, { code: host.body.code, pseudo: `Guest${slot}` });
      assert.equal(guest.status, 200, JSON.stringify(guest.body));
      assert.equal(guest.body.playerId, slot);
    }
    const extra = await post(join, env, { code: host.body.code, pseudo: 'Extra' });
    assert.equal(extra.status, 409);
  } finally {
    await runtime.dispose();
  }
});

import { onRequestPost as start } from '../functions/api/versus/start.js';
import { onRequestPost as answer } from '../functions/api/versus/answer.js';
import { onRequestGet as state } from '../functions/api/versus/state.js';

test('D1 capitals room shares region, country and flag without exposing answers', async () => {
  const runtime = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } };', d1Databases: ['DB'] });
  try {
    const env = { DB: await runtime.getD1Database('DB') };
    const host = await post(create, env, {
      pseudo: 'Host', maxPlayers: 2, category: 'capitals', continent: 'Europe',
      flags: Array.from({ length: 5 }, () => ({ prompt: 'Royaume-Uni', image: 'https://flagcdn.com/w320/gb.png', answer: 'Londres', aliases: ['London'] })),
    });
    assert.equal(host.status, 200);
    const guest = await post(join, env, { code: host.body.code, pseudo: 'Guest' });
    assert.equal(guest.body.category, 'capitals');
    assert.equal(guest.body.continent, 'Europe');
    assert.deepEqual(guest.body.flags[0], { prompt: 'Royaume-Uni', image: 'https://flagcdn.com/w320/gb.png' });
    assert.equal((await post(start, env, host.body)).status, 200);
    const response = await state({ env, request: new Request(`https://quiz.test/?code=${host.body.code}&token=${host.body.token}`) });
    const snapshot = await response.json();
    assert.equal(snapshot.category, 'capitals');
    assert.equal(JSON.stringify(snapshot).includes('Londres'), false);
    assert.equal(JSON.stringify(snapshot).includes('London'), false);
    const wrong = await post(answer, env, { ...host.body, index: 0, answer: 'Paris' });
    assert.equal(wrong.status, 200);
    assert.equal(wrong.body.correct, false);
    assert.equal(wrong.body.correctAnswer, 'Londres');
    assert.equal(wrong.body.applied, true);
    const replay = await post(answer, env, { ...host.body, index: 0, answer: 'Paris' });
    assert.equal(replay.body.applied, false);
    assert.equal('correctAnswer' in replay.body, false);
    const alias = await post(answer, env, { ...host.body, index: 1, answer: 'London' });
    assert.equal(alias.status, 200);
    assert.equal(alias.body.correct, true);
    assert.equal(alias.body.applied, true);
    assert.equal('correctAnswer' in alias.body, false);
  } finally { await runtime.dispose(); }
});

test('D1 MCQ room exposes choices but not its answer field', async () => {
  const runtime = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } };', d1Databases: ['DB'] });
  try {
    const env = { DB: await runtime.getD1Database('DB') };
    const question = { answer: 'France', image: 'https://flagcdn.com/w320/fr.png', aliases: [], choices: ['France', 'Italie', 'Espagne', 'Allemagne'] };
    const host = await post(create, env, { pseudo: 'Host', maxPlayers: 2, category: 'flags', continent: 'Europe', answerMode: 'mcq', flags: Array.from({ length: 5 }, () => question) });
    assert.equal(host.status, 200, JSON.stringify(host.body));
    const guest = await post(join, env, { code: host.body.code, pseudo: 'Guest' });
    assert.equal(guest.body.answerMode, 'mcq');
    assert.deepEqual(guest.body.flags[0].choices, question.choices);
    assert.equal('answer' in guest.body.flags[0], false);
  } finally { await runtime.dispose(); }
});
