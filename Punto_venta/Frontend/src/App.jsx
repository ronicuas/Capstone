// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import CashOpen from "./pages/CashOpen";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shop from "./pages/Shop";
import ShopSuccess from "./pages/ShopSuccess";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Inventario from "./pages/Inventario";
import Reports from "./pages/Reports";
import ReportesPersonalizados from "./pages/ReportesPersonalizados";
// --- RoleGate: permite el paso solo si el rol del usuario está dentro de "allow"
function getStoredRole() {
  return (
    localStorage.getItem("role") ||
    sessionStorage.getItem("role") ||
    null
  );
}
function RoleGate({ allow = [], children }) {
  const role = getStoredRole();

  // Si no hay rol aún, ProtectedRoute decidirá (redirige a /login si no hay token)
  if (!role) return children;

  // Admin siempre puede pasar
  if (role === "admin") return children;

  // Si el rol está en la lista permitida, ok
  if (allow.includes(role)) return children;

  // Si no tiene permiso, 403
  return <Navigate to="/403" replace />;
}

function Forbidden() {
  return (
    <div style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>403</h1>
      <p>No tienes permisos para acceder a esta página.</p>
      <a href="/">Volver al inicio</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Públicas */}
            <Route path="/login" element={<Login />} />

            {/* POS (ahora vendedor + admin) */}
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <Shop />
                  </RoleGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/success"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <ShopSuccess />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Inventario (bodeguero + admin) */}
            <Route
              path="/inventario"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["bodeguero", "admin"]}>
                    <Inventario />
                  </RoleGate>
                </ProtectedRoute>
              }
            />
            <Route
            path="/ReportesPersonalizados"
            element={
              <ProtectedRoute>
                <RoleGate allow={["admin"]}>
                  <ReportesPersonalizados />
                </RoleGate>
              </ProtectedRoute>
            }/>
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <Reports />
                  </RoleGate>
                </ProtectedRoute>
              } />
            <Route/>
          
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <Orders />
                  </RoleGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <OrderDetail />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Dashboard solo admin (allow vacío => solo admin pasa) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleGate allow={[]}>
                    <Dashboard />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Apertura de caja (vendedor + admin) */}
            <Route
              path="/cash/open"
              element={
                <ProtectedRoute>
                  <RoleGate allow={["vendedor", "admin"]}>
                    <CashOpen />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* 403 */}
            <Route path="/403" element={<Forbidden />} />

            {/* Fallback */}
            <Route path="*" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
