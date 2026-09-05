import { useState } from "react";
import Setup from "../quiz/Setup";
import { Button } from "../../components/Layout";
import { tierForDivision } from "./ranked";
import useHomeProgress from "./useHomeProgress";

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default function Home({ pseudo, go, startRanked, start }) {
  const [category, setCategory] = useState("flags");
  const { ranked, weekly, todayIndex } = useHomeProgress(pseudo, category);
  const tier = tierForDivision(ranked.division);
  const dailyLimit = ranked.dailyLimit ?? 5;
  const remaining = Math.max(0, dailyLimit - ranked.gamesToday);
  return (
    <main className="card home-card">
      <div className="player-badge">
        <span>
          👋 Salut <strong>{pseudo || "Joueur"}</strong>
        </span>
        <div className="badge-actions">
          <Button className="leaderboard-btn" onClick={() => go("leaderboard")}>
            🏆 Classement
          </Button>
          <Button className="leaderboard-btn" onClick={() => go("history")}>
            🕐 Historique
          </Button>
          <Button className="change-link" onClick={() => go("account")}>
            changer de pseudo
          </Button>
        </div>
      </div>
      <div className="streak-widget" aria-label="Série hebdomadaire">
        <div className="streak-days">
          {DAYS.map((day, i) => (
            <span
              className={`streak-day${weekly.days[i] ? " played" : ""}${i === todayIndex ? " today" : ""}`}
              key={i}
            >
              {day}
            </span>
          ))}
        </div>
        <span className="streak-count">
          {weekly.days.filter(Boolean).length}/7 jours joués cette semaine
        </span>
      </div>
      <section className="ranked-banner">
        <div className="ranked-banner-left">
          <span className="ranked-tier-badge">{tier.icon}</span>
          <div>
            <strong className="ranked-tier-name">{tier.name}</strong>
            <div className="ranked-rating">
              {ranked.points}
              {ranked.division < 12 ? "/100" : ""} FP
            </div>
            <div className="ranked-progress-track">
              <span
                className="ranked-progress-fill"
                style={{
                  width: `${ranked.division >= 12 ? 100 : Math.min(100, ranked.points)}%`,
                }}
              />
            </div>
            {ranked.streak > 0 && (
              <div className="ranked-streak">
                🔥 Série de {ranked.streak} partie{ranked.streak > 1 ? "s" : ""}{" "}
                à 80%+
              </div>
            )}
          </div>
        </div>
        <div className="ranked-banner-right">
          <small>
            Format fixe : Monde entier · 20 questions · Saisie libre
          </small>
          <small>
            {remaining}/{dailyLimit} partie{remaining !== 1 ? "s" : ""} classée
            {remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""}{" "}
            aujourd'hui
          </small>
          <div className="ranked-actions">
            <Button
              className="ranked-play-btn"
              disabled={remaining === 0}
              onClick={() => startRanked("flags", ranked.division)}
            >
              🏳️ Classé drapeaux
            </Button>
            <Button
              className="ranked-play-btn"
              disabled={remaining === 0}
              onClick={() => startRanked("capitals", ranked.division)}
            >
              🏛️ Classé capitales
            </Button>
          </div>
        </div>
      </section>
      <section className="map-banner">
        <div className="map-banner-left">
          <span className="map-banner-icon" aria-hidden="true">
            🗺️
          </span>
          <div>
            <strong className="map-banner-title">Trouve sur la carte</strong>
            <div className="map-banner-sub">
              Repère un pays à partir de son nom ou de sa capitale
            </div>
          </div>
        </div>
        <Button className="map-banner-play" onClick={() => go("map")}>
          Explorer le monde
        </Button>
      </section>
      <section className="versus-banner">
        <div className="versus-banner-left">
          <span className="versus-icon">⚔️</span>
          <div>
            <strong className="versus-title">Mode Versus multijoueur</strong>
            <div className="versus-sub">Affronte 2 à 8 amis, en direct</div>
          </div>
        </div>
        <Button className="versus-play-btn" onClick={() => go("versus")}>
          ⚔️ Jouer en versus
        </Button>
      </section>
      <Setup embedded start={start} onCategoryChange={setCategory} />
    </main>
  );
}
