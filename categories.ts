import { contentDB, loadContentDB } from "./config";
import { assignRowCol, menuNavigation} from "./navigation";

const container = document.getElementById("category-container");
const backButton = document.getElementById("back-button");

backButton?.addEventListener("click", () => history.back());
backButton?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") history.back();
});

function assignCategoryRows(container: HTMLElement) {
    const categoryCards = Array.from(container.children) as HTMLElement[];
    const tolerance = 4;

    let currentRow = 0;
    let lastTop = -Infinity;
    let col = 0;

    categoryCards.forEach(card => {
        const top = card.getBoundingClientRect().top;

        if (Math.abs(top - lastTop) > tolerance) {
            currentRow++;
            col = 0;
            lastTop = top;
        }

        card.dataset.row = currentRow.toString();
        card.dataset.col = col.toString();
        col++;
    });
}

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

        card.addEventListener("click", () => openFilteredMoviePage(genre));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter"){
                openFilteredMoviePage(genre)
            }
        });

        container?.appendChild(card);
    });

        if (container) {
        assignCategoryRows(container);
    }

    assignRowCol();
    menuNavigation();
}

function openFilteredMoviePage(genre: string) {
    const slug = encodeURIComponent(genre);
    window.location.href = `category.html?genre=${slug}`;
}

initCategories();
