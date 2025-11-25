import { parseSize, initializeScrollToTop, initializeInfoIcons } from './utils.js';

let allMovies = [];
let currentObserver = null;
let currentFilter = 'title';
let isAscending = true;
let moviesData = null;

async function loadMoviesData() {
    try {
        const response = await fetch('/data/movies_ref.json');
        if (!response.ok) throw new Error('Failed to load movies data');
        moviesData = await response.json();
        window.moviesData = moviesData;
        
        // Update totals
        const totalMovies = document.getElementById("movies-total");
        const totalSize = document.getElementById("movies-size");
        if (totalMovies && totalSize) {
            const formatNumber = (number) => number.toLocaleString('en-US');
            totalMovies.textContent = formatNumber(moviesData.metadata.totalMovies);
            totalSize.textContent = moviesData.metadata.totalSizeHuman;
            totalMovies.classList.add("data-loaded");
            totalSize.classList.add("data-loaded");
        }
        
        populateMoviesContent(moviesData);
        initializeFilterAndSort();
    } catch (error) {
        console.error('Error loading movies data:', error);
    }
}

function populateMoviesContent(data, searchQuery = '', attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('movies-content');
    if (!container) {
        if (attempts < maxAttempts) {
            setTimeout(() => populateMoviesContent(data, searchQuery, attempts + 1, maxAttempts), 100);
        }
        return;
    }

    if (!allMovies.length) {
        allMovies = data.movies;
    }

    const query = searchQuery.toLowerCase();
    let filteredMovies = query
        ? allMovies.filter(movie => movie.title.toLowerCase().includes(query))
        : allMovies;

    filteredMovies = filteredMovies.slice().sort((a, b) => {
        let comparison = 0;
        if (currentFilter === 'title') {
            comparison = a.title.localeCompare(b.title);
        } else if (currentFilter === 'size') {
            const sizeA = parseSize(a.sizeHuman);
            const sizeB = parseSize(b.sizeHuman);
            comparison = sizeA - sizeB;
        } else if (currentFilter === 'date') {
            comparison = (a.year || 0) - (b.year || 0);
        }
        return isAscending ? comparison : -comparison;
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.classList.add('movie-grid');
    container.appendChild(grid);

    if (currentObserver) {
        currentObserver.disconnect();
    }

    currentObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                const movie = JSON.parse(placeholder.dataset.movie);

                const card = document.createElement('div');
                card.classList.add('movie-card', 'loading');
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = `/assets/images/movie_image/${movie.ratingKey}.thumb.webp`;
                img.alt = movie.title;
                
                img.addEventListener('load', () => {
                    card.classList.remove('loading');
                });
                
                img.addEventListener('error', () => {
                    card.classList.remove('loading');
                });
                
                const detailsHTML = `
                    <div class="movie-year">${movie.year}</div>
                    <div class="movie-details">
                        <h3>${movie.title}</h3>
                        <div class="staggered">
                            <div class="detail-item">
                                <span class="detail-label">Rated</span>
                                <span class="detail-value">${movie.contentRating}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Runtime</span>
                                <span class="detail-value">${movie.durationHuman}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Codec</span>
                                <span class="detail-value">${movie.videoCodec}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Audio</span>
                                <span class="detail-value">${movie.audioCodec}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">File Type</span>
                                <span class="detail-value">${movie.container}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-value">${movie.videoResolution}</span>
                            </div>
                            <div class="detail-item size-item">
                                <span class="detail-value">${movie.sizeHuman}</span>
                            </div>
                        </div>
                    </div>
                `;
                card.innerHTML = detailsHTML;
                
                const title = card.querySelector('.movie-details h3');
                const staggered = card.querySelector('.movie-details .staggered');
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
                
                const detailItems = card.querySelectorAll('.movie-details .staggered .detail-item');
                detailItems.forEach((item, index) => {
                    item.style.setProperty('--detail-index', index + 1);
                });
                card.insertBefore(img, card.firstChild);

                placeholder.replaceWith(card);
                observer.unobserve(placeholder);
            }
        });
    }, {
        root: null,
        rootMargin: '200px',
        threshold: 0
    });

    filteredMovies.forEach(movie => {
        const placeholder = document.createElement('div');
        placeholder.classList.add('movie-card-placeholder');
        placeholder.style.height = '262.5px';
        placeholder.dataset.movie = JSON.stringify(movie);
        grid.appendChild(placeholder);
        currentObserver.observe(placeholder);
    });
}

function initializeFilterAndSort() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) {
        setTimeout(initializeFilterAndSort, 100);
        return;
    }

    const searchInput = document.getElementById('movie-search');
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
            
            if (moviesData) populateMoviesContent(moviesData, searchInput.value);
        });
    });

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            if (moviesData) populateMoviesContent(moviesData, query);
        }, 300);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const moviesCard = document.querySelector(".movies-card");
    if (moviesCard) {
        moviesCard.addEventListener("click", (event) => {
            event.preventDefault();
        });
    }
    
    initializeFilterAndSort();
    initializeScrollToTop();
    initializeInfoIcons();
    loadMoviesData();
});

