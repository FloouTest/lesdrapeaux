import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function setup() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://quiz.test/' });
  const { window } = dom;
  for (const [start, end] of [
    ['function renderCapitalQuestion(', 'function loadQuestion('],
    ['function renderRoster(', 'function showWait('],
    ['function showBattle(', 'async function submitVersusAnswer('],
  ]) window.eval(html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start))));
  Object.assign(window, {
    screenVersusWait: window.document.getElementById('screen-versus-wait'),
    screenVersusLobby: window.document.getElementById('screen-versus-lobby'),
    screenVersusBattle: window.document.getElementById('screen-versus-battle'),
    versus: {
      code: 'ABCDE', category: 'flags', busy: false,
      question: { image: 'https://flagcdn.com/w320/fr.png' },
      players: [{ playerId: 1, pseudo: 'Alice', hp: 1000, index: 0, self: true }],
    },
  });
  return dom;
}

test('versus preserves submission focus, restores it on completion, and does not steal it on polls', () => {
  const dom = setup(), w = dom.window, d = w.document;
  try {
    const input = d.getElementById('versus-type-input');
    w.showBattle();
    assert.equal(d.activeElement, input);
    input.value = 'France';
    w.versus.busy = true;
    w.showBattle();
    assert.equal(input.disabled, false);
    assert.equal(input.readOnly, true);
    assert.equal(d.activeElement, input);
    w.versus.players[0].index++;
    w.showBattle();
    w.versus.busy = false;
    w.showBattle();
    assert.equal(input.value, '');
    assert.equal(input.readOnly, false);
    assert.equal(d.activeElement, input);
    const back = d.getElementById('btn-versus-battle-back');
    back.focus();
    w.showBattle();
    assert.equal(d.activeElement, back);
    w.versus.players[0].hp = 0;
    w.showBattle();
    assert.equal(input.disabled, true);
    assert.equal(d.activeElement, back);
  } finally { w.close(); }
});

test('capital question retains country name and flag; HP nodes persist for transitions', () => {
  const dom = setup(), w = dom.window, d = w.document;
  try {
    w.versus.category = 'capitals';
    w.versus.question.prompt = 'France';
    w.showBattle();
    const visual = d.getElementById('versus-flag-visual');
    assert.equal(visual.querySelector('.capital-prompt').textContent, 'France');
    assert.equal(visual.querySelector('img').src, 'https://flagcdn.com/w320/fr.png');
    assert.equal(d.getElementById('versus-type-input').placeholder, 'Nom de la capitale…');
    const bar = d.querySelector('#versus-hp-roster .versus-hp-fill');
    w.versus.players[0].hp = 200;
    w.showBattle();
    assert.equal(d.querySelector('#versus-hp-roster .versus-hp-fill'), bar);
    assert.equal(bar.style.width, '20%');
    assert.equal(d.querySelector('#versus-hp-roster [role=progressbar]').getAttribute('aria-valuenow'), '200');
    assert.ok(d.querySelector('#versus-hp-roster .is-low'));
  } finally { w.close(); }
});

test('versus MCQ renders four options and hides free-write controls', () => {
  const dom = setup(), w = dom.window, d = w.document;
  try {
    w.versus.answerMode = 'mcq';
    w.versus.question.choices = ['France', 'Italie', 'Espagne', 'Allemagne'];
    // Avoid exercising network submission in this rendering test.
    w.submitVersusAnswer = () => {};
    w.showBattle();
    assert.equal(d.getElementById('versus-type-row').classList.contains('hidden'), true);
    assert.equal(d.getElementById('versus-mcq-area').classList.contains('hidden'), false);
    assert.deepEqual([...d.querySelectorAll('#versus-mcq-area button')].map(button=>button.textContent), w.versus.question.choices);
  } finally { w.close(); }
});
