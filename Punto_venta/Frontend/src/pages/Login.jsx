import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const WRAP_STYLE = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "linear-gradient(145deg, #e8f5ec 0%, #b5e0cc 35%, #0f7a4c 100%)",
};

const CARD_STYLE = {
  width: "min(420px, 92vw)",
  background: "#ffffff",
  borderRadius: 20,
  border: "1px solid #d4eadc",
  boxShadow: "0 30px 65px rgba(6, 95, 70, 0.35)",
  padding: 28,
  display: "grid",
  gap: 16,
};

const LABEL_STYLE = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1c3a2b",
  marginBottom: 6,
};

const INPUT_STYLE = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #c7dfd1",
  background: "#f9fffb",
  padding: "0 14px",
  fontSize: 15,
  color: "#0f2b20",
  outline: "none",
  boxShadow: "0 4px 14px rgba(15, 95, 70, 0.08)",
};

const BUTTON_STYLE = {
  height: 46,
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #065f46, #0f7a4c)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: 0.4,
  cursor: "pointer",
  boxShadow: "0 18px 28px rgba(6, 95, 70, 0.35)",
  transition: "transform .15s ease, opacity .15s ease",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Credenciales inválidas";
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={WRAP_STYLE}>
      <form onSubmit={onSubmit} style={CARD_STYLE}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "#5a6b5f" }}>Bienvenido a Plantitas POS</p>
          <h2 style={{ margin: "4px 0 0", color: "#0f7a4c" }}>Iniciar sesión</h2>
        </div>

        <label>
          <div style={LABEL_STYLE}>Usuario</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            style={INPUT_STYLE}
          />
        </label>

        <label>
          <div style={LABEL_STYLE}>Contraseña</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={INPUT_STYLE}
          />
        </label>

        {error && (
          <div style={{ color: "#b91c1c", fontSize: 14, background: "#fde8e8", padding: 10, borderRadius: 12 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...BUTTON_STYLE,
            opacity: submitting ? 0.75 : 1,
            transform: submitting ? "translateY(0)" : "translateY(-1px)",
          }}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
