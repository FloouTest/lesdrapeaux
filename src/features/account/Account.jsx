import { useState } from "react";
import { api } from "../../game";
import { Back, Button } from "../../components/Layout";

export default function Account({ done }) {
  const [step, setStep] = useState(1);
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState("");

  async function next() {
    if (!pseudo.trim()) return;
    try {
      const data = await api("account/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim() }),
      });
      setExisting(Boolean(data.hasPassword));
      setStep(2);
    } catch {
      done(pseudo.trim().slice(0, 20));
    }
  }

  async function submit() {
    setError("");
    if (!existing && (password.length < 4 || password !== confirm)) {
      setError(
        password.length < 4
          ? "4 caractères minimum."
          : "Mots de passe différents.",
      );
      return;
    }
    try {
      await api(existing ? "account/login" : "account/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: pseudo.trim(), password }),
      });
      done(pseudo.trim().slice(0, 20));
    } catch (cause) {
      setError(cause.message);
    }
  }

  return (
    <main className="card account">
      <h1>Bienvenue dans l'Atlas des Drapeaux 🌍</h1>
      {step === 1 ? (
        <>
          <p>Choisis un pseudo pour apparaître dans le classement.</p>
          <div className="pseudo-row">
            <input
              className="pseudo-input"
              placeholder="Ton pseudo…"
              autoComplete="off"
              aria-label="Pseudo"
              value={pseudo}
              maxLength="20"
              onChange={(e) => setPseudo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && next()}
            />
            <Button onClick={next}>Continuer</Button>
          </div>
        </>
      ) : (
        <>
          <Back go={() => setStep(1)} />
          <p>
            {existing
              ? "Entre ton mot de passe."
              : "Crée un mot de passe pour protéger ton pseudo."}
          </p>
          <input
            className="pseudo-input"
            placeholder="Mot de passe (4 caractères min.)"
            aria-label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {!existing && (
            <input
              className="pseudo-input"
              placeholder="Confirme le mot de passe"
              aria-label="Confirmer"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
          <Button onClick={submit}>Valider</Button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  );
}
