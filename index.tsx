import { loadContentDB } from "./config.ts";
import { createRoot } from 'react-dom/client';
import App from './components/App.tsx';
import nav from './navigation.ts'

async function init() {
    try {
        await loadContentDB();
        const root = createRoot(document.getElementById('app')!);
        root.render(<App />);
        nav.init(); 
    } catch (err) {
        console.error("Failed to initialize:", err);
    }
}

init();