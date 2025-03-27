function populateTVShowsContent(data, attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('tvshows-content');

    const shows = data.shows;

    const grid = document.createElement('div');
    grid.classList.add('tvshow-grid');

    shows.forEach(show => {
        const resolutions = show.avgVideoResolutions.split(',').map(r => r.trim());
        const videoCodecs = show.avgVideoCodecs.split(',').map(c => c.trim());
        const containers = show.avgContainers.split(',').map(c => '.' + c.trim());

        const card = document.createElement('div');
        card.classList.add('tvshow-card');
        card.innerHTML = `
            <img loading="lazy" src="assets/images/tv_image/${show.ratingKey}.thumb.jpg" alt="${show.title}">
            <div class="tvshow-year">(${show.showYearRange})</div>
            <div class="tvshow-details">
                <h3>${show.title}</h3>
                <p>Seasons: ${show.seasonCount} (${show.showTotalEpisode} Episodes)</p>
                <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
                <p>${resolutions.join(', ')}</p>
                <p>Codec: ${videoCodecs.join(', ')}</p>
                <p>${containers.join(', ')}</p>
                <p>(${show.showSizeHuman})</p>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

document.addEventListener('refDataLoaded', (event) => {
    populateTVShowsContent(event.detail);
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail.metadata;
    const totalShows = document.querySelector("#tvshows-total");
    const totalSeasons = document.querySelector("#tvshows-seasons");
    const totalEpisodes = document.querySelector("#tvshows-episodes");
    const totalSize = document.querySelector("#tvshows-size");
    if (totalShows && totalSeasons && totalEpisodes && totalSize) {
        const formatNumber = (number) => number.toLocaleString('en-US');
        totalShows.textContent = formatNumber(data.totalShow);
        totalSeasons.textContent = formatNumber(data.totalSeasonCount);
        totalEpisodes.textContent = formatNumber(data.TotalEpisode);
        totalSize.textContent = data.totalSizeHuman;
        document.querySelectorAll('.tvshows-card .staggered div').forEach((detail) => {
            detail.classList.add('data-loaded');
        });
    }
});

document.addEventListener("refDataLoaded", () => {
    const searchInput = document.getElementById("tvshow-search");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const tvshowCards = document.querySelectorAll(".tvshow-card");

        tvshowCards.forEach((card) => {
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
    const tvshowsContent = document.getElementById('tvshows-content');
    if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        return mainContent;
    } else if (tvshowsContent && tvshowsContent.scrollHeight > tvshowsContent.clientHeight) {
        return tvshowsContent;
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
