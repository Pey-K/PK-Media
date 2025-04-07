function populateTVShowsContent(data, attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('tvshows-content');
    if (!container) {
        if (attempts < maxAttempts) {
            setTimeout(() => populateTVShowsContent(data, attempts + 1, maxAttempts), 100);
        }
        return;
    }

    const shows = data.shows;
    const grid = document.createElement('div');
    grid.classList.add('tvshow-grid');

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                const show = JSON.parse(placeholder.dataset.show);

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
                        <p>Seasons: ${show.seasonCount}</p>
                        <p>(${show.showTotalEpisode} Episodes)</p>
                        <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
                        <p>${resolutions.join(', ')}</p>
                        <p>${videoCodecs.join(', ')}</p>
                        <p>${containers.join(', ')}</p>
                        <p>(${show.showSizeHuman})</p>
                    </div>
                `;

                card.dataset.show = JSON.stringify(show);
                card.addEventListener('click', () => openSeasonView(show));
                placeholder.replaceWith(card);
                observer.unobserve(placeholder);
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0
    });

    shows.forEach(show => {
        const placeholder = document.createElement('div');
        placeholder.classList.add('tvshow-card-placeholder');
        placeholder.style.height = '217.5px';
        placeholder.dataset.show = JSON.stringify(show);
        grid.appendChild(placeholder);
        observer.observe(placeholder);
    });

    container.appendChild(grid);
}

function openSeasonView(show) {
    const overlay = document.createElement('div');
    overlay.classList.add('season-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('season-overlay-content');

    const showCard = document.createElement('div');
    showCard.classList.add('tvshow-card', 'overlay-show-card');
    showCard.innerHTML = `
        <img loading="lazy" src="assets/images/tv_image/${show.ratingKey}.thumb.jpg" alt="${show.title}">
        <div class="tvshow-year">(${show.showYearRange})</div>
        <div class="tvshow-details">
            <h3>${show.title}</h3>
            <p>Seasons: ${show.seasonCount}</p>
            <p>(${show.showTotalEpisode} Episodes)</p>
            <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
        </div>
    `;

    const seasonsGrid = document.createElement('div');
    seasonsGrid.classList.add('seasons-grid');

    // Create placeholders for season cards
    const seasonObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                const season = JSON.parse(placeholder.dataset.season);

                const seasonCard = document.createElement('div');
                seasonCard.classList.add('season-card');

                const img = document.createElement('img');
                img.src = `assets/images/tv_image/${season.seasonRatingKey}.thumb.jpg`;
                img.alt = `Season ${season.seasonNumber}`;
                img.onerror = function() {
                    this.src = 'assets/images/placeholder.jpg';
                };

                const seasonYear = document.createElement('div');
                seasonYear.classList.add('season-year');
                seasonYear.textContent = `(${season.yearRange})`;

                const seasonDetails = document.createElement('div');
                seasonDetails.classList.add('season-details');

                const seasonTitle = document.createElement('h4');
                seasonTitle.textContent = `Season ${season.seasonNumber}`;

                const episodes = document.createElement('p');
                episodes.textContent = `Episodes: ${season.seasonTotalEpisode}`;

                const size = document.createElement('p');
                size.textContent = `(${season.seasonSizeHuman})`;

                const resolution = document.createElement('p');
                resolution.textContent = season.avgSeasonVideoResolution;

                const codec = document.createElement('p');
                codec.textContent = season.avgSeasonVideoCodec;

                const container = document.createElement('p');
                container.textContent = `.${season.avgSeasonContainer}`;

                seasonDetails.appendChild(seasonTitle);
                seasonDetails.appendChild(episodes);
                seasonDetails.appendChild(size);
                seasonDetails.appendChild(resolution);
                seasonDetails.appendChild(codec);
                seasonDetails.appendChild(container);

                seasonCard.appendChild(img);
                seasonCard.appendChild(seasonYear);
                seasonCard.appendChild(seasonDetails);

                placeholder.replaceWith(seasonCard);
                observer.unobserve(placeholder);

                // Force a reflow to ensure rendering on iOS
                seasonCard.offsetHeight;
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0
    });

    show.seasons.forEach(season => {
        const placeholder = document.createElement('div');
        placeholder.classList.add('season-card-placeholder');
        placeholder.style.width = '145px';
        placeholder.style.height = '217.5px';
        placeholder.style.background = '#333';
        placeholder.dataset.season = JSON.stringify(season);
        seasonsGrid.appendChild(placeholder);
        seasonObserver.observe(placeholder);
    });

    overlayContent.appendChild(showCard);
    overlayContent.appendChild(seasonsGrid);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    // Force a reflow on the entire grid
    seasonsGrid.offsetHeight;

    overlay.addEventListener('click', (event) => {
        if (!event.target.closest('.tvshow-card') && !event.target.closest('.season-card')) {
            closeSeasonView(overlay);
        }
    });

    document.body.style.overflow = 'hidden';
}

function closeSeasonView(overlay) {
    overlay.remove();
    document.body.style.overflow = 'auto';
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

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            const tvshowCards = document.querySelectorAll(".tvshow-card");

            tvshowCards.forEach((card) => {
                const titleElement = card.querySelector("h3");
                if (!titleElement) return;

                const title = titleElement.textContent.toLowerCase();
                card.style.display = title.includes(query) ? "block" : "none";
            });
        }, 300);
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