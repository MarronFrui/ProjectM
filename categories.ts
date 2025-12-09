import { contentDB, loadContentDB } from "./config";
import {
    assignRowCol,
    menuNavigation,
} from "./navigation";

const container = document.getElementById("category-container");
const backButton = document.getElementById("back-button");

backButton?.addEventListener("click", () => history.back());

async function initCategories() {
    await loadContentDB();

    const allGenres = Array.from(
        new Set(contentDB.flatMap((item) => item.category || []))
    ).sort();

    allGenres.forEach((genre, index) => {
        const card = document.createElement("div");
        card.className = "smaller-card";
        card.tabIndex = 0;
        card.dataset.row = "1";
        card.dataset.col = `${index}`;
        card.textContent = genre;

        card.addEventListener("click", () => openFilteredMoviePage());

        container?.appendChild(card);

    });

    // After cards are added, assign row/col and enable navigation
    assignRowCol();
    menuNavigation();
}

function openFilteredMoviePage() {
    const win = window.open("", "_blank");
    if (!win) return;
    return;
}

initCategories();
