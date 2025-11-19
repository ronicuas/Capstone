import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function FullPageSpinner() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      background: "#0a0a0a"
    }}>
      Cargando…
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras validamos /api/me (o refrescamos token) mostramos loading
  if (loading) return <FullPageSpinner />;

  // Si no hay usuario => al login y recordamos a dónde quería ir
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
