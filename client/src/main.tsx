import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Local storefront entry point. Runtime configuration is optional for local preview.
createRoot(document.getElementById("root")!).render(<App />);
