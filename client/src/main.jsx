import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Follow the OS theme. The old app had no dark mode at all, and hardcoded a
// black theme-color against a white design.
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = (on) => document.documentElement.classList.toggle("dark", on);
applyTheme(dark.matches);
dark.addEventListener("change", (e) => applyTheme(e.matches));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
