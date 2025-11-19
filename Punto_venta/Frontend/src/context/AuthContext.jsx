import { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthTokens, clearAuthTokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar, si hay access token, intentar /api/me/
  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      setLoading(false);
      return;
    }
    api
      .get("/api/me/")
      .then((r) => setUser(r.data))
      .catch(() => {
        clearAuthTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    // 1) obtener tokens
    const { data } = await api.post("/api/token/", { username, password });
    setAuthTokens({ access: data.access, refresh: data.refresh });

    // 2) obtener datos del usuario
    const me = await api.get("/api/me/");
    setUser(me.data);
  }

  function logout() {
    clearAuthTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
