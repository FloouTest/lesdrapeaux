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
      <main className="card result">
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
          <div className="ranked-result">
            <div className="ranked-result-badge">
              {tier.icon} {tier.name}
            </div>
            {result.dailyLimitReached ? (
              <div className="ranked-result-total">
                🚫 Tu as déjà joué tes {result.dailyLimit} parties classées du
                jour — cette partie n'a rapporté aucun FP. Reviens demain !
              </div>
            ) : (
              <>
                <div className="ranked-result-delta up">
                  +{result.gained} FP
                  {result.bonus > 0 ? ` (dont +${result.bonus} série 🔥)` : ""}
                </div>
                <div className="ranked-result-total">
                  {result.points}/100 FP dans cette ligue ·{" "}
                  {Math.max(0, result.dailyLimit - result.gamesToday)}/
                  {result.dailyLimit} parties classées restantes aujourd'hui
                </div>
              </>
            )}
          </div>
        )}
        <div className="result-actions">
          <Button onClick={replay}>Rejouer ce continent</Button>
          <Button className="btn-ghost" onClick={() => go("home")}>
            Changer de continent
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
