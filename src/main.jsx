import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./main.css"; // Puedes crear un archivo vacío si no lo tienes

ReactDOM.createRoot(document.getElementById("root")).render(
  //crea la raiz en el elemento con id root de index.html
  <React.StrictMode>
    {" "}
    {/* Modo estricto de React para ayudar a detectar problemas */}
    <App />{" "}
    {/* Renderiza el componente principal de la aplicación, que a su vez puede tener otros dentro */}
  </React.StrictMode>,
);
