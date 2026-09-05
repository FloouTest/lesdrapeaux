import { useEffect, useMemo, useRef, useState } from "react";
import { CAPITALS, CAPITAL_ALIASES } from "../../../capitals.js";
import { ALL_COUNTRIES, COUNTRIES } from "../../data/countries";
import { api, shuffle } from "../../game";
import { Back, Button } from "../../components/Layout";

const automaticJoins = new Map();

function joinFromInvitation(code, pseudo) {
  const key = `${code}:${pseudo}`;
  if (!automaticJoins.has(key)) {
    automaticJoins.set(
      key,
      api("versus/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, pseudo }),
      }).catch((error) => {
        automaticJoins.delete(key);
        throw error;
      }),
    );
  }
  return automaticJoins.get(key);
}

export function buildQuestions(settings) {
  const pool =
    settings.continent === "Monde entier"
      ? ALL_COUNTRIES
      : COUNTRIES[settings.continent];
  return shuffle(pool)
    .slice(0, 40)
    .map((country) => {
      const answer =
        settings.category === "capitals"
          ? CAPITALS[country.name]
          : country.name;
      const alternatives = pool
        .map((item) =>
          settings.category === "capitals" ? CAPITALS[item.name] : item.name,
        )
        .filter((value) => value && value !== answer);
      return {
        answer,
        image: country.flag,
        prompt: settings.category === "capitals" ? country.name : undefined,
        aliases:
          settings.category === "capitals" ? CAPITAL_ALIASES[answer] || [] : [],
        ...(settings.answerMode === "mcq"
          ? {
              choices: shuffle([
                answer,
                ...shuffle([...new Set(alternatives)]).slice(0, 3),
              ]),
            }
          : {}),
      };
    });
}

function roomSummary(settings) {
  const category =
    settings.category === "capitals" ? "🏛️ Capitales" : "🏳️ Drapeaux";
  const mode = settings.answerMode === "mcq" ? "☑️ QCM" : "⌨️ Saisie libre";
  return `${category} · ${mode} · ${settings.continent}`;
}

export function PlayerRoster({ players, waiting = false }) {
  return (
    <div
      className={`versus-roster${players.length > 4 ? " is-crowded" : ""}`}
      data-player-count={players.length}
    >
      {players.map((player) => {
        const hp = Math.max(0, player.hp ?? 1000);
        return (
          <article
            className={`versus-player${player.self ? " is-self" : ""}${hp <= 250 ? " is-low" : ""}${hp === 0 ? " is-out" : ""}`}
            key={player.playerId ?? player.pseudo}
          >
            <div className="versus-player-heading">
              <span className="versus-avatar" aria-hidden="true">
                {player.pseudo.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{player.pseudo}</strong>
                <small>
                  {player.self ? "Toi · " : ""}
                  {waiting ? "Prêt à jouer" : hp === 0 ? "Éliminé" : "En jeu"}
                </small>
              </div>
            </div>
            {!waiting && (
              <>
                <div
                  className="versus-health-track"
                  role="progressbar"
                  aria-label={`Vie de ${player.pseudo}`}
                  aria-valuemin="0"
                  aria-valuemax="1000"
                  aria-valuenow={hp}
                >
                  <span style={{ width: `${hp / 10}%` }} />
                </div>
                <div className="versus-player-meta">
                  <span>{hp} / 1000 PV</span>
                  <span>{player.index ?? 0} réponses</span>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

export const INCORRECT_FEEDBACK_DURATION_MS = 2500;

export function shouldHoldIncorrectFeedback(feedbackUntil, now = Date.now()) {
  return now < feedbackUntil;
}

export default function Versus({ pseudo, go }) {
  const invitedRoom =
    new URLSearchParams(location.search).get("room")?.trim().toUpperCase() ||
    "";
  const [screen, setScreen] = useState("lobby");
  const [code, setCode] = useState(invitedRoom);
  const [token, setToken] = useState("");
  const [host, setHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState(null);
  const [winner, setWinner] = useState(null);
  const [settings, setSettings] = useState({
    category: "flags",
    answerMode: "free",
    continent: "Monde entier",
    maxPlayers: 5,
  });
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const incorrectFeedbackUntil = useRef(0);
  const incorrectFeedbackTimer = useRef(null);
  const input = useRef(null);
  const questionKey =
    question?.index ?? question?.id ?? question?.prompt ?? question?.image;
  const request = (path, options = {}) =>
    api(`versus/${path}`, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  function adopt(data) {
    setCode(data.code);
    setToken(data.token);
    setHost(data.role === "p1");
    history.replaceState(null, "", `?room=${data.code}`);
    setScreen("wait");
  }
  const post = (path, body) =>
    request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  async function create() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      adopt(
        await post("create", {
          pseudo,
          ...settings,
          flags: buildQuestions(settings),
        }),
      );
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      adopt(await post("join", { code: code.toUpperCase(), pseudo }));
    } catch (cause) {
      setMessage(cause.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!invitedRoom || !pseudo || token) return undefined;
    let active = true;
    setBusy(true);
    setMessage("Connexion automatique au salon…");
    joinFromInvitation(invitedRoom, pseudo)
      .then((data) => {
        if (active) adopt(data);
      })
      .catch((cause) => {
        if (active) setMessage(cause.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [invitedRoom, pseudo, token]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    let timer;
    const controller = new AbortController();
    async function poll() {
      let delay = 800;
      try {
        const data = await request(`state?code=${code}&token=${token}`, {
          signal: controller.signal,
        });
        if (!active) return;
        setPlayers(data.players || []);
        setWinner(data.winner || null);
        setQuestion(
          Array.isArray(data.question)
            ? { answer: data.question[0], image: data.question[1] }
            : data.question,
        );
        setSettings((current) => ({
          ...current,
          category: data.category || current.category,
          answerMode: data.answerMode || current.answerMode,
          continent: data.continent || current.continent,
        }));
        if (data.status === "active") setScreen("battle");
        if (data.status === "finished") setScreen("result");
      } catch (cause) {
        if (cause.name === "AbortError") return;
        delay = 2000;
      }
      if (active) timer = setTimeout(poll, delay);
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, code]);

  useEffect(() => {
    setAnswer("");
    if (!shouldHoldIncorrectFeedback(incorrectFeedbackUntil.current)) {
      setMessage("");
    }
    submitting.current = false;
    requestAnimationFrame(() => input.current?.focus());
  }, [questionKey]);

  useEffect(
    () => () => clearTimeout(incorrectFeedbackTimer.current),
    [],
  );
  async function submit(value = answer) {
    if (submitting.current || !value) return;
    submitting.current = true;
    try {
      const data = await post("answer", {
        code,
        token,
        index: players.find((player) => player.self)?.index,
        answer: value,
      });
      if (!data.correct) {
        incorrectFeedbackUntil.current =
          Date.now() + INCORRECT_FEEDBACK_DURATION_MS;
        clearTimeout(incorrectFeedbackTimer.current);
        incorrectFeedbackTimer.current = setTimeout(() => {
          incorrectFeedbackUntil.current = 0;
          setMessage("");
        }, INCORRECT_FEEDBACK_DURATION_MS);
      }
      setMessage(
        data.correct
          ? "✓ Bonne réponse !"
          : `✗ Mauvaise réponse${data.correctAnswer ? ` · Réponse : ${data.correctAnswer}` : ""}`,
      );
    } catch (cause) {
      setMessage(cause.message);
      submitting.current = false;
    }
  }
  async function quit() {
    try {
      if (token) await post("quit", { code, token });
    } catch {}
    history.replaceState(null, "", location.pathname);
    go("home");
  }
  const invitation = useMemo(
    () => `${location.origin}${location.pathname}?room=${code}`,
    [code],
  );

  if (screen === "lobby")
    return (
      <main className="card versus-lobby-screen">
        <Back go={() => go("home")} />
        <h1>⚔️ Mode Versus multijoueur</h1>
        <p className="subtitle versus-rules">
          1000 PV par joueur. Bonne réponse : +50 PV pour toi et −100 PV aux
          autres. Mauvaise réponse : −25 PV.
        </p>

        <div className="versus-lobby-grid">
          <section className="versus-lobby-card">
            <h2>Créer un salon</h2>
            <p>Choisis les règles puis partage l’invitation.</p>
            <div className="versus-options-grid">
              <label>
                <span>À deviner</span>
                <select
                  value={settings.category}
                  onChange={(e) =>
                    setSettings({ ...settings, category: e.target.value })
                  }
                >
                  <option value="flags">🏳️ Drapeaux</option>
                  <option value="capitals">🏛️ Capitales</option>
                </select>
              </label>
              <label>
                <span>Réponses</span>
                <select
                  value={settings.answerMode}
                  onChange={(e) =>
                    setSettings({ ...settings, answerMode: e.target.value })
                  }
                >
                  <option value="free">⌨️ Saisie libre</option>
                  <option value="mcq">☑️ QCM</option>
                </select>
              </label>
              <label>
                <span>Région</span>
                <select
                  value={settings.continent}
                  onChange={(e) =>
                    setSettings({ ...settings, continent: e.target.value })
                  }
                >
                  {["Monde entier", ...Object.keys(COUNTRIES)].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Capacité</span>
                <select
                  value={settings.maxPlayers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxPlayers: Number(e.target.value),
                    })
                  }
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                    <option key={count} value={count}>
                      {count} joueurs
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              className="versus-create-button"
              disabled={busy}
              onClick={create}
            >
              {busy ? "Création…" : "Créer mon salon"}
            </Button>
          </section>

          <section className="versus-lobby-card versus-join-card">
            <h2>Rejoindre un salon</h2>
            <p>Entre le code que ton adversaire t’a donné.</p>
            <label className="versus-code-field">
              <span>Code du salon</span>
              <input
                aria-label="Code du salon"
                placeholder="Ex. X7K2P"
                maxLength={10}
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && code.trim() && join()}
              />
            </label>
            <Button
              className="versus-join-button"
              disabled={busy || !code.trim()}
              onClick={join}
            >
              {busy ? "Connexion…" : "Rejoindre"}
            </Button>
          </section>
        </div>
        {message && (
          <p className="msg-error" role="alert">
            {message}
          </p>
        )}
      </main>
    );
  if (screen === "wait")
    return (
      <main className="card versus-wait-screen">
        <Back go={quit}>← Annuler</Back>
        <div className="versus-wait-heading">
          <div>
            <span className="versus-eyebrow">Salon prêt</span>
            <h1>⏳ Salle d’attente</h1>
          </div>
          <span className="versus-player-count">
            {players.length}/{settings.maxPlayers} joueurs
          </span>
        </div>
        <p className="subtitle">Partage ce code ou le lien d’invitation :</p>
        <div
          className="versus-code-display"
          aria-label={`Code du salon ${code}`}
        >
          {code}
        </div>
        <div className="versus-wait-actions">
          <Button
            className="btn-ghost"
            onClick={() =>
              navigator.clipboard
                .writeText(invitation)
                .then(() => setMessage("Lien copié !"))
                .catch(() => setMessage(invitation))
            }
          >
            🔗 Copier le lien
          </Button>
          {host && (
            <Button
              disabled={players.length < 2}
              onClick={() =>
                post("start", { code, token }).catch((cause) =>
                  setMessage(cause.message),
                )
              }
            >
              Démarrer la partie
            </Button>
          )}
        </div>
        <p className="versus-room-summary">{roomSummary(settings)}</p>
        <div className="section-label">Joueurs présents</div>
        <PlayerRoster players={players} waiting />
        {message && (
          <p className="versus-status" role="status">
            {message}
          </p>
        )}
      </main>
    );
  if (screen === "result") {
    const mine = winner === pseudo;
    return (
      <main className="card result versus-result-screen">
        <div className="result-badge">
          {winner === "draw" ? "🤝" : mine ? "🏆" : "💀"}
        </div>
        <h1>
          {winner === "draw"
            ? "Match nul !"
            : mine
              ? "Victoire !"
              : `Victoire de ${winner || "un adversaire"}`}
        </h1>
        <PlayerRoster players={[...players].sort((a, b) => b.hp - a.hp)} />
        <div className="result-actions">
          <Button
            onClick={() => {
              setToken("");
              setPlayers([]);
              setQuestion(null);
              setWinner(null);
              setScreen("lobby");
            }}
          >
            Nouveau salon
          </Button>
          <Button className="btn-ghost" onClick={quit}>
            Retour à l’accueil
          </Button>
        </div>
      </main>
    );
  }
  const self = players.find((player) => player.self);
  const eliminated = self && self.hp <= 0;
  return (
    <main className="card versus-battle-screen">
      <Back go={quit}>← Quitter la partie</Back>
      <div className="versus-battle-heading">
        <div>
          <span className="versus-eyebrow">Arène multijoueur</span>
          <h1>Chaque réponse compte.</h1>
        </div>
        <span className="versus-player-count">
          {players.filter((player) => player.hp > 0).length}/{players.length} en
          jeu
        </span>
      </div>
      <PlayerRoster players={players} />
      {eliminated && (
        <p className="versus-spectating">
          💀 Tu es éliminé·e — tu peux regarder la fin du match.
        </p>
      )}
      <section className="versus-arena">
        <div
          className={`versus-question-visual${question?.prompt ? " is-capital" : ""}`}
        >
          {question?.prompt && <h2>{question.prompt}</h2>}
          {question?.image && (
            <img
              className="flag"
              src={question.image}
              alt={
                question?.prompt
                  ? `Drapeau de ${question.prompt}`
                  : "Drapeau à deviner"
              }
            />
          )}
          {!question && <p>En attente de la prochaine question…</p>}
        </div>
        {settings.answerMode === "mcq" && question?.choices ? (
          <div className="choices">
            {question.choices.map((choice) => (
              <Button
                key={choice}
                disabled={submitting.current || eliminated}
                onClick={() => submit(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        ) : (
          <div className="answer">
            <input
              ref={input}
              autoFocus
              value={answer}
              disabled={eliminated || !question}
              placeholder={
                settings.category === "capitals"
                  ? "Nom de la capitale…"
                  : "Nom du pays…"
              }
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button
              disabled={eliminated || !question || !answer.trim()}
              onClick={() => submit()}
            >
              Valider
            </Button>
          </div>
        )}
        <p className="versus-input-hint">
          Entrée pour valider · Bonne réponse +50 PV / −100 aux adversaires
        </p>
        {message && (
          <p
            className={`versus-feedback${message.startsWith("✓") ? " is-correct" : message.startsWith("✗") ? " is-wrong" : ""}`}
            role="status"
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
