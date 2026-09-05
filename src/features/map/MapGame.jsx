import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import topology from "@rembish/iso-topojson/iso-a2-markers.json";
import { CAPITALS } from "../../../capitals";
import { ALL_COUNTRIES, COUNTRIES } from "../../data/countries";
import { Back, Button } from "../../components/Layout";
import { CountryPicker } from "../quiz/Setup";
import { api, formatTime, shuffle } from "../../game";
import {
  MAP_GAME_LENGTH,
  MAP_MAX_ATTEMPTS,
  clickFoundTarget,
  distanceLabel,
  distanceToTarget,
  panTransform,
} from "./mapGame";

const WIDTH = 900;
const HEIGHT = 470;
const MIN_ZOOM = 1;
const MAX_ZOOM = 24;
const QUIZ_COUNTRY_CODES = new Set(
  ALL_COUNTRIES.map((country) => country.code.toUpperCase()),
);
const MAP_FEATURES = Object.values(topology.objects)
  .flatMap((object) => {
    const converted = feature(topology, object);
    return converted.features || [converted];
  })
  .filter((item) => QUIZ_COUNTRY_CODES.has(item.properties.iso_a2));
const FEATURES_BY_CODE = new Map(
  MAP_FEATURES.map((item) => [item.properties.iso_a2, item]),
);
const MAP_COUNTRIES = ALL_COUNTRIES.filter(
  (country) =>
    FEATURES_BY_CODE.has(country.code.toUpperCase()) && CAPITALS[country.name],
);
const projection = geoNaturalEarth1().fitExtent(
  [
    [10, 10],
    [WIDTH - 10, HEIGHT - 10],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection);

function viewBoxPoint(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return [
    ((event.clientX - bounds.left) / bounds.width) * WIDTH,
    ((event.clientY - bounds.top) / bounds.height) * HEIGHT,
  ];
}

export function mapFeatureFor(code) {
  return FEATURES_BY_CODE.get(String(code).toUpperCase());
}

export function WorldMap({ target, guesses, outcome, onGuess }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const map = useRef(null);
  const drag = useRef(null);
  const pinch = useRef(null);
  const pointers = useRef(new Map());

  useEffect(() => {
    const element = map.current;
    if (!element) return undefined;
    function handleWheel(event) {
      event.preventDefault();
      const [x, y] = viewBoxPoint(event);
      const factor = event.deltaY < 0 ? 1.35 : 1 / 1.35;
      setTransform((current) => {
        const nextK = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, current.k * factor),
        );
        const ratio = nextK / current.k;
        return {
          k: nextK,
          x: x - (x - current.x) * ratio,
          y: y - (y - current.y) * ratio,
        };
      });
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  function pinchPoints(bounds) {
    return [...pointers.current.values()].slice(0, 2).map((pointer) => ({
      x: ((pointer.x - bounds.left) / bounds.width) * WIDTH,
      y: ((pointer.y - bounds.top) / bounds.height) * HEIGHT,
    }));
  }

  function startPinch(bounds) {
    const [first, second] = pinchPoints(bounds);
    pinch.current = {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      center: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
      transform,
    };
    drag.current = null;
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      startPinch(event.currentTarget.getBoundingClientRect());
      return;
    }
    if (pointers.current.size > 2) return;
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      mapX: transform.x,
      mapY: transform.y,
      k: transform.k,
      clickedCode: event.target.closest?.("[data-country]")?.dataset.country,
    };
  }

  function handlePointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const bounds = event.currentTarget.getBoundingClientRect();
    if (pinch.current && pointers.current.size >= 2) {
      const [first, second] = pinchPoints(bounds);
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const nextK = Math.max(
        MIN_ZOOM,
        Math.min(
          MAX_ZOOM,
          pinch.current.transform.k * (distance / pinch.current.distance),
        ),
      );
      const ratio = nextK / pinch.current.transform.k;
      setTransform({
        k: nextK,
        x:
          center.x -
          (pinch.current.center.x - pinch.current.transform.x) * ratio,
        y:
          center.y -
          (pinch.current.center.y - pinch.current.transform.y) * ratio,
      });
      return;
    }
    if (!drag.current) return;
    setTransform(
      panTransform(
        drag.current,
        { x: event.clientX, y: event.clientY },
        { x: WIDTH / bounds.width, y: HEIGHT / bounds.height },
      ),
    );
  }

  function handlePointerUp(event) {
    const wasPinching = Boolean(pinch.current) || pointers.current.size > 1;
    pointers.current.delete(event.pointerId);
    if (wasPinching) {
      if (pointers.current.size < 2) pinch.current = null;
      drag.current = null;
      return;
    }
    if (!drag.current) return;
    const dragStart = drag.current;
    const pointerTravel = Math.hypot(
      event.clientX - dragStart.pointerX,
      event.clientY - dragStart.pointerY,
    );
    drag.current = null;
    if (pointerTravel > 5 || outcome) return;
    const [screenX, screenY] = viewBoxPoint(event);
    const coordinate = projection.invert([
      (screenX - transform.x) / transform.k,
      (screenY - transform.y) / transform.k,
    ]);
    if (!coordinate) return;
    onGuess(coordinate, dragStart.clickedCode);
  }

  function handlePointerCancel(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  }

  function zoom(factor) {
    const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.k * factor));
    const ratio = nextK / transform.k;
    setTransform({
      k: nextK,
      x: WIDTH / 2 - (WIDTH / 2 - transform.x) * ratio,
      y: HEIGHT / 2 - (HEIGHT / 2 - transform.y) * ratio,
    });
  }

  return (
    <div className="map-stage">
      <svg
        ref={map}
        className="map-world"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Carte interactive du monde. Clique ou zoome pour trouver le pays."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <rect className="map-ocean" width={WIDTH} height={HEIGHT} />
        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
        >
          {MAP_FEATURES.map((country) => {
            const code = country.properties.iso_a2;
            const isTarget = outcome && code === target.properties.iso_a2;
            if (country.geometry.type === "Point") {
              const position = projection(country.geometry.coordinates);
              return (
                <g key={code} data-country={code}>
                  <circle
                    className="map-marker-hitbox"
                    cx={position[0]}
                    cy={position[1]}
                    r={16 / transform.k}
                  />
                  <circle
                    className={`map-marker${isTarget ? ` is-target${outcome === "missed" ? " is-missed" : ""}` : ""}`}
                    cx={position[0]}
                    cy={position[1]}
                    r={Math.max(2.5, 6 / transform.k)}
                  />
                </g>
              );
            }
            return (
              <path
                key={code}
                data-country={code}
                className={`map-country${isTarget ? ` is-target${outcome === "missed" ? " is-missed" : ""}` : ""}`}
                d={path(country)}
              />
            );
          })}
          {guesses.map((guess, index) => {
            const position = projection(guess.coordinate);
            return (
              <g
                key={index}
                transform={`translate(${position[0]} ${position[1]})`}
              >
                <circle className="map-guess-ring" r={7 / transform.k} />
                <circle className="map-guess-dot" r={2.4 / transform.k} />
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-zoom-controls" aria-label="Contrôles de la carte">
        <button
          type="button"
          onClick={() => zoom(1 / 1.5)}
          aria-label="Dézoomer"
          disabled={transform.k === MIN_ZOOM}
        >
          −
        </button>
        <output aria-label="Niveau de zoom">
          {Math.round(transform.k * 100)} %
        </output>
        <button
          type="button"
          onClick={() => zoom(1.5)}
          aria-label="Zoomer"
          disabled={transform.k === MAX_ZOOM}
        >
          +
        </button>
        <button
          className="map-reset-control"
          type="button"
          onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
          disabled={transform.k === MIN_ZOOM && !transform.x && !transform.y}
        >
          Réinitialiser
        </button>
      </div>
      <p className="map-help">
        Molette, pincement ou boutons pour zoomer · Fais glisser pour te
        déplacer
      </p>
    </div>
  );
}

function ModeChoice({ back, start }) {
  const [region, setRegion] = useState("Monde entier");
  const [custom, setCustom] = useState([]);
  const [picker, setPicker] = useState(false);
  const [count, setCount] = useState(MAP_GAME_LENGTH);
  const pool =
    region === "selection"
      ? MAP_COUNTRIES.filter((country) => custom.includes(country.name))
      : region === "Monde entier"
        ? MAP_COUNTRIES
        : MAP_COUNTRIES.filter((country) => country.region === region);

  if (picker)
    return (
      <main className="card map-screen map-setup">
        <CountryPicker
          selected={custom}
          setSelected={setCustom}
          countries={MAP_COUNTRIES}
          minimum={5}
          done={() => {
            setRegion("selection");
            setPicker(false);
          }}
          back={() => setPicker(false)}
        />
      </main>
    );

  return (
    <main className="card map-screen map-setup">
      <Back go={back} />
      <div className="map-page-heading">
        <span aria-hidden="true">🗺️</span>
        <div>
          <p className="map-kicker">Nouveau mode</p>
          <h1>Trouve sur la carte</h1>
          <p className="subtitle">
            Repère les pays de ton choix, avec 6 essais maximum par pays. Après
            chaque essai, découvre la distance qui te sépare de la bonne
            réponse.
          </p>
        </div>
      </div>
      <h2>Quels pays veux-tu explorer ?</h2>
      <div className="continents">
        {[...Object.keys(COUNTRIES), "Monde entier"].map((name) => (
          <Button
            className={`cont-btn ${region === name ? "selected" : ""}`}
            aria-pressed={region === name}
            onClick={() => setRegion(name)}
            key={name}
          >
            <span className="name">{name}</span>
            <small>
              {name === "Monde entier"
                ? MAP_COUNTRIES.length
                : MAP_COUNTRIES.filter((country) => country.region === name)
                    .length}{" "}
              pays
            </small>
          </Button>
        ))}
      </div>
      <div
        className={`cont-btn custom-select-btn ${region === "selection" ? "selected" : ""}`}
      >
        <div>
          <strong>🎨 Sélection personnalisée</strong>
          <small>
            {custom.length
              ? `${custom.length} pays sélectionnés`
              : "Aucun pays choisi pour l'instant"}
          </small>
        </div>
        <Button className="modify-btn" onClick={() => setPicker(true)}>
          Modifier
        </Button>
      </div>
      <h2>Combien de pays veux-tu trouver ?</h2>
      <label className="map-count-select">
        <span>Nombre de pays</span>
        <select
          value={count === "endless" ? count : Math.min(count, pool.length, 30)}
          onChange={(event) =>
            setCount(
              event.target.value === "endless"
                ? "endless"
                : Number(event.target.value),
            )
          }
        >
          {[...new Set([5, 10, 20, 30, Math.min(30, pool.length)])]
            .filter((value) => value <= pool.length)
            .sort((a, b) => a - b)
            .map((value) => (
              <option value={value} key={value}>
                {value} pays
              </option>
            ))}
          <option value="endless">Endless</option>
        </select>
      </label>
      <h2>Quel indice veux-tu recevoir ?</h2>
      <div className="map-mode-grid">
        <button
          type="button"
          onClick={() =>
            start(
              "country",
              pool,
              count === "endless" ? null : Math.min(count, pool.length, 30),
            )
          }
        >
          <span aria-hidden="true">🏳️</span>
          <strong>Nom du pays</strong>
          <small>Exemple : trouve le Japon</small>
        </button>
        <button
          type="button"
          onClick={() =>
            start(
              "capital",
              pool,
              count === "endless" ? null : Math.min(count, pool.length, 30),
            )
          }
        >
          <span aria-hidden="true">🏛️</span>
          <strong>Nom de la capitale</strong>
          <small>Exemple : trouve le pays de Tokyo</small>
        </button>
      </div>
    </main>
  );
}

export default function MapGame({ back, pseudo }) {
  const [mode, setMode] = useState(null);
  const [pool, setPool] = useState(MAP_COUNTRIES);
  const [gameLength, setGameLength] = useState(MAP_GAME_LENGTH);
  const [ended, setEnded] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [round, setRound] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [results, setResults] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(null);
  const savedGame = useRef(null);
  const endless = gameLength === null;
  const cycle = endless ? Math.floor(round / pool.length) : 0;
  const order = useMemo(
    () => shuffle(pool).slice(0, endless ? pool.length : gameLength),
    [cycle, endless, gameId, gameLength, pool],
  );
  const finished = ended || (!endless && round === gameLength);
  const total = endless ? round : gameLength;
  const country = order[endless ? round % order.length : round];
  const target = country
    ? FEATURES_BY_CODE.get(country.code.toUpperCase())
    : null;

  useEffect(() => {
    if (!mode || finished || !startedAt.current) return undefined;
    const update = () =>
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [mode, finished, gameId]);

  useEffect(() => {
    if (!finished || savedGame.current === gameId) return;
    savedGame.current = gameId;
    const score = results.filter((result) => result.found).length;
    api("map-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pseudo,
        promptMode: mode,
        score,
        total,
        attempts: results.reduce((sum, result) => sum + result.attempts, 0),
        seconds,
        details: results,
      }),
    }).catch(() => {});
  }, [finished, gameId, mode, pseudo, results, seconds, total]);

  function startMode(nextMode, nextPool, nextGameLength) {
    startedAt.current = Date.now();
    setSeconds(0);
    setPool(nextPool);
    setGameLength(nextGameLength);
    setEnded(false);
    setMode(nextMode);
  }

  function restart() {
    startedAt.current = Date.now();
    setGameId((current) => current + 1);
    setEnded(false);
    setRound(0);
    setResults([]);
    setGuesses([]);
    setOutcome(null);
    setSeconds(0);
  }

  if (!mode) return <ModeChoice back={back} start={startMode} />;

  if (finished) {
    const totalAttempts = results.reduce(
      (sum, result) => sum + result.attempts,
      0,
    );
    const score = results.filter((result) => result.found).length;
    return (
      <main className="card map-screen map-finish">
        <span className="map-finish-icon" aria-hidden="true">
          🧭
        </span>
        <p className="map-kicker">Partie terminée</p>
        <h1>
          {score === total ? "Explorateur accompli !" : "Expédition terminée"}
        </h1>
        <p>
          Tu as trouvé{" "}
          <strong>
            {score} pays sur {total}
          </strong>{" "}
          en {formatTime(seconds)}.
        </p>
        <div className="map-finish-stats">
          <span>
            <strong>{totalAttempts}</strong> clics
          </span>
          <span>
            <strong>{formatTime(seconds)}</strong> temps total
          </span>
        </div>
        <div className="result-actions">
          <Button onClick={restart}>Rejouer</Button>
          <Button className="btn-ghost" onClick={back}>
            Retour à l’accueil
          </Button>
        </div>
      </main>
    );
  }

  function handleGuess(coordinate, clickedCode) {
    if (outcome) return;
    const correct = clickFoundTarget(target, coordinate, clickedCode);
    const nextGuess = {
      coordinate,
      distance: correct ? 0 : distanceToTarget(target, coordinate),
    };
    const nextGuesses = [...guesses, nextGuess];
    setGuesses(nextGuesses);
    if (correct) setOutcome("found");
    else if (nextGuesses.length >= MAP_MAX_ATTEMPTS) setOutcome("missed");
  }

  function nextRound() {
    setResults((current) => [
      ...current,
      {
        country: country.name,
        code: country.code,
        attempts: guesses.length,
        found: outcome === "found",
      },
    ]);
    setRound((current) => current + 1);
    setGuesses([]);
    setOutcome(null);
  }

  const lastGuess = guesses.at(-1);
  const prompt = mode === "capital" ? CAPITALS[country.name] : country.name;

  return (
    <main className="card map-screen">
      <Back go={back}>← Quitter la partie</Back>
      <div className="map-game-top">
        <div>
          <p className="map-kicker">
            {endless
              ? `Pays ${round + 1} · Mode Endless`
              : `Pays ${round + 1} sur ${gameLength}`}
          </p>
          <h1>
            {mode === "capital"
              ? "Dans quel pays se trouve…"
              : "Trouve ce pays"}
          </h1>
        </div>
        <div className="map-round-stats">
          {endless && round > 0 && !outcome && (
            <Button
              className="btn-ghost map-endless-finish"
              onClick={() => setEnded(true)}
            >
              Terminer l’expédition
            </Button>
          )}
          <span className="map-attempts">
            {guesses.length}/{MAP_MAX_ATTEMPTS} essais
          </span>
          <span className="map-attempts">⏱ {formatTime(seconds)}</span>
        </div>
      </div>
      <div className="map-prompt">
        {mode !== "capital" && (
          <img src={country.flag} alt="Drapeau du pays à situer" />
        )}
        <span>{prompt}</span>
      </div>
      <WorldMap
        target={target}
        guesses={guesses}
        outcome={outcome}
        onGuess={handleGuess}
      />
      <div
        className={`map-feedback${outcome === "found" ? " is-found" : outcome === "missed" ? " is-missed" : ""}`}
        aria-live="polite"
      >
        {!lastGuess && (
          <span>Clique sur la carte pour proposer une position.</span>
        )}
        {lastGuess && !outcome && (
          <>
            <strong>Encore {distanceLabel(lastGuess.distance)}</strong>
            <span> jusqu’au pays recherché. Essaie encore !</span>
          </>
        )}
        {outcome === "found" && (
          <>
            <strong>✓ {country.name} trouvé !</strong>
            <span>
              {guesses.length === 1
                ? "Du premier coup !"
                : `En ${guesses.length} essais.`}
            </span>
            <Button onClick={nextRound}>
              {!endless && round + 1 === gameLength
                ? "Voir mes résultats"
                : "Pays suivant →"}
            </Button>
          </>
        )}
        {outcome === "missed" && (
          <>
            <strong>✗ C’était {country.name}</strong>
            <span>Limite de {MAP_MAX_ATTEMPTS} essais atteinte.</span>
            <Button onClick={nextRound}>
              {!endless && round + 1 === gameLength
                ? "Voir mes résultats"
                : "Pays suivant →"}
            </Button>
          </>
        )}
      </div>
      <footer className="map-attribution">
        Frontières : Natural Earth · données cartographiques sous CC BY 4.0
      </footer>
    </main>
  );
}
