function populateMusicContent(data, attempts = 0, maxAttempts = 50) {
    const container = document.getElementById('music-content');

    const artists = data.artists;

    const grid = document.createElement('div');
    grid.classList.add('music-grid');

    artists.forEach(artist => {
        const card = document.createElement('div');
        card.classList.add('music-card');
        card.innerHTML = `
            <img loading="lazy" src="assets/images/music_image/${artist.ratingKey}.thumb.jpg" alt="${artist.artistName}">
            <div class="music-year">(${artist.yearRange})</div>
            <div class="music-details">
                <h3>${artist.artistName}</h3>
                <p>Albums: ${artist.totalAlbums}</p>
                <p>Tracks: ${artist.totalTracks}</p>
                <p>(${artist.totalSizeHuman})</p>
            </div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
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

document.addEventListener("refDataLoaded", () => {
    const searchInput = document.getElementById("music-search");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const musicCards = document.querySelectorAll(".music-card");

        musicCards.forEach((card) => {
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
