import { parseSize, parseYearRange, formatYearRange, initializeScrollToTop, initializeInfoIcons } from './utils.js';

let allShows = [];
let currentObserver = null;
let currentFilter = 'title';
let isAscending = true;
let tvshowsData = null;

function formatResolution(resolution) {
    // If it's a simple term like "sd" or "hd", capitalize it
    const lowerRes = resolution.toLowerCase();
    if (lowerRes === 'sd' || lowerRes === 'hd') {
        return resolution.toUpperCase();
    }
    // For formats like "1080p", "480i", etc., keep the number and letter case as is
    // (p/i should already be lowercase, but ensure it)
    return resolution.replace(/(\d+)([pi])/gi, (match, num, letter) => {
        return num + letter.toLowerCase();
    });
}

async function loadTVShowsData() {
    try {
        const response = await fetch('/data/tvshows_ref.json');
        if (!response.ok) throw new Error('Failed to load TV shows data');
        tvshowsData = await response.json();
        window.tvshowsData = tvshowsData;
        
        const totalShows = document.querySelector("#tvshows-total");
        const totalSeasons = document.querySelector("#tvshows-seasons");
        const totalEpisodes = document.querySelector("#tvshows-episodes");
        const totalSize = document.querySelector("#tvshows-size");
        if (totalShows && totalSeasons && totalEpisodes && totalSize) {
            const formatNumber = (number) => number.toLocaleString('en-US');
            totalShows.textContent = formatNumber(tvshowsData.metadata.totalShow);
            totalSeasons.textContent = formatNumber(tvshowsData.metadata.totalSeasonCount);
            totalEpisodes.textContent = formatNumber(tvshowsData.metadata.TotalEpisode);
            totalSize.textContent = tvshowsData.metadata.totalSizeHuman;
            document.querySelectorAll('.tvshows-card .staggered div').forEach((detail) => {
                detail.classList.add('data-loaded');
            });
        }
        
        populateTVShowsContent(tvshowsData);
        initializeFilterAndSort();
    } catch (error) {
        console.error('Error loading TV shows data:', error);
    }
}

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
            const resolutions = show.avgVideoResolutions.split(',').map(r => formatResolution(r.trim()));
            const videoCodecs = show.avgVideoCodecs.split(',').map(c => c.trim());
            const containers = show.avgContainers.split(',').map(c => '.' + c.trim());

            const card = document.createElement('div');
            card.classList.add('tvshow-card');
            const detailsHTML = `
                <div class="tvshow-year">${formatYearRange(show.showYearRange)}</div>
                <div class="tvshow-details">
                    <h3>${show.title}</h3>
                    <div class="staggered">
                        ${show.contentRating ? `
                        <div class="detail-item" style="--detail-index: 1">
                            <span class="detail-label">Rated</span>
                            <span class="detail-value">${show.contentRating}</span>
                        </div>` : ''}
                        <div class="detail-item" style="--detail-index: ${show.contentRating ? 2 : 1}">
                            <span class="detail-label">Seasons</span>
                            <span class="detail-value">${show.seasonCount}</span>
                        </div>
                        <div class="detail-item" style="--detail-index: ${show.contentRating ? 3 : 2}">
                            <span class="detail-label">Episodes</span>
                            <span class="detail-value">${show.showTotalEpisode}</span>
                        </div>
                        <div class="detail-item" style="--detail-index: ${show.contentRating ? 4 : 3}">
                            <span class="detail-label">Runtime</span>
                            <span class="detail-value">${show.avgEpisodeDuration}</span>
                        </div>
                        <div class="detail-item" style="--detail-index: ${show.contentRating ? 5 : 4}">
                            <span class="detail-value">${resolutions.join(', ')}</span>
                        </div>
                        <div class="detail-item size-item" style="--detail-index: ${show.contentRating ? 6 : 5}">
                            <span class="detail-value">${show.showSizeHuman}</span>
                        </div>
                    </div>
                </div>
            `;
            card.innerHTML = `<img loading="lazy" src="/assets/images/tv_image/${show.ratingKey}.thumb.webp" alt="${show.title}">${detailsHTML}`;
            
            const title = card.querySelector('.tvshow-details h3');
            const staggered = card.querySelector('.tvshow-details .staggered');
            if (title && staggered) {
                const calculateTitleWidth = () => {
                    const tempSpan = document.createElement('span');
                    tempSpan.textContent = title.textContent;
                    tempSpan.style.visibility = 'hidden';
                    tempSpan.style.position = 'absolute';
                    tempSpan.style.whiteSpace = 'nowrap';
                    const titleStyles = window.getComputedStyle(title);
                    tempSpan.style.fontSize = titleStyles.fontSize;
                    tempSpan.style.fontWeight = titleStyles.fontWeight;
                    tempSpan.style.fontFamily = titleStyles.fontFamily;
                    tempSpan.style.letterSpacing = titleStyles.letterSpacing;
                    document.body.appendChild(tempSpan);
                    const textWidth = tempSpan.offsetWidth;
                    document.body.removeChild(tempSpan);
                    staggered.style.setProperty('--separator-width', `${textWidth}px`);
                };
                if (document.fonts && document.fonts.ready) {
                    document.fonts.ready.then(() => {
                        setTimeout(calculateTitleWidth, 50);
                    });
                } else {
                    setTimeout(calculateTitleWidth, 100);
                }
                window.addEventListener('resize', calculateTitleWidth);
            }

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

                    const resolutions = show.avgVideoResolutions.split(',').map(r => formatResolution(r.trim()));
                    const videoCodecs = show.avgVideoCodecs.split(',').map(c => c.trim());
                    const containers = show.avgContainers.split(',').map(c => '.' + c.trim());

                    const card = document.createElement('div');
                    card.classList.add('tvshow-card', 'loading');
                    const img = document.createElement('img');
                    img.loading = 'lazy';
                    img.src = `/assets/images/tv_image/${show.ratingKey}.thumb.webp`;
                    img.alt = show.title;
                    
                    img.addEventListener('load', () => {
                        card.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        card.classList.remove('loading');
                    });
                    
                    const detailsHTML = `
                        <div class="tvshow-year">${formatYearRange(show.showYearRange)}</div>
                        <div class="tvshow-details">
                            <h3>${show.title}</h3>
                            <div class="staggered">
                                ${show.contentRating ? `
                                <div class="detail-item" style="--detail-index: 1">
                                    <span class="detail-label">Rated</span>
                                    <span class="detail-value">${show.contentRating}</span>
                                </div>` : ''}
                                <div class="detail-item" style="--detail-index: ${show.contentRating ? 2 : 1}">
                                    <span class="detail-label">Seasons</span>
                                    <span class="detail-value">${show.seasonCount}</span>
                                </div>
                                <div class="detail-item" style="--detail-index: ${show.contentRating ? 3 : 2}">
                                    <span class="detail-label">Episodes</span>
                                    <span class="detail-value">${show.showTotalEpisode}</span>
                                </div>
                                <div class="detail-item" style="--detail-index: ${show.contentRating ? 4 : 3}">
                                    <span class="detail-label">Runtime</span>
                                    <span class="detail-value">${show.avgEpisodeDuration}</span>
                                </div>
                                <div class="detail-item" style="--detail-index: ${show.contentRating ? 5 : 4}">
                                    <span class="detail-value">${resolutions.join(', ')}</span>
                                </div>
                                <div class="detail-item size-item" style="--detail-index: ${show.contentRating ? 6 : 5}">
                                    <span class="detail-value">${show.showSizeHuman}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    card.innerHTML = detailsHTML;
                    card.insertBefore(img, card.firstChild);
                    
                    const title = card.querySelector('.tvshow-details h3');
                    const staggered = card.querySelector('.tvshow-details .staggered');
                    if (title && staggered) {
                        const calculateTitleWidth = () => {
                            const tempSpan = document.createElement('span');
                            tempSpan.textContent = title.textContent;
                            tempSpan.style.visibility = 'hidden';
                            tempSpan.style.position = 'absolute';
                            tempSpan.style.whiteSpace = 'nowrap';
                            const titleStyles = window.getComputedStyle(title);
                            tempSpan.style.fontSize = titleStyles.fontSize;
                            tempSpan.style.fontWeight = titleStyles.fontWeight;
                            tempSpan.style.fontFamily = titleStyles.fontFamily;
                            tempSpan.style.letterSpacing = titleStyles.letterSpacing;
                            document.body.appendChild(tempSpan);
                            const textWidth = tempSpan.offsetWidth;
                            document.body.removeChild(tempSpan);
                            staggered.style.setProperty('--separator-width', `${textWidth}px`);
                        };
                        if (document.fonts && document.fonts.ready) {
                            document.fonts.ready.then(() => {
                                setTimeout(calculateTitleWidth, 50);
                            });
                        } else {
                            setTimeout(calculateTitleWidth, 100);
                        }
                        window.addEventListener('resize', calculateTitleWidth);
                    }

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

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'filter-sort-controls';
    
    const filters = [
        { name: 'Title', value: 'title' },
        { name: 'Size', value: 'size' },
        { name: 'Date', value: 'date' }
    ];

    filters.forEach(filter => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-sort-btn';
        filterBtn.dataset.filter = filter.value;
        
        const btnContent = document.createElement('div');
        btnContent.className = 'btn-content';
        
        const btnText = document.createElement('span');
        btnText.className = 'btn-text';
        btnText.textContent = filter.name;
        
        const btnArrow = document.createElement('span');
        btnArrow.className = 'btn-arrow';
        if (filter.value === currentFilter) {
            filterBtn.classList.add('active');
            if (filter.value === 'title') {
                btnArrow.textContent = isAscending ? 'A→Z' : 'Z→A';
            } else if (filter.value === 'size') {
                btnArrow.textContent = isAscending ? 'S→L' : 'L→S';
            } else if (filter.value === 'date') {
                btnArrow.textContent = isAscending ? 'O→N' : 'N→O';
            }
        }
        
        btnContent.appendChild(btnText);
        btnContent.appendChild(btnArrow);
        filterBtn.appendChild(btnContent);
        controlsContainer.appendChild(filterBtn);
    });
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';
    buttonsContainer.appendChild(controlsContainer);

    searchInputContainer.appendChild(searchInput);
    searchRow.appendChild(searchInputContainer);
    searchRow.appendChild(buttonsContainer);

    const existingSearchRow = searchContainer.querySelector('.search-row');
    if (existingSearchRow) {
        existingSearchRow.replaceWith(searchRow);
    } else {
        searchContainer.appendChild(searchRow);
    }

    const filterSortButtons = document.querySelectorAll('.filter-sort-btn');
    filterSortButtons.forEach(button => {
        button.addEventListener('click', () => {
            const clickedFilter = button.dataset.filter;
            
            if (currentFilter === clickedFilter) {
                isAscending = !isAscending;
            } else {
                currentFilter = clickedFilter;
                isAscending = true;
            }
            
            filterSortButtons.forEach(btn => {
                const arrow = btn.querySelector('.btn-arrow');
                if (btn.dataset.filter === currentFilter) {
                    btn.classList.add('active');
                    if (arrow) {
                        if (currentFilter === 'title') {
                            arrow.textContent = isAscending ? 'A→Z' : 'Z→A';
                        } else if (currentFilter === 'size') {
                            arrow.textContent = isAscending ? 'S→L' : 'L→S';
                        } else if (currentFilter === 'date') {
                            arrow.textContent = isAscending ? 'O→N' : 'N→O';
                        }
                    }
                } else {
                    btn.classList.remove('active');
                    if (arrow) {
                        arrow.textContent = '';
                    }
                }
            });
            
            if (tvshowsData) populateTVShowsContent(tvshowsData, searchInput.value);
        });
    });

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            if (tvshowsData) populateTVShowsContent(tvshowsData, query);
        }, 300);
    });
}

function openSeasonView(show) {
    const overlay = document.createElement('div');
    overlay.classList.add('season-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('season-overlay-content');

    const resolutions = show.avgVideoResolutions.split(',').map(r => formatResolution(r.trim()));
    const showCard = document.createElement('div');
    showCard.classList.add('tvshow-card', 'overlay-show-card');
    const detailsHTML = `
        <div class="tvshow-year">${formatYearRange(show.showYearRange)}</div>
        <div class="tvshow-details">
            <h3>${show.title}</h3>
            <div class="staggered">
                ${show.contentRating ? `
                <div class="detail-item" style="--detail-index: 1">
                    <span class="detail-label">Rated</span>
                    <span class="detail-value">${show.contentRating}</span>
                </div>` : ''}
                <div class="detail-item" style="--detail-index: ${show.contentRating ? 2 : 1}">
                    <span class="detail-label">Seasons</span>
                    <span class="detail-value">${show.seasonCount}</span>
                </div>
                <div class="detail-item" style="--detail-index: ${show.contentRating ? 3 : 2}">
                    <span class="detail-label">Episodes</span>
                    <span class="detail-value">${show.showTotalEpisode}</span>
                </div>
                <div class="detail-item" style="--detail-index: ${show.contentRating ? 4 : 3}">
                    <span class="detail-label">Runtime</span>
                    <span class="detail-value">${show.avgEpisodeDuration}</span>
                </div>
                <div class="detail-item" style="--detail-index: ${show.contentRating ? 5 : 4}">
                    <span class="detail-value">${resolutions.join(', ')}</span>
                </div>
                <div class="detail-item size-item" style="--detail-index: ${show.contentRating ? 6 : 5}">
                    <span class="detail-value">${show.showSizeHuman}</span>
                </div>
            </div>
        </div>
    `;
    showCard.innerHTML = `<img loading="lazy" src="/assets/images/tv_image/${show.ratingKey}.thumb.webp" alt="${show.title}">${detailsHTML}`;
    
    // Calculate title width for separator bar
    const title = showCard.querySelector('.tvshow-details h3');
    const staggered = showCard.querySelector('.tvshow-details .staggered');
    if (title && staggered) {
        const calculateTitleWidth = () => {
            const tempSpan = document.createElement('span');
            tempSpan.textContent = title.textContent;
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            const titleStyles = window.getComputedStyle(title);
            tempSpan.style.fontSize = titleStyles.fontSize;
            tempSpan.style.fontWeight = titleStyles.fontWeight;
            tempSpan.style.fontFamily = titleStyles.fontFamily;
            tempSpan.style.letterSpacing = titleStyles.letterSpacing;
            document.body.appendChild(tempSpan);
            const textWidth = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);
            staggered.style.setProperty('--separator-width', `${textWidth}px`);
        };
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                setTimeout(calculateTitleWidth, 50);
            });
        } else {
            setTimeout(calculateTitleWidth, 100);
        }
        window.addEventListener('resize', calculateTitleWidth);
    }

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
                img.src = `/assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
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
                    seasonCard.classList.add('season-card', 'loading');

                    const img = document.createElement('img');
                    const displayTitle = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;
                    img.src = `/assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
                    img.alt = displayTitle;
                    
                    img.addEventListener('load', () => {
                        seasonCard.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        seasonCard.classList.remove('loading');
                        img.src = '/assets/images/placeholder.webp';
                    });

                    const seasonYear = document.createElement('div');
                    seasonYear.classList.add('season-year');
                    seasonYear.textContent = formatYearRange(season.yearRange);

                    const seasonDetails = document.createElement('div');
                    seasonDetails.classList.add('season-details');

                    const detailIndexOffset = season.avgSeasonEpisodeDuration ? 0 : -1;
                    
                    const detailsHTML = `
                        <h4>${displayTitle}</h4>
                        <div class="staggered">
                            <div class="detail-item" style="--detail-index: ${1 + detailIndexOffset}">
                                <span class="detail-label">Episodes</span>
                                <span class="detail-value">${season.seasonTotalEpisode}</span>
                            </div>
                            ${season.avgSeasonEpisodeDuration ? `
                            <div class="detail-item" style="--detail-index: 2">
                                <span class="detail-label">Runtime</span>
                                <span class="detail-value">${season.avgSeasonEpisodeDuration}</span>
                            </div>` : ''}
                            <div class="detail-item" style="--detail-index: ${3 + detailIndexOffset}">
                                <span class="detail-label">Codec</span>
                                <span class="detail-value">${season.avgSeasonVideoCodec}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: ${4 + detailIndexOffset}">
                                <span class="detail-label">File Type</span>
                                <span class="detail-value">.${season.avgSeasonContainer}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: ${5 + detailIndexOffset}">
                                <span class="detail-value">${formatResolution(season.avgSeasonVideoResolution)}</span>
                            </div>
                            <div class="detail-item size-item" style="--detail-index: ${6 + detailIndexOffset}">
                                <span class="detail-value">${season.seasonSizeHuman}</span>
                            </div>
                        </div>
                    `;
                    seasonDetails.innerHTML = detailsHTML;
                    
                    // Calculate title width for separator bar
                    const title = seasonDetails.querySelector('h4');
                    const staggered = seasonDetails.querySelector('.staggered');
                    if (title && staggered) {
                        const calculateTitleWidth = () => {
                            const tempSpan = document.createElement('span');
                            tempSpan.textContent = title.textContent;
                            tempSpan.style.visibility = 'hidden';
                            tempSpan.style.position = 'absolute';
                            tempSpan.style.whiteSpace = 'nowrap';
                            const titleStyles = window.getComputedStyle(title);
                            tempSpan.style.fontSize = titleStyles.fontSize;
                            tempSpan.style.fontWeight = titleStyles.fontWeight;
                            tempSpan.style.fontFamily = titleStyles.fontFamily;
                            tempSpan.style.letterSpacing = titleStyles.letterSpacing;
                            document.body.appendChild(tempSpan);
                            const textWidth = tempSpan.offsetWidth;
                            document.body.removeChild(tempSpan);
                            staggered.style.setProperty('--separator-width', `${textWidth}px`);
                        };
                        if (document.fonts && document.fonts.ready) {
                            document.fonts.ready.then(() => {
                                setTimeout(calculateTitleWidth, 50);
                            });
                        } else {
                            setTimeout(calculateTitleWidth, 100);
                        }
                        window.addEventListener('resize', calculateTitleWidth);
                    }

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
                    seasonCard.classList.add('season-card', 'loading');

                    const img = document.createElement('img');
                    const displayTitle = String(season.seasonNumber) === '0' || Number(season.seasonNumber) === 0 ? 'Specials' : `Season ${season.seasonNumber}`;
                    img.src = `/assets/images/tv_image/${season.seasonRatingKey}.thumb.webp`;
                    img.alt = displayTitle;
                    
                    img.addEventListener('load', () => {
                        seasonCard.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        seasonCard.classList.remove('loading');
                        img.src = '/assets/images/placeholder.webp';
                    });

                    const seasonYear = document.createElement('div');
                    seasonYear.classList.add('season-year');
                    seasonYear.textContent = formatYearRange(season.yearRange);

                    const seasonDetails = document.createElement('div');
                    seasonDetails.classList.add('season-details');

                    const detailIndexOffset = season.avgSeasonEpisodeDuration ? 0 : -1;
                    
                    const detailsHTML = `
                        <h4>${displayTitle}</h4>
                        <div class="staggered">
                            <div class="detail-item" style="--detail-index: ${1 + detailIndexOffset}">
                                <span class="detail-label">Episodes</span>
                                <span class="detail-value">${season.seasonTotalEpisode}</span>
                            </div>
                            ${season.avgSeasonEpisodeDuration ? `
                            <div class="detail-item" style="--detail-index: 2">
                                <span class="detail-label">Runtime</span>
                                <span class="detail-value">${season.avgSeasonEpisodeDuration}</span>
                            </div>` : ''}
                            <div class="detail-item" style="--detail-index: ${3 + detailIndexOffset}">
                                <span class="detail-label">Codec</span>
                                <span class="detail-value">${season.avgSeasonVideoCodec}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: ${4 + detailIndexOffset}">
                                <span class="detail-label">File Type</span>
                                <span class="detail-value">.${season.avgSeasonContainer}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: ${5 + detailIndexOffset}">
                                <span class="detail-value">${formatResolution(season.avgSeasonVideoResolution)}</span>
                            </div>
                            <div class="detail-item size-item" style="--detail-index: ${6 + detailIndexOffset}">
                                <span class="detail-value">${season.seasonSizeHuman}</span>
                            </div>
                        </div>
                    `;
                    seasonDetails.innerHTML = detailsHTML;
                    
                    // Calculate title width for separator bar
                    const title = seasonDetails.querySelector('h4');
                    const staggered = seasonDetails.querySelector('.staggered');
                    if (title && staggered) {
                        const calculateTitleWidth = () => {
                            const tempSpan = document.createElement('span');
                            tempSpan.textContent = title.textContent;
                            tempSpan.style.visibility = 'hidden';
                            tempSpan.style.position = 'absolute';
                            tempSpan.style.whiteSpace = 'nowrap';
                            const titleStyles = window.getComputedStyle(title);
                            tempSpan.style.fontSize = titleStyles.fontSize;
                            tempSpan.style.fontWeight = titleStyles.fontWeight;
                            tempSpan.style.fontFamily = titleStyles.fontFamily;
                            tempSpan.style.letterSpacing = titleStyles.letterSpacing;
                            document.body.appendChild(tempSpan);
                            const textWidth = tempSpan.offsetWidth;
                            document.body.removeChild(tempSpan);
                            staggered.style.setProperty('--separator-width', `${textWidth}px`);
                        };
                        if (document.fonts && document.fonts.ready) {
                            document.fonts.ready.then(() => {
                                setTimeout(calculateTitleWidth, 50);
                            });
                        } else {
                            setTimeout(calculateTitleWidth, 100);
                        }
                        window.addEventListener('resize', calculateTitleWidth);
                    }

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

document.addEventListener('DOMContentLoaded', () => {
    const tvshowsCard = document.querySelector(".tvshows-card");
    if (tvshowsCard) {
        tvshowsCard.addEventListener("click", (event) => {
            event.preventDefault();
        });
    }
    
    initializeFilterAndSort();
    initializeScrollToTop();
    initializeInfoIcons();
    loadTVShowsData();
});

