import { loadContentDB } from "./config";
import nav from "./navigation";

async function init() {
    try {
        await loadContentDB();
        nav.init();
    } catch (err) {
        console.error("Failed to initialize:", err);
    }
}

init();
