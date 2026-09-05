import { useEffect, useState } from "react";
import { COUNTRIES } from "../../data/countries";
import { api, formatTime } from "../../game";
import { Back } from "../../components/Layout";
export default function Leaderboard({ back, pseudo }) {
  const [tab, setTab] = useState("casual"),
    [category, setCategory] = useState("flags"),
    [region, setRegion] = useState("Europe"),
    [count, setCount] = useState("Tous"),
    [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    setError("");
    setLoading(true);
    const countQuery = count !== "Tous" ? `&count=${count}` : "";
    api(
      tab === "ranked"
        ? `ranked/leaderboard?category=${category}`
        : `leaderboard?category=${category}&continent=${encodeURIComponent(region)}${countQuery}`,
    )
      .then((d) => setRows(d.players || d.entries || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, category, region, count]);
  return (
    <main className="card">
      <Back go={back} />
      <h1>🏆 Classement</h1>
      <p className="subtitle">
        Les meilleurs scores, classés par précision puis par rapidité.
      </p>
      <div className="lb-tabs" role="tablist" aria-label="Type de classement">
        {[
          ["casual", "Parties"],
          ["ranked", "🏆 Classé"],
        ].map(([v, l]) => (
          <button
            role="tab"
            aria-selected={tab === v}
            className={`lb-tab ${tab === v ? "selected" : ""}`}
            onClick={() => setTab(v)}
            key={v}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="lb-toolbar" aria-label="Filtres du classement">
        <label className="lb-field">
          Catégorie
          <select
            className="lb-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="flags">🏳️ Drapeaux</option>
            <option value="capitals">🏛️ Capitales</option>
          </select>
        </label>
        {tab === "casual" && (
          <>
            <label className="lb-field">
              Région
              <select
                className="lb-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {[...Object.keys(COUNTRIES), "Monde entier"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="lb-field">
              Questions
              <select
                className="lb-select"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              >
                <option value="Tous">Tous les formats</option>
                <option value="complete">Quiz complet</option>
                <option value="10">10 questions</option>
                <option value="20">20 questions</option>
                <option value="30">30 questions</option>
              </select>
            </label>
          </>
        )}
      </div>
      {error ? (
        <div className="lb-empty lb-error">{error}</div>
      ) : loading ? (
        <div className="lb-empty" aria-busy="true">
          Chargement…
        </div>
      ) : rows.length ? (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Explorateur</th>
                <th>Score</th>
                <th>Temps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  className={`${i < 3 ? "podium" : ""} ${r.pseudo === pseudo ? "me" : ""}`}
                  key={`${r.pseudo}-${i}`}
                >
                  <td className="lb-rank">{i + 1}</td>
                  <td data-label="Explorateur">{r.pseudo}</td>
                  <td data-label="Score">
                    {tab === "ranked"
                      ? `${r.points} FP · ${r.division}`
                      : `${r.score}/${r.total}`}
                  </td>
                  <td data-label="Temps">{formatTime(r.seconds || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lb-empty">Aucun score pour ces filtres.</div>
      )}
    </main>
  );
}
