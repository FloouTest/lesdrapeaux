import { lazy, Suspense, useEffect, useState } from "react";
import { ALL_COUNTRIES } from "./data/countries";
import { api } from "./game";
import { Header } from "./components/Layout";
import Account from "./features/account/Account";
import Home from "./features/home/Home";
import Setup from "./features/quiz/Setup";
import Quiz from "./features/quiz/Quiz";
import Results from "./features/quiz/Results";
import Leaderboard from "./features/leaderboard/Leaderboard";
import History from "./features/history/History";
import Versus from "./features/versus/Versus";

const MapGame = lazy(() => import("./features/map/MapGame"));
import { markTodayPlayed } from "./features/home/ranked";

export default function App() {
  const invitedRoom = new URLSearchParams(location.search).get("room");
  const [pseudo, setPseudo] = useState(
    () =>
      localStorage.getItem("local:pseudo") ||
      localStorage.getItem("pseudo") ||
      "",
  );
  const [screen, setScreen] = useState(
    pseudo ? (invitedRoom ? "versus" : "home") : "account",
  );
  const [config, setConfig] = useState();
  const [result, setResult] = useState();
  const [quizQuitRequest, setQuizQuitRequest] = useState(0);

  useEffect(() => {
    if (
      (localStorage.getItem("quiz-drapeaux-theme") ||
        localStorage.getItem("theme")) === "dark"
    )
      document.documentElement.dataset.theme = "dark";
  }, []);

  function login(value) {
    localStorage.setItem("local:pseudo", value);
    setPseudo(value);
    setScreen(invitedRoom ? "versus" : "home");
  }
  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.documentElement.dataset.theme = dark ? "" : "dark";
    localStorage.setItem("quiz-drapeaux-theme", dark ? "light" : "dark");
  }
  function start(nextConfig) {
    setConfig(nextConfig);
    setScreen("quiz");
  }
  function startRanked(category, divisionBefore = 0) {
    start({
      category,
      region: "Monde entier",
      mode: "free",
      fast: false,
      count: 20,
      pool: ALL_COUNTRIES,
      ranked: true,
      divisionBefore,
    });
  }
  async function finish(initialResult) {
    let nextResult = initialResult;
    if (initialResult.config.ranked) {
      try {
        const data = await api("ranked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pseudo,
            category: initialResult.config.category,
            score: initialResult.score,
            total: initialResult.total,
            seconds: initialResult.seconds,
            details: initialResult.log,
          }),
        });
        nextResult = {
          ...initialResult,
          ranked: true,
          gained: data.gained ?? 0,
          division: data.division ?? 0,
          points: data.points ?? 0,
          streak: data.streak ?? 0,
          gamesToday: data.gamesToday ?? data.games_today ?? 0,
          dailyLimit: data.dailyLimit ?? 5,
          dailyLimitReached: Boolean(data.dailyLimitReached),
          bonus: data.bonus ?? 0,
          divisionBefore: initialResult.config.divisionBefore ?? 0,
        };
      } catch {
        nextResult = {
          ...initialResult,
          ranked: true,
          gained: 0,
          points: 0,
          division: initialResult.config.divisionBefore ?? 0,
          divisionBefore: initialResult.config.divisionBefore ?? 0,
          gamesToday: 0,
          dailyLimit: 5,
          bonus: 0,
        };
      }
    } else {
      try {
        await api("leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pseudo,
            category: initialResult.config.category,
            continent: initialResult.config.region,
            mode: initialResult.config.mode === "free" ? "saisie" : "qcm",
            score: initialResult.score,
            total: initialResult.total,
            mistakes: initialResult.total - initialResult.score,
            seconds: initialResult.seconds,
            points: initialResult.score * 100,
            details: initialResult.log,
          }),
        });
      } catch {
        /* Scores remain available locally when API is offline. */
      }
    }
    markTodayPlayed();
    setResult(nextResult);
    setScreen("results");
  }

  function goHome() {
    if (screen === "quiz") {
      setQuizQuitRequest((request) => request + 1);
      return;
    }
    setScreen("home");
  }

  return (
    <>
      <Header pseudo={pseudo} onHome={goHome} onTheme={toggleTheme} />
      {screen === "account" && <Account done={login} />}
      {screen === "home" && (
        <Home
          pseudo={pseudo}
          go={setScreen}
          start={start}
          startRanked={startRanked}
        />
      )}
      {screen === "quiz" && (
        <Quiz
          config={config}
          finish={finish}
          quit={() => setScreen("home")}
          pseudo={pseudo}
          quitRequest={quizQuitRequest}
        />
      )}
      {screen === "results" && (
        <Results result={result} go={setScreen} replay={() => start(config)} />
      )}
      {screen === "leaderboard" && (
        <Leaderboard pseudo={pseudo} back={() => setScreen("home")} />
      )}
      {screen === "history" && (
        <History pseudo={pseudo} back={() => setScreen("home")} />
      )}
      {screen === "versus" && <Versus pseudo={pseudo} go={setScreen} />}
      {screen === "map" && (
        <Suspense
          fallback={<main className="card">Chargement de la carte…</main>}
        >
          <MapGame pseudo={pseudo} back={() => setScreen("home")} />
        </Suspense>
      )}
    </>
  );
}
