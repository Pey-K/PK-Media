import { initializeStaggeredAnimations } from './index.js';

export async function populateTotals(type, selectors) {
    try {
        const response = await fetch(`/assets/data/${type}_ref.json`);
        if (!response.ok) throw new Error(`Failed to load ${type}_ref.json`);
        const data = await response.json();

        window[`${type}Data`] = data;

        const formatNumber = (number) => number.toLocaleString('en-US');

        const metadata = data.metadata;
        if (type === 'movies') {
            const totalEl = document.querySelector(selectors.total);
            const sizeEl = document.querySelector(selectors.size);
            if (totalEl) totalEl.textContent = formatNumber(metadata.totalMovies);
            if (sizeEl) sizeEl.textContent = metadata.totalSizeHuman;
        } else if (type === 'tvshows') {
            const totalEl = document.querySelector(selectors.total);
            const seasonsEl = document.querySelector(selectors.seasons);
            const episodesEl = document.querySelector(selectors.episodes);
            const sizeEl = document.querySelector(selectors.size);
            if (totalEl) totalEl.textContent = formatNumber(metadata.totalShow);
            if (seasonsEl) seasonsEl.textContent = formatNumber(metadata.totalSeasonCount);
            if (episodesEl) episodesEl.textContent = formatNumber(metadata.TotalEpisode);
            if (sizeEl) sizeEl.textContent = metadata.totalSizeHuman;
        } else if (type === 'music') {
            const artistsEl = document.querySelector(selectors.artists);
            const albumsEl = document.querySelector(selectors.albums);
            const tracksEl = document.querySelector(selectors.tracks);
            const sizeEl = document.querySelector(selectors.size);
            if (artistsEl) artistsEl.textContent = formatNumber(metadata.totalArtists);
            if (albumsEl) albumsEl.textContent = formatNumber(metadata.totalAlbums);
            if (tracksEl) tracksEl.textContent = formatNumber(metadata.totalTracks);
            if (sizeEl) sizeEl.textContent = metadata.totalSizeHuman;
        }

        document.querySelectorAll(selectors.parent).forEach((detail) => {
            detail.classList.add('data-loaded');
        });
        
        initializeStaggeredAnimations();
    } catch (error) {
        console.error(error);
    }
}

if (document.querySelector('.index-cards')) {
    document.addEventListener('DOMContentLoaded', () => {
        populateTotals('movies', {
            parent: '.movies-card .staggered .stat-item',
            total: '#movies-total',
            size: '#movies-size',
        });
        populateTotals('tvshows', {
            parent: '.tvshows-card .staggered .stat-item',
            total: '#tvshows-total',
            seasons: '#tvshows-seasons',
            episodes: '#tvshows-episodes',
            size: '#tvshows-size',
        });
        populateTotals('music', {
            parent: '.music-card .staggered .stat-item',
            artists: '#music-artists',
            albums: '#music-albums',
            tracks: '#music-tracks',
            size: '#music-size',
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.movies-card') && !document.querySelector('.index-cards')) {
        populateTotals('movies', {
            parent: '.movies-card .staggered .stat-item',
            total: '#movies-total',
            size: '#movies-size',
        });
    }
    
    if (document.querySelector('.tvshows-card') && !document.querySelector('.index-cards')) {
        populateTotals('tvshows', {
            parent: '.tvshows-card .staggered .stat-item',
            total: '#tvshows-total',
            seasons: '#tvshows-seasons',
            episodes: '#tvshows-episodes',
            size: '#tvshows-size',
        });
    }
    
    if (document.querySelector('.music-card') && !document.querySelector('.index-cards')) {
        populateTotals('music', {
            parent: '.music-card .staggered .stat-item',
            artists: '#music-artists',
            albums: '#music-albums',
            tracks: '#music-tracks',
            size: '#music-size',
        });
    }
});

