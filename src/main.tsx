import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/styles/index.css";
import "./assets/styles/a11y.css";
import { applyReadingSize } from "./lib/readingSize";
import { applyZoomSetting } from "./lib/viewportZoom";
import AppRoutes from "./routes";

// Apply saved accessibility preferences before first paint.
applyReadingSize();
applyZoomSetting();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>
);
