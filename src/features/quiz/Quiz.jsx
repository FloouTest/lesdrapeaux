import { useEffect, useMemo, useRef, useState } from "react";
import { CAPITALS, CAPITAL_ALIASES } from "../../../capitals.js";
import { answerMatches, formatTime, shuffle } from "../../game";
import { Back, Button } from "../../components/Layout";

export default function Quiz({ config, finish, quit }) {
  const order = useMemo(
    () => shuffle(config.pool).slice(0, config.count || config.pool.length),
    [config],
  );
  const [index, setIndex] = useState(0),
    [score, setScore] = useState(0),
    [value, setValue] = useState(""),
    [choice, setChoice] = useState(""),
    [answered, setAnswered] = useState(null),
    [hint, setHint] = useState(false),
    [seconds, setSeconds] = useState(0),
    [log, setLog] = useState([]);
  const started = useRef(Date.now());
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setValue("");
    setChoice("");
    setAnswered(null);
    setHint(false);
  }, [index]);
  const item = order[index];
  const answer =
    config.category === "capitals" ? CAPITALS[item.name] : item.name;
  const options = useMemo(
    () =>
      shuffle([
        answer,
        ...shuffle(config.pool.filter((country) => country.name !== item.name))
          .slice(0, 3)
          .map((country) =>
            config.category === "capitals"
              ? CAPITALS[country.name]
              : country.name,
          ),
      ]),
    [answer, config.category, config.pool, item.name],
  );
  function validate(given) {
    if (answered !== null) return;
    const correct =
      config.mode === "qcm"
        ? given === answer
        : answerMatches(
            given,
            answer,
            config.category === "capitals" ? CAPITAL_ALIASES[answer] : [],
          );
    setAnswered(correct);
    if (correct) setScore((current) => current + 1);
    setLog((current) => [
      ...current,
      {
        name: answer,
        country: item.name,
        flag: item.flag,
        correct,
        userAnswer: given,
      },
    ]);
    if (config.fast && config.mode === "qcm")
      setTimeout(() => next(correct), 450);
  }
  function next(latest = answered) {
    if (index + 1 === order.length)
      finish({
        score: score + (latest === true && answered === null ? 1 : 0),
        total: order.length,
        seconds,
        log:
          answered === null
            ? [
                ...log,
                {
                  name: answer,
                  country: item.name,
                  flag: item.flag,
                  correct: latest,
                  userAnswer: choice || value,
                },
              ]
            : log,
        config,
      });
    else setIndex((current) => current + 1);
  }
  return (
    <main className="card quiz-card">
      <Back go={quit}>← Changer de continent / mode</Back>
      <div className="quiz-top">
        <span className="stamp">
          {config.ranked ? "CLASSÉ" : config.region}
        </span>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Progression du quiz"
          aria-valuemin="0"
          aria-valuemax={order.length}
          aria-valuenow={index}
        >
          <span style={{ width: `${(index / order.length) * 100}%` }} />
        </div>
        <div className="quiz-stats">
          <span className="stat-pill">⏱ {formatTime(seconds)}</span>
          <span className="stat-pill">
            ❌ {index - score} faute{index - score !== 1 ? "s" : ""}
          </span>
          <span className="score-tag">
            Score : {score}/{index}
          </span>
        </div>
      </div>
      <p className="question-heading">
        {config.category === "capitals"
          ? "Identifie cette capitale"
          : "Identifie ce drapeau"}
      </p>
      <div className="flag-frame">
        <div
          className={
            config.category === "capitals" ? "capital-question" : "flag-visual"
          }
        >
          {config.category === "capitals" && (
            <span className="country-label">{item.name}</span>
          )}
          <img
            className="flag"
            src={item.flag}
            alt={
              config.category === "capitals"
                ? `Drapeau de ${item.name}`
                : "Drapeau à deviner"
            }
          />
        </div>
      </div>
      {config.mode === "qcm" ? (
        <div className="choices">
          {options.map((option) => (
            <Button
              key={option}
              disabled={answered !== null}
              className={
                (answered !== null && option === answer ? "correct " : "") +
                (answered === false && option === choice ? "wrong" : "")
              }
              onClick={() => {
                setChoice(option);
                if (config.fast) validate(option);
              }}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <div className="type-area">
          <div className="type-row">
            <input
              className="type-input"
              placeholder={
                config.category === "capitals"
                  ? "Nom de la capitale…"
                  : "Nom du pays…"
              }
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (answered === null ? validate(value) : next())
              }
            />
            <Button className="btn-validate" onClick={() => validate(value)}>
              Valider
            </Button>
          </div>
          <div className="hint-box">
            <Button className="hint-btn" onClick={() => setHint(true)}>
              💡 Besoin d'un indice ? (situe le pays)
            </Button>
            {hint && (
              <p className="hint-text">Ce pays se trouve en {item.region}.</p>
            )}
          </div>
        </div>
      )}
      {config.mode === "qcm" && !config.fast && answered === null && (
        <div className="qcm-validate-row">
          <Button
            className="btn-validate"
            disabled={!choice}
            onClick={() => validate(choice)}
          >
            Valider
          </Button>
        </div>
      )}
      {answered !== null && (
        <>
          <p
            role="status"
            aria-live="polite"
            className={`feedback ${answered ? "ok" : "ko"}`}
          >
            {answered ? "✓ Bonne réponse !" : `✗ Réponse : ${answer}`}
          </p>
          <Button onClick={() => next()}>Question suivante →</Button>
        </>
      )}
    </main>
  );
}
