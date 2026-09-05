import { useEffect, useState } from "react";
import { api, formatTime } from "../../game";
import { Back } from "../../components/Layout";

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatHistoryDate(value) {
  if (!value) return "Date inconnue";
  const date = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

export function historyAccuracy(row) {
  return row.total > 0 ? Math.round((row.score / row.total) * 100) : 0;
}

function HistoryEntry({ row }) {
  const ranked = row.type === "ranked";
  const mapGame = row.type === "map";
  const accuracy = historyAccuracy(row);
  const label = ranked
    ? "Classé"
    : mapGame
      ? "Trouve sur la carte"
      : row.label || "Partie classique";

  return (
    <li className="history-entry">
      <div
        className={`history-mode-icon ${ranked ? "is-ranked" : ""}`}
        aria-hidden="true"
      >
        {ranked
          ? "🏆"
          : mapGame
            ? "🗺️"
            : row.category === "capitals"
              ? "🏛️"
              : "🌍"}
      </div>
      <div className="history-entry-main">
        <div className="history-entry-heading">
          <div>
            <span className={`history-type ${ranked ? "is-ranked" : ""}`}>
              {ranked ? "Classé" : mapGame ? "Carte" : "Classique"}
            </span>
            <h2>{label}</h2>
          </div>
          <strong className="history-score">
            {row.score}
            <span>/{row.total}</span>
          </strong>
        </div>
        <div className="history-meta">
          <time>{formatHistoryDate(row.created_at)}</time>
          <span>
            {mapGame
              ? row.mode === "capital"
                ? "Indice : capitale"
                : "Indice : pays"
              : row.category === "capitals"
                ? "Capitales"
                : "Drapeaux"}
          </span>
          {!ranked && !mapGame && row.mode && (
            <span>{row.mode === "qcm" ? "QCM" : "Saisie libre"}</span>
          )}
          {mapGame && <span>{row.attempts} essais</span>}
          {mapGame && <span>{formatTime(row.seconds || 0)}</span>}
        </div>
        <div className="history-result-row">
          <div
            className="history-progress"
            aria-label={`${accuracy} % de réussite`}
          >
            <span style={{ width: `${accuracy}%` }} />
          </div>
          <span className="history-accuracy">{accuracy} %</span>
          <span
            className={`history-points ${Number(row.points) > 0 ? "is-positive" : ""}`}
          >
            {mapGame
              ? `${row.attempts} clics`
              : `${Number(row.points) > 0 ? "+" : ""}${row.points || 0} pts`}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function History({ back, pseudo }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    api(`history?pseudo=${encodeURIComponent(pseudo)}`)
      .then((data) => {
        setRows(data.history || []);
        setStatus("ready");
      })
      .catch(() => {
        setRows([]);
        setStatus("error");
      });
  }, [pseudo]);

  const bestScore = rows.reduce(
    (best, row) => Math.max(best, historyAccuracy(row)),
    0,
  );

  return (
    <main className="card history-screen">
      <Back go={back} />
      <header className="history-header">
        <div>
          <p className="history-eyebrow">Tes dernières parties</p>
          <h1>Historique</h1>
          <p className="subtitle">
            Retrouve tes scores et suis ta progression.
          </p>
        </div>
        {!!rows.length && (
          <div className="history-overview" aria-label="Résumé de l'historique">
            <span>
              <strong>{rows.length}</strong> parties
            </span>
            <span>
              <strong>{bestScore} %</strong> meilleur score
            </span>
          </div>
        )}
      </header>

      {status === "loading" && (
        <p className="history-state">Chargement de l’historique…</p>
      )}
      {status === "error" && (
        <p className="history-state is-error">
          Impossible de charger l’historique.
        </p>
      )}
      {status === "ready" && !!rows.length && (
        <ol className="history-list">
          {rows.map((row, index) => (
            <HistoryEntry key={`${row.created_at}-${index}`} row={row} />
          ))}
        </ol>
      )}
      {status === "ready" && !rows.length && (
        <div className="history-empty">
          <span aria-hidden="true">🧭</span>
          <h2>Aucune partie enregistrée</h2>
          <p>Termine un quiz pour voir tes résultats apparaître ici.</p>
        </div>
      )}
    </main>
  );
}
