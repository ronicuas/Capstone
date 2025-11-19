// services/api.js
import axios from "axios";

// Usa tu backend; si tienes VITE_API_BASE en .env, lo toma.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// ---- Helpers de tokens en localStorage ----
function getAccess() {
  return localStorage.getItem("access");
}
function getRefresh() {
  return localStorage.getItem("refresh");
}
function setTokens({ access, refresh }) {
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}
function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// (Opcional) para guardar/limpiar role y usuario cuando tú quieras
export function setRoleAndUser(role, userObj) {
  const S = localStorage.getItem("access") ? localStorage : sessionStorage;
  if (role) S.setItem("role", role);
  if (userObj) S.setItem("user", JSON.stringify(userObj));
}
export function clearRoleAndUser() {
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("user");
}

// Exporto para que AuthContext pueda setear/limpiar tokens
export const setAuthTokens = setTokens;
export const clearAuthTokens = clearTokens;

// ---- Util: detectar endpoints de auth para no ciclar refresh/login ----
const isAuthUrl = (url = "") =>
  url.includes("/api/token/") || url.includes("/api/token/refresh/");

// ---- Interceptor de request: agrega Authorization y NO fija Content-Type en FormData ----
api.interceptors.request.use((config) => {
  const access = getAccess();
  if (access && !isAuthUrl(config.url || "")) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${access}` };
  }
  // Si enviamos FormData, dejamos que Axios fije el boundary automáticamente
  if (config.data instanceof FormData && config.headers) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// ---- Manejo de refresh concurrente ----
let isRefreshing = false;
let refreshPromise = null;
const subscribers = [];

function onRefreshed(newAccess) {
  subscribers.forEach((cb) => cb(newAccess));
  subscribers.length = 0;
}
function addSubscriber(cb) {
  subscribers.push(cb);
}

// ---- Interceptor de response: intenta refresh en 401 (salvo auth URLs o reintento) ----
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error || {};
    if (!response || !config) return Promise.reject(error);

    // No refrescar si: no es 401, ya es reintento, o es URL de auth
    if (response.status !== 401 || config.__isRetryRequest || isAuthUrl(config.url || "")) {
      return Promise.reject(error);
    }

    const refresh = getRefresh();
    if (!refresh) return Promise.reject(error);

    // Disparamos el refresh (una sola vez)
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = axios
        .post(`${API_BASE}/api/token/refresh/`, { refresh })
        .then((res) => {
          const newAccess = res.data.access;
          setTokens({ access: newAccess, refresh });
          isRefreshing = false;
          onRefreshed(newAccess);
          return newAccess;
        })
        .catch((err) => {
          isRefreshing = false;
          clearTokens();
          onRefreshed(null);
          throw err;
        });
    }

    // Encolamos este request para cuando termine el refresh
    const retryOrigReq = new Promise((resolve, reject) => {
      addSubscriber((newAccess) => {
        if (!newAccess) return reject(error);
        const newCfg = { ...config, __isRetryRequest: true };
        newCfg.headers = { ...(newCfg.headers || {}), Authorization: `Bearer ${newAccess}` };
        resolve(api(newCfg));
      });
    });

    // Esperamos a que el refresh termine (si ya estaba en curso no lanza 2 veces)
    await refreshPromise.catch(() => {});
    return retryOrigReq;
  }
);

export default api;
