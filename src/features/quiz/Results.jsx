import { useEffect, useState } from "react";
import { Button } from "../../components/Layout";
import { formatTime } from "../../game";
import { tierForDivision } from "../home/ranked";
export default function Results({ result, go, replay }) {
  const promoted =
    result.ranked &&
    !result.dailyLimitReached &&
    result.division > result.divisionBefore;
  const tier = tierForDivision(result.division);
  const [summary, setSummary] = useState(false),
    [promotion, setPromotion] = useState(promoted);
  useEffect(() => {
    if (!promotion) return;
    const id = setTimeout(() => setPromotion(false), 3000);
    return () => clearTimeout(id);
  }, [promotion]);
  const ratio = result.score / result.total;
  return (
    <>
      <main
        className={`card result${result.ranked ? " ranked-result-screen" : ""}`}
      >
        {result.ranked && (
          <p className="result-kicker">Partie classée terminée</p>
        )}
        <div className="result-badge">
          {result.score}/{result.total}
        </div>
        <p className="result-msg">
          {ratio >= 0.8 ? "Excellent voyage !" : "Continue ton exploration !"}
        </p>
        <p className="result-msg">
          ⏱ {formatTime(result.seconds)} · ❌ {result.total - result.score}{" "}
          faute{result.total - result.score !== 1 ? "s" : ""}
        </p>
        {result.ranked && (
          <section className="ranked-result" aria-label="Progression classée">
            <div className="ranked-result-heading">
              <span className="ranked-result-icon" aria-hidden="true">
                {tier.icon}
              </span>
              <div>
                <small>Ligue actuelle</small>
                <strong>{tier.name}</strong>
              </div>
            </div>
            {result.dailyLimitReached ? (
              <div className="ranked-result-limit">
                <span aria-hidden="true">⏳</span>
                <div>
                  <strong>Limite quotidienne atteinte</strong>
                  <p>
                    Cette partie est enregistrée, mais ne rapporte aucun FP.
                    Reviens demain !
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="ranked-result-reward">
                  <small>Progression gagnée</small>
                  <strong>+{result.gained} FP</strong>
                  {result.bonus > 0 && (
                    <span>🔥 Bonus de série : +{result.bonus} FP</span>
                  )}
                </div>
                <div className="ranked-result-progress-copy">
                  <span>Progression dans la ligue</span>
                  <strong>{result.points}/100 FP</strong>
                </div>
                <div
                  className="ranked-result-progress"
                  role="progressbar"
                  aria-label="Progression dans la ligue"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={Math.min(100, result.points)}
                >
                  <span style={{ width: `${Math.min(100, result.points)}%` }} />
                </div>
                <div className="ranked-result-stats">
                  <span>
                    <strong>{Math.round(ratio * 100)}%</strong>
                    de réussite
                  </span>
                  <span>
                    <strong>{formatTime(result.seconds)}</strong>
                    temps total
                  </span>
                  <span>
                    <strong>
                      {Math.max(0, result.dailyLimit - result.gamesToday)}/
                      {result.dailyLimit}
                    </strong>
                    parties restantes
                  </span>
                </div>
              </>
            )}
          </section>
        )}
        <div className="result-actions">
          <Button onClick={replay}>
            {result.ranked ? "Rejouer en classé" : "Rejouer ce continent"}
          </Button>
          <Button className="btn-ghost" onClick={() => go("home")}>
            {result.ranked ? "Retour à l’accueil" : "Changer de continent"}
          </Button>
          <Button className="btn-ghost" onClick={() => go("leaderboard")}>
            🏆 Voir le classement
          </Button>
        </div>
        <Button
          className="summary-toggle"
          aria-expanded={summary}
          onClick={() => setSummary(!summary)}
        >
          📋 {summary ? "Masquer" : "Voir"} le résumé des réponses
        </Button>
        {summary && (
          <div className="answers-summary">
            {result.log.map((entry, i) => (
              <div
                className={`summary-row ${entry.correct ? "ok" : "ko"}`}
                key={i}
              >
                {entry.flag && (
                  <img className="summary-flag" src={entry.flag} alt="" />
                )}
                <span>{entry.correct ? "✓" : "✗"}</span>
                <strong className="summary-name">{entry.name}</strong>
                {!entry.correct && (
                  <span className="summary-answer">
                    Ta réponse : {entry.userAnswer || "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      {promotion && (
        <div
          className="promotion-overlay show"
          role="dialog"
          aria-modal="true"
          aria-label="Promotion"
        >
          <div className="promotion-card">
            <div className="promotion-icon">{tier.icon}</div>
            <div className="promotion-title">Promotion !</div>
            <div className="promotion-tier">{tier.name}</div>
            <div className="promotion-sub">Nouvelle ligue débloquée</div>
          </div>
        </div>
      )}
    </>
  );
}
