import React from "react";
import Sara from "./Sara";
import HeaderUsuario from "./HeaderUsuario";
import TableroPage from "./tablero/TableroPage";
import { useUsuarioActual } from "./hooks/useUsuarioActual";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

function AppContent() {
  const { usuarioActual, setUsuarioActual } = useUsuarioActual();
  const location = useLocation();

  const enTablero = location.pathname === "/tablero";

  return (
    <>
      {!enTablero && (
        <HeaderUsuario
          usuarioActual={usuarioActual}
          setUsuarioActual={setUsuarioActual}
        />
      )}

      {!usuarioActual ? (
        <div className="p-4">
          <p>Iniciá sesión...</p>
        </div>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <main className="flex-1">
                <Sara usuarioActual={usuarioActual} />
              </main>
            }
          />
          <Route
            path="/tablero"
            element={<TableroPage usuarioActual={usuarioActual} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;