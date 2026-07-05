import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/styles/index.css";
import { applyReadingSize } from "./lib/readingSize";
import AppRoutes from "./routes";

// Apply the saved reading text size before first paint (accessibility).
applyReadingSize();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>
);
