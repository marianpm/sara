// App.jsx
import React from "react";
import Sara from "./Sara";
import HeaderUsuario from "./HeaderUsuario";
import { useUsuarioActual } from "./hooks/useUsuarioActual";

function App() {
  const { usuarioActual, setUsuarioActual } = useUsuarioActual();

  return (
    <>
      <HeaderUsuario
        usuarioActual={usuarioActual}
        setUsuarioActual={setUsuarioActual}
      />

      {usuarioActual ? (
        <main className="flex-1">
          <Sara usuarioActual={usuarioActual} />
        </main>
      ) : (
        <div className="p-4">
          <p>Iniciá sesión...</p>
        </div>
      )}
    </>
  );
}

export default App;
