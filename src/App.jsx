import React from "react";
import Sara from "./Sara";
import HeaderUsuario from "./shared/layout/HeaderUsuario";
import AnaliticaPage from "./features/analitica/AnaliticaPage";
import { useUsuarioActual } from "./shared/hooks/useUsuarioActual";
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

  const esVistaPantallaCompleta = location.pathname === "/analitica";

  return (
    <>
      {!esVistaPantallaCompleta && (
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
            path="/analitica"
            element={<AnaliticaPage usuarioActual={usuarioActual} />}
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