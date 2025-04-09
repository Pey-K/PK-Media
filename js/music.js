let allArtists = [];
let currentObserver = null;

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
    const filteredArtists = query
        ? allArtists.filter(artist => artist.artistName.toLowerCase().includes(query))
        : allArtists;

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.classList.add('music-grid');
    container.appendChild(grid);

    if (query) {
        filteredArtists.forEach(artist => {
            const card = document.createElement('div');
            card.classList.add('music-card');
            card.innerHTML = `
                <img loading="lazy" src="assets/images/music_image/${artist.ratingKey}.thumb.webp" alt="${artist.artistName}">
                <div class="music-year">(${artist.yearRange})</div>
                <div class="music-details">
                    <h3>${artist.artistName}</h3>
                    <p>Albums: ${artist.totalAlbums}</p>
                    <p>${artist.totalTracks} Tracks</p>
                    <p>(${artist.totalSizeHuman})</p>
                </div>
            `;

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
                    card.classList.add('music-card');
                    card.innerHTML = `
                        <img loading="lazy" src="assets/images/music_image/${artist.ratingKey}.thumb.webp" alt="${artist.artistName}">
                        <div class="music-year">(${artist.yearRange})</div>
                        <div class="music-details">
                            <h3>${artist.artistName}</h3>
                            <p>Albums: ${artist.totalAlbums}</p>
                            <p>${artist.totalTracks} Tracks</p>
                            <p>(${artist.totalSizeHuman})</p>
                        </div>
                    `;

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

function openAlbumView(artist) {
    const overlay = document.createElement('div');
    overlay.classList.add('album-overlay');

    const overlayContent = document.createElement('div');
    overlayContent.classList.add('album-overlay-content');

    const artistCard = document.createElement('div');
    artistCard.classList.add('music-card', 'overlay-artist-card');
    artistCard.innerHTML = `
        <img loading="lazy" src="assets/images/music_image/${artist.ratingKey}.thumb.webp" alt="${artist.artistName}">
        <div class="music-year">(${artist.yearRange})</div>
        <div class="music-details">
            <h3>${artist.artistName}</h3>
            <p>Albums: ${artist.totalAlbums}</p>
            <p>${artist.totalTracks} Tracks</p>
            <p>(${artist.totalSizeHuman})</p>
        </div>
    `;

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

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        const batchSize = 5;
        let currentIndex = 0;

        const renderBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, sortedAlbums.length);
            for (let i = currentIndex; i < endIndex; i++) {
                const album = sortedAlbums[i];
                const albumCard = document.createElement('div');
                albumCard.classList.add('album-card');

                const img = document.createElement('img');
                img.src = `assets/images/music_image/${album.ratingKey}.thumb.webp`;
                img.alt = album.title;
                img.onerror = function() {
                    this.src = 'assets/images/placeholder.webp';
                };

                const albumYear = document.createElement('div');
                albumYear.classList.add('album-year');
                albumYear.textContent = `(${album.year || 'Unknown'})`;

                const albumDetails = document.createElement('div');
                albumDetails.classList.add('album-details');

                const albumTitle = document.createElement('h4');
                albumTitle.textContent = album.title;

                const tracks = document.createElement('p');
                tracks.textContent = `${album.tracks} Tracks`;

                const duration = document.createElement('p');
                duration.textContent = album.albumDurationHuman;

                const container = document.createElement('p');
                container.textContent = `.${album.albumContainers.join(', .')}`;

                const size = document.createElement('p');
                size.textContent = `(${album.albumSizeHuman})`;

                albumDetails.appendChild(albumTitle);
                albumDetails.appendChild(tracks);
                albumDetails.appendChild(duration);
                albumDetails.appendChild(container);
                albumDetails.appendChild(size);

                albumCard.appendChild(img);
                albumCard.appendChild(albumYear);
                albumCard.appendChild(albumDetails);

                albumsGrid.appendChild(albumCard);
                albumCard.offsetHeight;
            }

            albumsGrid.style.display = 'none';
            albumsGrid.offsetHeight;
            albumsGrid.style.display = 'flex';
            overlayContent.appendChild(albumsGrid);
            overlay.scrollTop = 0;

            currentIndex = endIndex;
            if (currentIndex < sortedAlbums.length) {
                setTimeout(renderBatch, 100);
            }
        };

        renderBatch();

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            setTimeout(() => {
                albumsGrid.style.display = 'none';
                albumsGrid.offsetHeight;
                albumsGrid.style.display = 'flex';
                overlayContent.appendChild(albumsGrid);
                overlay.scrollTop = 0;
            }, 200 * Math.ceil(sortedAlbums.length / batchSize));
        }
    } else {
        const albumObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const placeholder = entry.target;
                    const album = JSON.parse(placeholder.dataset.album);

                    const albumCard = document.createElement('div');
                    albumCard.classList.add('album-card');

                    const img = document.createElement('img');
                    img.src = `assets/images/music_image/${album.ratingKey}.thumb.webp`;
                    img.alt = album.title;
                    img.onerror = function() {
                        this.src = 'assets/images/placeholder.webp';
                    };

                    const albumYear = document.createElement('div');
                    albumYear.classList.add('album-year');
                    albumYear.textContent = `(${album.year || 'Unknown'})`;

                    const albumDetails = document.createElement('div');
                    albumDetails.classList.add('album-details');

                    const albumTitle = document.createElement('h4');
                    albumTitle.textContent = album.title;

                    const tracks = document.createElement('p');
                    tracks.textContent = `${album.tracks} Tracks`;

                    const duration = document.createElement('p');
                    duration.textContent = album.albumDurationHuman;

                    const container = document.createElement('p');
                    container.textContent = `.${album.albumContainers.join(', .')}`;

                    const size = document.createElement('p');
                    size.textContent = `(${album.albumSizeHuman})`;

                    albumDetails.appendChild(albumTitle);
                    albumDetails.appendChild(tracks);
                    albumDetails.appendChild(duration);
                    albumDetails.appendChild(container);
                    albumDetails.appendChild(size);

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

document.addEventListener('refDataLoaded', (event) => {
    populateMusicContent(event.detail);
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail.metadata;
    const totalArtists = document.querySelector("#music-artists");
    const totalAlbums = document.querySelector("#music-albums");
    const totalTracks = document.querySelector("#music-tracks");
    const totalSize = document.querySelector("#music-size");
    if (totalArtists && totalAlbums && totalTracks && totalSize) {
        const formatNumber = (number) => number.toLocaleString('en-US');
        totalArtists.textContent = formatNumber(data.totalArtists);
        totalAlbums.textContent = formatNumber(data.totalAlbums);
        totalTracks.textContent = formatNumber(data.totalTracks);
        totalSize.textContent = data.totalSizeHuman;
        document.querySelectorAll('.music-card .staggered div').forEach((detail) => {
            detail.classList.add('data-loaded');
        });
    }
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail;
    const searchInput = document.getElementById("music-search");

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            populateMusicContent(data, query);
        }, 300);
    });
});

function scrollToTop(scrollTarget) {
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
}

function findScrollableElement() {
    const mainContent = document.getElementById('main-content');
    const musicContent = document.getElementById('music-content');
    if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        return mainContent;
    } else if (musicContent && musicContent.scrollHeight > musicContent.clientHeight) {
        return musicContent;
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
    console.log('initializeRecommendationFeature called');

    const fab = document.getElementById('recommend-fab');
    if (!fab) {
        console.error('FAB element with id "recommend-fab" not found in the HTML.');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'recommend-modal';
    modal.classList.add('recommend-modal');
    modal.innerHTML = `
        <div class="recommend-modal-content">
            <h3>Recommend Music</h3>
            <div class="recommend-form">
                <input type="text" id="recommend-artist" class="recommend-search-box" placeholder="Enter artist name...">
                <input type="text" id="recommend-album" class="recommend-search-box" placeholder="Enter album name... (optional)" style="display: none;">
                <button id="recommend-submit">Submit</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const artistInput = document.getElementById('recommend-artist');
    const albumInput = document.getElementById('recommend-album');
    artistInput.addEventListener('input', () => {
        albumInput.style.display = artistInput.value.trim() ? 'block' : 'none';
    });

    fab.addEventListener('click', () => {
        console.log('FAB clicked');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            artistInput.value = '';
            albumInput.value = '';
            albumInput.style.display = 'none';
        }
    });

    document.getElementById('recommend-submit').addEventListener('click', () => {
        const artist = artistInput.value.trim();
        const album = albumInput.value.trim();
        if (artist) {
            storeRecommendation({
                category: 'Music',
                artist: artist,
                album: album || null,
                timestamp: new Date().toISOString()
            });
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            artistInput.value = '';
            albumInput.value = '';
            albumInput.style.display = 'none';
        } else {
            alert('Please enter an artist name.');
        }
    });
}

// Ensure the function runs even if DOMContentLoaded doesn't fire
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    initializeRecommendationFeature();
    initializeInfoIcons();
    initializeScroll();
});

// Fallback: Run after a short delay if DOMContentLoaded doesn't fire
setTimeout(() => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('Fallback: Running initializeRecommendationFeature');
        initializeRecommendationFeature();
        initializeInfoIcons();
        initializeScroll();
    }
}, 1000);

// Event listeners for refDataLoaded
document.addEventListener('refDataLoaded', (event) => {
    populateMusicContent(event.detail);
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail.metadata;
    const totalArtists = document.querySelector("#music-total");
    const totalAlbums = document.querySelector("#music-albums");
    const totalTracks = document.querySelector("#music-tracks");
    const totalSize = document.querySelector("#music-size");
    const totalDuration = document.querySelector("#music-duration");
    if (totalArtists && totalAlbums && totalTracks && totalSize && totalDuration) {
        const formatNumber = (number) => number.toLocaleString('en-US');
        totalArtists.textContent = formatNumber(data.totalArtists);
        totalAlbums.textContent = formatNumber(data.totalAlbums);
        totalTracks.textContent = formatNumber(data.totalTracks);
        totalSize.textContent = data.totalSizeHuman;
        totalDuration.textContent = data.totalDurationHuman;
        document.querySelectorAll('.music-card .staggered div').forEach((detail) => {
            detail.classList.add('data-loaded');
        });
    }
});

document.addEventListener("refDataLoaded", (event) => {
    const data = event.detail;
    const searchInput = document.getElementById("music-search");

    let debounceTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const query = searchInput.value.toLowerCase();
            populateMusicContent(data, query);
        }, 300);
    });
});