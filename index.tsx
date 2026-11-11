import { createRoot } from "react-dom/client";
// Player styles ship with the installed plyr package (the CDN copy was removed
// from index.html so the app has no external stylesheet dependency).
import "plyr/dist/plyr.css";
import App from "./src/components/App";

createRoot(document.getElementById("app")!).render(<App />);
