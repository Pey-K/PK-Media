export function parseSize(sizeHuman) {
    if (!sizeHuman) return 0;
    const [value, unit] = sizeHuman.split(' ');
    const numValue = parseFloat(value) || 0;
    if (unit === 'GB') return numValue * 1024;
    if (unit === 'TB') return numValue * 1024 * 1024;
    return numValue;
}

export function parseYearRange(yearRange) {
    if (!yearRange) return 0;
    const match = yearRange.match(/(\d{4})/);
    return match ? parseInt(match[1]) : 0;
}

export function formatYearRange(yearRange) {
    if (!yearRange) return '';
    const match = yearRange.match(/(\d{4})-(\d{4})/);
    if (match) {
        const startYear = match[1];
        const endYear = match[2];
        if (startYear === endYear) {
            return startYear;
        }
    }
    return yearRange;
}

export function findScrollableElement() {
    const mainContent = document.getElementById('main-content');
    const content = document.getElementById('movies-content') || 
                   document.getElementById('tvshows-content') || 
                   document.getElementById('music-content');
    
    if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        return mainContent;
    } else if (content && content.scrollHeight > content.clientHeight) {
        return content;
    }
    return window;
}

export function scrollToTop(scrollTarget) {
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) return;

    let scrollTarget = findScrollableElement();

    const checkScroll = () => {
        const searchContainer = document.querySelector('.search-container');
        const scrollPosition = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
        const searchContainerBottom = searchContainer?.getBoundingClientRect().bottom || 0;

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
    observer.observe(document.getElementById('main-content') || document.body, { 
        childList: true, 
        subtree: true 
    });
}

export function initializeInfoIcons() {
    const cards = document.querySelectorAll('.index-card');
    if (!cards.length) {
        setTimeout(initializeInfoIcons, 100);
        return;
    }

    // Only add document click handler once
    if (!window.infoIconsInitialized) {
        window.infoIconsInitialized = true;
        
        document.addEventListener('click', (e) => {
            // Don't reset if clicking on the info icon
            if (e.target.closest('.info-icon')) {
                return;
            }
            
            const clickedCard = e.target.closest('.index-card');
            if (!clickedCard) {
                // Clicked outside all cards - reset all
                document.querySelectorAll('.index-card').forEach((card) => {
                    card.classList.remove('hover-enabled');
                    const icon = card.querySelector('.info-icon');
                    if (icon) icon.classList.remove('hidden');
                });
                return;
            }
            
            // Check if the clicked card is a link (index page) or div (individual page)
            const isLink = clickedCard.tagName === 'A';
            
            // On index page (link): don't reset (let it navigate)
            // On individual pages (div): reset the hover state
            if (!isLink) {
                clickedCard.classList.remove('hover-enabled');
                const icon = clickedCard.querySelector('.info-icon');
                if (icon) icon.classList.remove('hidden');
            }
        });
    }

    cards.forEach((card) => {
        const infoIcon = card.querySelector('.info-icon');
        if (!infoIcon) return;

        // Remove any existing listeners to avoid duplicates
        const newInfoIcon = infoIcon.cloneNode(true);
        infoIcon.parentNode.replaceChild(newInfoIcon, infoIcon);

        newInfoIcon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            card.classList.toggle('hover-enabled');
            newInfoIcon.classList.add('hidden');

            cards.forEach((otherCard) => {
                if (otherCard !== card) {
                    otherCard.classList.remove('hover-enabled');
                    const otherIcon = otherCard.querySelector('.info-icon');
                    if (otherIcon) otherIcon.classList.remove('hidden');
                }
            });
        });
    });
}

