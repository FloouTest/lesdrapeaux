import { useEffect, useState } from "react";
import { distanceLabel } from "./mapGame";
import { mapFeatureFor, WorldMap } from "./MapGame";

export default function VersusMap({ questionKey, disabled, submitMapGuess }) {
  const [guesses, setGuesses] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [targetCode, setTargetCode] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGuesses([]);
    setOutcome(null);
    setTargetCode(null);
    setMessage("");
  }, [questionKey]);

  async function guess(coordinate, clickedCode) {
    if (disabled || outcome) return;
    try {
      const result = await submitMapGuess(coordinate, clickedCode);
      if (!result.applied) return;
      setGuesses((current) => [
        ...current,
        { coordinate, distance: result.distance ?? 0 },
      ]);
      if (result.correct) {
        setOutcome("found");
        setTargetCode(result.correctAnswer);
        setMessage(`✓ Trouvé ! ${result.damage} dégâts infligés.`);
      } else if (result.exhausted) {
        setOutcome("missed");
        setTargetCode(result.correctAnswer);
        setMessage(`✗ Limite atteinte. C’était ${result.countryName}.`);
      } else {
        setMessage(
          `Encore ${distanceLabel(result.distance)} · ${result.attempts}/6 essais`,
        );
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="versus-map-round">
      <WorldMap
        target={targetCode ? mapFeatureFor(targetCode) : null}
        guesses={guesses}
        outcome={outcome}
        onGuess={guess}
      />
      {message && (
        <p
          className={`versus-feedback${outcome === "found" ? " is-correct" : outcome === "missed" ? " is-wrong" : ""}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
