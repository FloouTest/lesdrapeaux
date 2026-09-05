import { useState } from "react";
import { ALL_COUNTRIES, COUNTRIES } from "../../data/countries";
import { Back, Button } from "../../components/Layout";

const ICONS = {
  Afrique: "🌍",
  Amérique: "🌎",
  Asie: "🌏",
  Europe: "🏰",
  Océanie: "🏝️",
};
function Picker({ selected, setSelected, done, back }) {
  const toggle = (name) =>
    setSelected(
      selected.includes(name)
        ? selected.filter((x) => x !== name)
        : [...selected, name],
    );
  return (
    <section className="picker-screen" aria-labelledby="picker-title">
      <Back go={back} />
      <h2 id="picker-title">Choisis tes drapeaux</h2>
      <p>
        Clique sur les drapeaux à inclure dans ton quiz. Sélectionne-en au moins
        un pour continuer.
      </p>
      <div className="picker-toolbar">
        <Button
          className="btn-ghost"
          onClick={() =>
            setSelected(
              selected.length === ALL_COUNTRIES.length
                ? []
                : ALL_COUNTRIES.map((x) => x.name),
            )
          }
        >
          Tout sélectionner
        </Button>
        <b>
          {selected.length} drapeau{selected.length !== 1 ? "x" : ""}{" "}
          sélectionné{selected.length !== 1 ? "s" : ""}
        </b>
      </div>
      <div className="picker-groups">
        {Object.entries(COUNTRIES).map(([group, countries]) => (
          <section className="picker-group" key={group}>
            <h3>
              {ICONS[group]} {group}
            </h3>
            <div className="picker-grid">
              {countries.map((c) => (
                <button
                  type="button"
                  className={`flag-card ${selected.includes(c.name) ? "selected" : ""}`}
                  aria-pressed={selected.includes(c.name)}
                  onClick={() => toggle(c.name)}
                  key={c.name}
                >
                  <img src={c.flag} alt="" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="picker-bottom">
        <Button className="btn-ghost" onClick={back}>
          Annuler
        </Button>
        <Button disabled={!selected.length} onClick={done}>
          Valider ma sélection
        </Button>
      </div>
    </section>
  );
}
export default function Setup({
  go,
  start,
  embedded = false,
  onCategoryChange,
}) {
  const [category, setCategory] = useState("flags"),
    [region, setRegion] = useState(""),
    [mode, setMode] = useState(""),
    [fast, setFast] = useState(false),
    [limited, setLimited] = useState(false),
    [count, setCount] = useState(10),
    [custom, setCustom] = useState([]),
    [picker, setPicker] = useState(false);
  if (picker)
    return (
      <Picker
        selected={custom}
        setSelected={setCustom}
        done={() => {
          setRegion("selection");
          setPicker(false);
        }}
        back={() => setPicker(false)}
      />
    );
  const pool =
    region === "selection"
      ? ALL_COUNTRIES.filter((c) => custom.includes(c.name))
      : region === "Monde entier"
        ? ALL_COUNTRIES
        : COUNTRIES[region] || [];
  return (
    <section className="setup" aria-labelledby="setup-title">
      {!embedded && <Back go={() => go("home")} />}
      <p id="setup-title" className="subtitle">
        Choisis ce que tu veux réviser, un continent, puis une façon de jouer.
      </p>
      <div className="game-categories" aria-label="Sujet du quiz">
        {[
          ["flags", "🏳️ Drapeaux"],
          ["capitals", "🏛️ Capitales"],
        ].map(([v, l]) => (
          <Button
            key={v}
            className={`game-category-btn ${category === v ? "selected" : ""}`}
            aria-pressed={category === v}
            onClick={() => {
              setCategory(v);
              onCategoryChange?.(v);
            }}
          >
            {l}
          </Button>
        ))}
      </div>
      <h3 className="section-label">1 — Choisis ta destination</h3>
      <div className="continents">
        {[...Object.keys(COUNTRIES), "Monde entier"].map((name) => (
          <Button
            className={`cont-btn ${region === name ? "selected" : ""}`}
            aria-pressed={region === name}
            onClick={() => setRegion(name)}
            key={name}
          >
            <span className="name">
              {ICONS[name] || "🗺️"} {name}
            </span>
            <small>
              {name === "Monde entier"
                ? ALL_COUNTRIES.length
                : COUNTRIES[name].length}{" "}
              {category === "flags" ? "drapeaux" : "capitales"}
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
              ? `${custom.length} drapeaux sélectionnés`
              : "Aucun drapeau choisi pour l'instant"}
          </small>
        </div>
        <Button className="modify-btn" onClick={() => setPicker(true)}>
          Modifier
        </Button>
      </div>
      <h3 className="section-label">2 — Choisis ton mode de jeu</h3>
      <div className="modes">
        {[
          [
            "qcm",
            "🎯 4 réponses",
            "Le drapeau s'affiche, choisis le bon pays parmi 4 propositions.",
          ],
          [
            "free",
            "⌨️ Saisie libre",
            "Le drapeau s'affiche, écris le nom du pays (une lettre d'erreur tolérée).",
          ],
        ].map(([v, n, d]) => (
          <Button
            className={`mode-btn ${mode === v ? "selected" : ""}`}
            aria-pressed={mode === v}
            onClick={() => setMode(v)}
            key={v}
          >
            <span className="name">{n}</span>
            <small>{d}</small>
          </Button>
        ))}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={fast}
          onChange={(e) => setFast(e.target.checked)}
        />{" "}
        ⚡ Mode rapide — en QCM, valide dès le clic et passe directement au
        drapeau suivant
      </label>
      <h3 className="section-label">3 — Nombre de drapeaux (optionnel)</h3>
      <label className="toggle">
        <input
          type="checkbox"
          checked={limited}
          onChange={(e) => setLimited(e.target.checked)}
        />{" "}
        Limiter le quiz à un nombre précis de drapeaux tirés au hasard
      </label>
      {limited && (
        <div className="slider">
          <input
            aria-label="Nombre de questions"
            type="range"
            min="10"
            max="30"
            step="10"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          />
          <b>{count} drapeaux</b>
        </div>
      )}
      <div className="start-row">
        <Button
          disabled={!pool.length || !mode}
          onClick={() =>
            start({
              category,
              region,
              mode,
              fast,
              count: limited ? count : null,
              pool,
            })
          }
        >
          Commencer le quiz
        </Button>
      </div>
    </section>
  );
}
