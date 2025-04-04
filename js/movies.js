function populateMoviesContent(data, attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('movies-content');
    if (!container) {
        if (attempts < maxAttempts) {
            setTimeout(() => populateMoviesContent(data, attempts + 1, maxAttempts), 100);
        }
        return;
    }

    const movies = data.movies;
    const grid = document.createElement('div');
    grid.classList.add('movie-grid');

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.classList.add('movie-card');
        card.innerHTML = `
            <img loading="lazy" src="assets/images/movie_image/${movie.ratingKey}.thumb.jpg" alt="${movie.title}">
            <div class="movie-year">(${movie.year})</div>
            <div class="movie-details">
                <h3>${movie.title}</h3>
                <p>Rated: ${movie.contentRating}</p>
                <p>${movie.durationHuman}</p>
                <p>${movie.videoResolution}</p>
                <p>Codec: ${movie.videoCodec}</p>
                <p>Audio: ${movie.audioCodec}</p>
                <p>File Type: ${movie.container}</p>
                <p>(${movie.sizeHuman})</p>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

document.addEventListener('refDataLoaded', (event) => {
    populateMoviesContent(event.detail);
});

document.addEventListener("DOMContentLoaded", () => {
    const moviesCard = document.querySelector(".movies-card");

    if (moviesCard) {
        moviesCard.addEventListener("click", (event) => {
            event.preventDefault();
        });
    }
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail.metadata;

    const totalMovies = document.querySelector("#movies-total");
    const totalSize = document.querySelector("#movies-size");
    if (totalMovies && totalSize) {
        totalMovies.textContent = `${data.totalMovies} Movies`;
        totalSize.textContent = `(${data.totalSizeHuman})`;
        totalMovies.classList.add("data-loaded");
        totalSize.classList.add("data-loaded");
    }
});

document.addEventListener("refDataLoaded", () => {
    const searchInput = document.getElementById("movie-search");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const movieCards = document.querySelectorAll(".movie-card");

        movieCards.forEach((card) => {
            const titleElement = card.querySelector("h3");
            if (!titleElement) return;

            const title = titleElement.textContent.toLowerCase();
            card.style.display = title.includes(query) ? "block" : "none";
        });
    });
});

function scrollToTop(scrollTarget) {
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
}

function findScrollableElement() {
    const mainContent = document.getElementById('main-content');
    const moviesContent = document.getElementById('movies-content');
    if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        return mainContent;
    } else if (moviesContent && moviesContent.scrollHeight > moviesContent.clientHeight) {
        return moviesContent;
    }
    return window;
}

function initializeScroll(attempts = 0, maxAttempts = 50) {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    let scrollTarget = findScrollableElement();

    if (!scrollToTopBtn) {
        if (attempts < maxAttempts) {
            setTimeout(() => initializeScroll(attempts + 1, maxAttempts), 100);
        }
    }

    const checkScroll = () => {
        const searchContainer = document.querySelector('.search-container');
        const scrollPosition = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;

        const searchContainerBottom = searchContainer.getBoundingClientRect().bottom;

        if (searchContainerBottom < 0 || scrollPosition > 500) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    };

    scrollTarget.addEventListener('scroll', checkScroll);
    scrollToTopBtn.addEventListener('click', () => scrollToTop(scrollTarget));
    checkScroll();

    const observer = new MutationObserver(() => {
        const newScrollTarget = findScrollableElement();
        if (newScrollTarget !== scrollTarget) {
            scrollTarget.removeEventListener('scroll', checkScroll);
            scrollTarget = newScrollTarget;
            scrollTarget.addEventListener('scroll', checkScroll);
        }
    });
    observer.observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });
}

initializeScroll();

function initializeInfoIcons() {
    const cards = document.querySelectorAll('.index-card');
    if (!cards.length) {
        setTimeout(initializeInfoIcons, 100);
        return;
    }

    cards.forEach((card) => {
        const infoIcon = card.querySelector('.info-icon');

        infoIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            card.classList.toggle('hover-enabled');
            card.classList.toggle('hover-scale');
            infoIcon.classList.add('hidden');

            cards.forEach((otherCard) => {
                if (otherCard !== card) {
                    otherCard.classList.remove('hover-enabled');
                    otherCard.classList.remove('hover-scale');
                    const otherIcon = otherCard.querySelector('.info-icon');
                    if (otherIcon) otherIcon.classList.remove('hidden');
                }
            });
        });
    });

    document.addEventListener('click', () => {
        cards.forEach((card) => {
            card.classList.remove('hover-enabled');
            card.classList.remove('hover-scale');
            const icon = card.querySelector('.info-icon');
            if (icon) icon.classList.remove('hidden');
        });
    });
}

initializeInfoIcons();




















