let allShows = [];
let currentObserver = null;
let currentFilter = 'title';
let isAscending = true;

function populateTVShowsContent(data, searchQuery = '', attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('tvshows-content');
    if (!container) {
        if (attempts < maxAttempts) {
            setTimeout(() => populateTVShowsContent(data, searchQuery, attempts + 1, maxAttempts), 100);
        }
        return;
    }

    if (!allShows.length) {
        allShows = data.shows;
    }

    const query = searchQuery.toLowerCase();
    let filteredShows = query
        ? allShows.filter(show => show.title.toLowerCase().includes(query))
        : allShows;

    filteredShows = filteredShows.slice().sort((a, b) => {
        let comparison = 0;
        if (currentFilter === 'title') {
            comparison = a.title.localeCompare(b.title);
        } else if (currentFilter === 'size') {
            const sizeA = parseSize(a.showSizeHuman);
            const sizeB = parseSize(b.showSizeHuman);
            comparison = sizeA - sizeB;
        } else if (currentFilter === 'date') {
            const yearA = parseYearRange(a.showYearRange);
            const yearB = parseYearRange(b.showYearRange);
            comparison = yearA - yearB;
        }
        return isAscending ? comparison : -comparison;
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.classList.add('tvshow-grid');
    container.appendChild(grid);

    if (query) {
        filteredShows.forEach(show => {
            const resolutions = show.avgVideoResolutions.split(',').map(r => r.trim());
            const videoCodecs = show.avgVideoCodecs.split(',').map(c => c.trim());
            const containers = show.avgContainers.split(',').map(c => '.' + c.trim());

            const card = document.createElement('div');
            card.classList.add('tvshow-card');
            card.innerHTML = `
                <img loading="lazy" src="assets/images/tv_image/${show.ratingKey}.thumb.webp" alt="${show.title}">
                <div class="tvshow-year">(${show.showYearRange})</div>
                <div class="tvshow-details">
                    <h3>${show.title}</h3>
                    <p>Seasons: ${show.seasonCount}</p>
                    <p>(${show.showTotalEpisode} Episodes)</p>
                    <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
                    <p>${resolutions.join(', ')}</p>
                    <p>(${show.showSizeHuman})</p>
                </div>
            `;

            card.dataset.show = JSON.stringify(show);
            card.addEventListener('click', (event) => {
                event.preventDefault();
                openSeasonView(show);
            });
            grid.appendChild(card);
        });
    } else {
        if (currentObserver) {
            currentObserver.disconnect();
        }

        currentObserver = new IntersectionObserver((entries, observer) => {
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
                        <img loading="lazy" src="assets/images/tv_image/${show.ratingKey}.thumb.webp" alt="${show.title}">
                        <div class="tvshow-year">(${show.showYearRange})</div>
                        <div class="tvshow-details">
                            <h3>${show.title}</h3>
                            <p>Seasons: ${show.seasonCount}</p>
                            <p>(${show.showTotalEpisode} Episodes)</p>
                            <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
                            <p>${resolutions.join(', ')}</p>
                            <p>(${show.showSizeHuman})</p>
                        </div>
                    `;

                    card.dataset.show = JSON.stringify(show);
                    card.addEventListener('click', (event) => {
                        event.preventDefault();
                        openSeasonView(show);
                    });
                    placeholder.replaceWith(card);
                    observer.unobserve(placeholder);
                }
            });
        }, {
            root: null,
            rootMargin: '200px',
            threshold: 0
        });

        filteredShows.forEach(show => {
            const placeholder = document.createElement('div');
            placeholder.classList.add('tvshow-card-placeholder');
            placeholder.style.height = '217.5px';
            placeholder.dataset.show = JSON.stringify(show);
            grid.appendChild(placeholder);
            currentObserver.observe(placeholder);
        });
    }
}

function parseSize(sizeHuman) {
    if (!sizeHuman) return 0;
    const [value, unit] = sizeHuman.split(' ');
    const numValue = parseFloat(value) || 0;
    if (unit === 'GB') return numValue * 1024;
    if (unit === 'TB') return numValue * 1024 * 1024;
    return numValue;
}

function parseYearRange(yearRange) {
    if (!yearRange) return 0;
    const year = yearRange.match(/\d{4}/);
    return year ? parseInt(year[0]) : 0;
}

function initializeFilterAndSort() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) {
        setTimeout(initializeFilterAndSort, 100);
        return;
    }

    const searchInput = document.getElementById('tvshow-search');
    if (!searchInput) return;

    const searchRow = document.createElement('div');
    searchRow.className = 'search-row';
    searchRow.style.display = 'flex';
    searchRow.style.alignItems = 'center';
    searchRow.style.gap = '8px';
    searchRow.style.flexWrap = 'wrap';

    const searchInputContainer = document.createElement('div');
    searchInputContainer.className = 'search-input-container';
    searchInputContainer.style.display = 'flex';
    searchInputContainer.style.justifyContent = 'center';
    searchInputContainer.style.width = '100%';

    const filterButtonsDiv = document.createElement('div');
    filterButtonsDiv.className = 'filter-buttons';
    filterButtonsDiv.style.display = 'flex';
    filterButtonsDiv.style.gap = '5px';

    const filters = [
        { name: 'Title', value: 'title', icon: '📝' },
        { name: 'Size', value: 'size', icon: '💾' },
        { name: 'Date', value: 'date', icon: '📅' }
    ];

    filters.forEach(filter => {
        const btn = document.createElement('button');
        btn.dataset.filter = filter.value;
        btn.title = filter.name;
        btn.className = 'filter-btn';
        btn.style.width = '36px';
        btn.style.height = '36px';
        btn.style.display = 'flex';
        btn.style.zIndex = '1000';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = filter.value === currentFilter ? '#9c9bb9' : '#1a1a1a';
        btn.style.color = filter.value === currentFilter ? '#fff' : '#ccc';
        btn.style.fontSize = '18px';
        btn.style.transition = 'background-color 0.3s, color 0.3s';
        btn.style.borderRadius = '4px';
        btn.textContent = filter.icon;
        filterButtonsDiv.appendChild(btn);
    });

    const sortOrderContainer = document.createElement('div');
    sortOrderContainer.className = 'sort-order-container';
    sortOrderContainer.style.display = 'flex';

    const sortOrderBtn = document.createElement('button');
    sortOrderBtn.id = 'sort-order-btn';
    sortOrderBtn.className = 'sort-order-btn';
    sortOrderBtn.style.width = '36px';
    sortOrderBtn.style.height = '36px';
    sortOrderBtn.style.backgroundColor = '#9c9bb9';
    sortOrderBtn.style.border = 'none';
    sortOrderBtn.style.borderRadius = '4px';
    sortOrderBtn.style.cursor = 'pointer';
    sortOrderBtn.style.transition = 'transform 0.3s';
    updateSortButtonIcon(sortOrderBtn);
    sortOrderContainer.appendChild(sortOrderBtn);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.alignItems = 'center';
    buttonsContainer.style.gap = '8px';
    buttonsContainer.appendChild(filterButtonsDiv);
    buttonsContainer.appendChild(sortOrderContainer);

    searchInputContainer.appendChild(searchInput);
    searchRow.appendChild(searchInputContainer);
    searchRow.appendChild(buttonsContainer);

    const existingSearchRow = searchContainer.querySelector('.search-row');
    if (existingSearchRow) {
        existingSearchRow.replaceWith(searchRow);
    } else {
        searchContainer.appendChild(searchRow);
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            filterButtons.forEach(btn => {
                btn.style.backgroundColor = '#1a1a1a';
                btn.style.color = '#ccc';
            });
            button.style.backgroundColor = '#9c9bb9';
            button.style.color = '#fff';
            isAscending = true;
            updateSortButtonIcon(sortOrderBtn);
            populateTVShowsContent(window.tvshowsData, searchInput.value);
        });
    });

    sortOrderBtn.addEventListener('click', () => {
        isAscending = !isAscending;
        updateSortButtonIcon(sortOrderBtn);
        populateTVShowsContent(window.tvshowsData, searchInput.value);
    });
}

function updateSortButtonIcon(sortOrderBtn) {
    sortOrderBtn.style.transform = isAscending ? 'scaleY(1)' : 'scaleY(-1)';
    sortOrderBtn.title = isAscending ? 'Sort Ascending' : 'Sort Descending';
}

function openSeasonView(show) {
    const overlay = document.createElement('div');
    overlay.classList.add('season-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('season-overlay-content');

    const showCard = document.createElement('div');
    showCard.classList.add('tvshow-card', 'overlay-show-card');
    showCard.innerHTML = `
        <img loading="lazy" src="assets/images/tv_image/${show.ratingKey}.thumb.webp" alt="${show.title}">
        <div class="tvshow-year">(${show.showYearRange})</div>
        <div class="tvshow-details">
            <h3>${show.title}</h3>
            <p>Seasons: ${show.seasonCount}</p>
            <p>(${show.showTotalEpisode} Episodes)</p>
            <p>Avg Runtime: ${show.avgEpisodeDuration}</p>
            <p>(${show.showSizeHuman})</p>
        </div>
    `;

    const seasonsGrid = document.createElement('div');
    seasonsGrid.classList.add('seasons-grid');

    overlayContent.appendChild(showCard);
    overlayContent.appendChild(seasonsGrid);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    overlay.offsetHeight;

    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 1024;

    if (isMobileDevice) {
        const preloadImages = show.seasons.map(season => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`Failed to load image for season ${season.seasonRatingKey}, using placeholder`);
                    resolve();
                };
            });
        });

        Promise.all(preloadImages).then(() => {
            requestAnimationFrame(() => {
                show.seasons.forEach(season => {
                    const seasonCard = document.createElement('div');
                    seasonCard.classList.add('season-card');

                    const img = document.createElement('img');
                    const displayTitle = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;
                    img.src = `assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
                    img.alt = displayTitle;
                    img.onerror = function() {
                        this.src = 'assets/images/placeholder.webp';
                    };

                    const seasonYear = document.createElement('div');
                    seasonYear.classList.add('season-year');
                    seasonYear.textContent = `(${season.yearRange})`;

                    const seasonDetails = document.createElement('div');
                    seasonDetails.classList.add('season-details');

                    const seasonTitle = document.createElement('h4');
                    seasonTitle.textContent = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;

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
                    seasonDetails.appendChild(resolution);
                    seasonDetails.appendChild(codec);
                    seasonDetails.appendChild(container);
                    seasonDetails.appendChild(size);

                    seasonCard.appendChild(img);
                    seasonCard.appendChild(seasonYear);
                    seasonCard.appendChild(seasonDetails);

                    seasonsGrid.appendChild(seasonCard);
                    seasonCard.offsetHeight;
                });

                seasonsGrid.style.display = 'flex';
                overlay.scrollTop = 0;
            });
        });
    } else {
        const seasonObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const placeholder = entry.target;
                    const season = JSON.parse(placeholder.dataset.season);

                    const seasonCard = document.createElement('div');
                    seasonCard.classList.add('season-card');

                    const img = document.createElement('img');
                    const displayTitle = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;
                    img.src = `assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
                    img.alt = displayTitle;
                    img.onerror = function() {
                        this.src = 'assets/images/placeholder.webp';
                    };

                    const seasonYear = document.createElement('div');
                    seasonYear.classList.add('season-year');
                    seasonYear.textContent = `(${season.yearRange})`;

                    const seasonDetails = document.createElement('div');
                    seasonDetails.classList.add('season-details');

                    const seasonTitle = document.createElement('h4');
                    seasonTitle.textContent = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;

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
                    seasonDetails.appendChild(resolution);
                    seasonDetails.appendChild(codec);
                    seasonDetails.appendChild(container);
                    seasonDetails.appendChild(size);

                    seasonCard.appendChild(img);
                    seasonCard.appendChild(seasonYear);
                    seasonCard.appendChild(seasonDetails);

                    placeholder.replaceWith(seasonCard);
                    observer.unobserve(placeholder);

                    seasonCard.offsetHeight;
                }
            });
        }, {
            root: seasonsGrid,
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
    }

    seasonsGrid.offsetHeight;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        let touchStartTime;
        let touchStartY;
        let isScrolling = false;
        let justOpened = true;
        let isClosing = false;

        setTimeout(() => {
            justOpened = false;
        }, 500);

        overlay.addEventListener('touchstart', (event) => {
            touchStartTime = Date.now();
            touchStartY = event.touches[0].clientY;
            isScrolling = false;
        });

        overlay.addEventListener('touchmove', (event) => {
            const touchY = event.touches[0].clientY;
            if (Math.abs(touchY - touchStartY) > 10) {
                isScrolling = true;
            }
        });

        overlay.addEventListener('touchend', (event) => {
            if (justOpened || isClosing) return;
            if (isScrolling) {
                isScrolling = false;
                return;
            }
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration < 300 && !event.target.closest('.tvshow-card') && !event.target.closest('.season-card')) {
                event.stopPropagation();
                event.preventDefault();
                isClosing = true;
                closeSeasonView(overlay);
                setTimeout(() => {
                    isClosing = false;
                }, 300);
            }
        });

        overlay.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    } else {
        overlay.addEventListener('click', (event) => {
            if (!event.target.closest('.tvshow-card') && !event.target.closest('.season-card')) {
                closeSeasonView(overlay);
            }
        });
    }

    document.body.style.overflow = 'hidden';
}

function closeSeasonView(overlay) {
    overlay.remove();
    document.body.style.overflow = 'auto';
}

document.addEventListener('refDataLoaded', (event) => {
    window.tvshowsData = event.detail;
    populateTVShowsContent(event.detail);
    initializeFilterAndSort();
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

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail;
    const searchInput = document.getElementById("tvshow-search");

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            populateTVShowsContent(data, query);
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

function initializeRecommendationFeature() {
    const fab = document.getElementById('recommend-fab');
    if (!fab) {
        console.error('FAB element with id "recommend-fab" not found in the HTML.');
        return;
    }

    fab.addEventListener('click', () => {
        window.open('https://overseerr.pkcollection.net', '_blank');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    initializeRecommendationFeature();
    initializeInfoIcons();
    initializeScroll();
});

document.addEventListener('pageContentLoaded', () => {
    console.log('pageContentLoaded fired');
    initializeRecommendationFeature();
});

setTimeout(() => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('Fallback: Running initializeRecommendationFeature');
        initializeRecommendationFeature();
        initializeInfoIcons();
        initializeScroll();
    }
}, 1000);