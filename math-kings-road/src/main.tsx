import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import Game from "./page";

const root = document.getElementById("root");

if (!root) throw new Error("找不到遊戲根節點");

createRoot(root).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);

