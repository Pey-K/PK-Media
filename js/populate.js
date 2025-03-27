document.addEventListener('DOMContentLoaded', () => {
    const populateTotals = async (type, selectors) => {
        try {
            const response = await fetch(`data/${type}_ref.json`);
            if (!response.ok) throw new Error(`Failed to load ${type}_ref.json`);
            const data = await response.json();

            window[`${type}Data`] = data;

            const formatNumber = (number) => number.toLocaleString('en-US');

            const metadata = data.metadata;
            if (type === 'movies') {
                document.querySelector(selectors.total).textContent = formatNumber(metadata.totalMovies);
                document.querySelector(selectors.size).textContent = metadata.totalSizeHuman;
            } else if (type === 'tvshows') {
                document.querySelector(selectors.total).textContent = formatNumber(metadata.totalShow);
                document.querySelector(selectors.seasons).textContent = formatNumber(metadata.totalSeasonCount);
                document.querySelector(selectors.episodes).textContent = formatNumber(metadata.TotalEpisode);
                document.querySelector(selectors.size).textContent = metadata.totalSizeHuman;
            } else if (type === 'music') {
                document.querySelector(selectors.artists).textContent = formatNumber(metadata.totalArtists);
                document.querySelector(selectors.albums).textContent = formatNumber(metadata.totalAlbums);
                document.querySelector(selectors.tracks).textContent = formatNumber(metadata.totalTracks);
                document.querySelector(selectors.size).textContent = metadata.totalSizeHuman;
            }

            document.querySelectorAll(selectors.parent).forEach((detail) => {
                detail.classList.add('data-loaded');
            });
        } catch (error) {
            console.error(error);
        }
    };

    populateTotals('movies', {
        parent: '.movies-card .staggered div',
        total: '#movies-total',
        size: '#movies-size',
    });
    populateTotals('tvshows', {
        parent: '.tvshows-card .staggered div',
        total: '#tvshows-total',
        seasons: '#tvshows-seasons',
        episodes: '#tvshows-episodes',
        size: '#tvshows-size',
    });
    populateTotals('music', {
        parent: '.music-card .staggered div',
        artists: '#music-artists',
        albums: '#music-albums',
        tracks: '#music-tracks',
        size: '#music-size',
    });
});
