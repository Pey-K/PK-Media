import { parseSize, parseYearRange, formatYearRange, initializeScrollToTop, initializeInfoIcons } from './utils.js';

let allArtists = [];
let currentObserver = null;
let currentFilter = 'artist';
let isAscending = true;
let musicData = null;

async function loadMusicData() {
    try {
        const response = await fetch('/assets/data/music_ref.json');
        if (!response.ok) throw new Error('Failed to load music data');
        musicData = await response.json();
        window.musicData = musicData;
        
        const totalArtists = document.querySelector("#music-artists");
        const totalAlbums = document.querySelector("#music-albums");
        const totalTracks = document.querySelector("#music-tracks");
        const totalSize = document.querySelector("#music-size");
        if (totalArtists && totalAlbums && totalTracks && totalSize) {
            const formatNumber = (number) => number.toLocaleString('en-US');
            totalArtists.textContent = formatNumber(musicData.metadata.totalArtists);
            totalAlbums.textContent = formatNumber(musicData.metadata.totalAlbums);
            totalTracks.textContent = formatNumber(musicData.metadata.totalTracks);
            totalSize.textContent = musicData.metadata.totalSizeHuman;
            document.querySelectorAll('.music-card .staggered div').forEach((detail) => {
                detail.classList.add('data-loaded');
            });
        }
        
        populateMusicContent(musicData);
        initializeFilterAndSort();
    } catch (error) {
        console.error('Error loading music data:', error);
    }
}

function populateMusicContent(data, searchQuery = '', attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('music-content');
    if (!container) {
        if (attempts < maxAttempts) {
            setTimeout(() => populateMusicContent(data, searchQuery, attempts + 1, maxAttempts), 100);
        }
        return;
    }

    if (!allArtists.length) {
        allArtists = data.artists;
    }

    const query = searchQuery.toLowerCase();
    let filteredArtists = query
        ? allArtists.filter(artist => artist.artistName.toLowerCase().includes(query))
        : allArtists;

    filteredArtists = filteredArtists.slice().sort((a, b) => {
        let comparison = 0;
        if (currentFilter === 'artist') {
            comparison = a.artistName.localeCompare(b.artistName);
        } else if (currentFilter === 'size') {
            const sizeA = parseSize(a.totalSizeHuman);
            const sizeB = parseSize(b.totalSizeHuman);
            comparison = sizeA - sizeB;
        } else if (currentFilter === 'date') {
            const yearA = parseYearRange(a.yearRange);
            const yearB = parseYearRange(b.yearRange);
            comparison = yearA - yearB;
        }
        return isAscending ? comparison : -comparison;
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.classList.add('music-grid');
    container.appendChild(grid);

    if (query) {
        filteredArtists.forEach(artist => {
            const card = document.createElement('div');
            card.classList.add('music-card');
            const detailsHTML = `
                <div class="music-year">${formatYearRange(artist.yearRange)}</div>
                <div class="music-details">
                    <h3>${artist.artistName}</h3>
                    <div class="staggered">
                        <div class="detail-item" style="--detail-index: 1">
                            <span class="detail-label">Albums</span>
                            <span class="detail-value">${artist.totalAlbums}</span>
                        </div>
                        <div class="detail-item" style="--detail-index: 2">
                            <span class="detail-label">Tracks</span>
                            <span class="detail-value">${artist.totalTracks}</span>
                        </div>
                        <div class="detail-item size-item" style="--detail-index: 3">
                            <span class="detail-value">${artist.totalSizeHuman}</span>
                        </div>
                    </div>
                </div>
            `;
            card.innerHTML = `<img loading="lazy" src="/assets/images/music_image/${artist.ratingKey}.thumb.webp" alt="${artist.artistName}">${detailsHTML}`;
            
            const title = card.querySelector('.music-details h3');
            const staggered = card.querySelector('.music-details .staggered');
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

            card.dataset.artist = JSON.stringify(artist);
            card.addEventListener('click', (event) => {
                event.preventDefault();
                openAlbumView(artist);
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
                    const artist = JSON.parse(placeholder.dataset.artist);

                    const card = document.createElement('div');
                    card.classList.add('music-card', 'loading');
                    const img = document.createElement('img');
                    img.loading = 'lazy';
                    img.src = `/assets/images/music_image/${artist.ratingKey}.thumb.webp`;
                    img.alt = artist.artistName;
                    
                    img.addEventListener('load', () => {
                        card.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        card.classList.remove('loading');
                        // If image fails, hide it and add a gradient placeholder background
                        img.style.display = 'none';
                        card.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        card.style.backgroundSize = 'cover';
                        card.style.backgroundPosition = 'center';
                    });
                    
                    const detailsHTML = `
                        <div class="music-year">${formatYearRange(artist.yearRange)}</div>
                        <div class="music-details">
                            <h3>${artist.artistName}</h3>
                            <div class="staggered">
                                <div class="detail-item" style="--detail-index: 1">
                                    <span class="detail-label">Albums</span>
                                    <span class="detail-value">${artist.totalAlbums}</span>
                                </div>
                                <div class="detail-item" style="--detail-index: 2">
                                    <span class="detail-label">Tracks</span>
                                    <span class="detail-value">${artist.totalTracks}</span>
                                </div>
                                <div class="detail-item size-item" style="--detail-index: 3">
                                    <span class="detail-value">${artist.totalSizeHuman}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    card.innerHTML = detailsHTML;
                    card.insertBefore(img, card.firstChild);
                    
                    const title = card.querySelector('.music-details h3');
                    const staggered = card.querySelector('.music-details .staggered');
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

                    card.dataset.artist = JSON.stringify(artist);
                    card.addEventListener('click', (event) => {
                        event.preventDefault();
                        openAlbumView(artist);
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

        filteredArtists.forEach(artist => {
            const placeholder = document.createElement('div');
            placeholder.classList.add('music-card-placeholder');
            placeholder.style.height = '174px';
            placeholder.dataset.artist = JSON.stringify(artist);
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

    const searchInput = document.getElementById('music-search');
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
        { name: 'Artist', value: 'artist' },
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
            if (filter.value === 'artist') {
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
                        if (currentFilter === 'artist') {
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
            
            if (musicData) populateMusicContent(musicData, searchInput.value);
        });
    });

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            if (musicData) populateMusicContent(musicData, query);
        }, 300);
    });
}

function openAlbumView(artist) {
    const overlay = document.createElement('div');
    overlay.classList.add('album-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('album-overlay-content');

    const artistCard = document.createElement('div');
    artistCard.classList.add('music-card', 'overlay-artist-card');
    const detailsHTML = `
        <div class="music-year">${formatYearRange(artist.yearRange)}</div>
        <div class="music-details">
            <h3>${artist.artistName}</h3>
            <div class="staggered">
                <div class="detail-item" style="--detail-index: 1">
                    <span class="detail-label">Albums</span>
                    <span class="detail-value">${artist.totalAlbums}</span>
                </div>
                <div class="detail-item" style="--detail-index: 2">
                    <span class="detail-label">Tracks</span>
                    <span class="detail-value">${artist.totalTracks}</span>
                </div>
                <div class="detail-item size-item" style="--detail-index: 3">
                    <span class="detail-value">${artist.totalSizeHuman}</span>
                </div>
            </div>
        </div>
    `;
    artistCard.innerHTML = `<img loading="lazy" src="/assets/images/music_image/${artist.ratingKey}.thumb.webp" alt="${artist.artistName}">${detailsHTML}`;
    
    // Calculate title width for separator bar
    const title = artistCard.querySelector('.music-details h3');
    const staggered = artistCard.querySelector('.music-details .staggered');
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

    const albumsGrid = document.createElement('div');
    albumsGrid.classList.add('albums-grid');

    overlayContent.appendChild(artistCard);
    overlayContent.appendChild(albumsGrid);
    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    overlay.offsetHeight;

    const sortedAlbums = artist.albums.slice().sort((a, b) => {
        if (a.year === null && b.year === null) return 0;
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        return b.year - a.year;
    });

    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 1024;

    if (isMobileDevice) {
        const preloadImages = sortedAlbums.map(album => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `/assets/images/music_image/${album.ratingKey}.thumb.webp`;
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`Failed to load image for album ${album.ratingKey}, using placeholder`);
                    resolve();
                };
            });
        });

        Promise.all(preloadImages).then(() => {
            requestAnimationFrame(() => {
                sortedAlbums.forEach(album => {
                    const albumCard = document.createElement('div');
                    albumCard.classList.add('album-card', 'loading');

                    const img = document.createElement('img');
                    img.src = `/assets/images/music_image/${album.ratingKey}.thumb.webp`;
                    img.alt = album.title;
                    
                    img.addEventListener('load', () => {
                        albumCard.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        albumCard.classList.remove('loading');
                        // If image fails, hide it and add a gradient placeholder background
                        img.style.display = 'none';
                        albumCard.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        albumCard.style.backgroundSize = 'cover';
                        albumCard.style.backgroundPosition = 'center';
                    });

                    const albumYear = document.createElement('div');
                    albumYear.classList.add('album-year');
                    albumYear.textContent = `${album.year || 'Unknown'}`;

                    const albumDetails = document.createElement('div');
                    albumDetails.classList.add('album-details');

                    const detailsHTML = `
                        <h4>${album.title}</h4>
                        <div class="staggered">
                            <div class="detail-item" style="--detail-index: 1">
                                <span class="detail-label">Tracks</span>
                                <span class="detail-value">${album.tracks}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: 2">
                                <span class="detail-label">Runtime</span>
                                <span class="detail-value">${album.albumDurationHuman}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: 3">
                                <span class="detail-label">File Type</span>
                                <span class="detail-value">.${album.albumContainers.join(', .')}</span>
                            </div>
                            <div class="detail-item size-item" style="--detail-index: 4">
                                <span class="detail-value">${album.albumSizeHuman}</span>
                            </div>
                        </div>
                    `;
                    albumDetails.innerHTML = detailsHTML;
                    
                    // Calculate title width for separator bar
                    const title = albumDetails.querySelector('h4');
                    const staggered = albumDetails.querySelector('.staggered');
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

                    albumCard.appendChild(img);
                    albumCard.appendChild(albumYear);
                    albumCard.appendChild(albumDetails);

                    albumsGrid.appendChild(albumCard);
                    albumCard.offsetHeight;
                });

                albumsGrid.style.display = 'flex';
                overlay.scrollTop = 0;
            });
        });
    } else {
        const albumObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const placeholder = entry.target;
                    const album = JSON.parse(placeholder.dataset.album);

                    const albumCard = document.createElement('div');
                    albumCard.classList.add('album-card', 'loading');

                    const img = document.createElement('img');
                    img.src = `/assets/images/music_image/${album.ratingKey}.thumb.webp`;
                    img.alt = album.title;
                    
                    img.addEventListener('load', () => {
                        albumCard.classList.remove('loading');
                    });
                    
                    img.addEventListener('error', () => {
                        albumCard.classList.remove('loading');
                        // If image fails, hide it and add a gradient placeholder background
                        img.style.display = 'none';
                        albumCard.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        albumCard.style.backgroundSize = 'cover';
                        albumCard.style.backgroundPosition = 'center';
                    });

                    const albumYear = document.createElement('div');
                    albumYear.classList.add('album-year');
                    albumYear.textContent = `${album.year || 'Unknown'}`;

                    const albumDetails = document.createElement('div');
                    albumDetails.classList.add('album-details');

                    const detailsHTML = `
                        <h4>${album.title}</h4>
                        <div class="staggered">
                            <div class="detail-item" style="--detail-index: 1">
                                <span class="detail-label">Tracks</span>
                                <span class="detail-value">${album.tracks}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: 2">
                                <span class="detail-label">Runtime</span>
                                <span class="detail-value">${album.albumDurationHuman}</span>
                            </div>
                            <div class="detail-item" style="--detail-index: 3">
                                <span class="detail-label">File Type</span>
                                <span class="detail-value">.${album.albumContainers.join(', .')}</span>
                            </div>
                            <div class="detail-item size-item" style="--detail-index: 4">
                                <span class="detail-value">${album.albumSizeHuman}</span>
                            </div>
                        </div>
                    `;
                    albumDetails.innerHTML = detailsHTML;
                    
                    // Calculate title width for separator bar
                    const title = albumDetails.querySelector('h4');
                    const staggered = albumDetails.querySelector('.staggered');
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

                    albumCard.appendChild(img);
                    albumCard.appendChild(albumYear);
                    albumCard.appendChild(albumDetails);

                    placeholder.replaceWith(albumCard);
                    observer.unobserve(placeholder);

                    albumCard.offsetHeight;
                }
            });
        }, {
            root: albumsGrid,
            rootMargin: '200px',
            threshold: 0
        });

        sortedAlbums.forEach(album => {
            const placeholder = document.createElement('div');
            placeholder.classList.add('album-card-placeholder');
            placeholder.style.width = '145px';
            placeholder.style.height = '217.5px';
            placeholder.style.background = '#333';
            placeholder.dataset.album = JSON.stringify(album);
            albumsGrid.appendChild(placeholder);
            albumObserver.observe(placeholder);
        });
    }

    albumsGrid.offsetHeight;

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
            if (touchDuration < 300 && !event.target.closest('.music-card') && !event.target.closest('.album-card')) {
                event.stopPropagation();
                event.preventDefault();
                isClosing = true;
                closeAlbumView(overlay);
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
            if (!event.target.closest('.music-card') && !event.target.closest('.album-card')) {
                closeAlbumView(overlay);
            }
        });
    }

    document.body.style.overflow = 'hidden';
}

function closeAlbumView(overlay) {
    overlay.remove();
    document.body.style.overflow = 'auto';
}

document.addEventListener('DOMContentLoaded', () => {
    const musicCard = document.querySelector(".music-card");
    if (musicCard) {
        musicCard.addEventListener("click", (event) => {
            event.preventDefault();
        });
    }
    
    initializeFilterAndSort();
    initializeScrollToTop();
    initializeInfoIcons();
    loadMusicData();
});

