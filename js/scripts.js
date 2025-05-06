document.addEventListener("DOMContentLoaded", () => {

    const mainContent = document.getElementById("main-content");
    const isIndexPage = document.querySelector(".index-cards") !== null;

    const loadStylesheet = (href) => {
        const dynamicLinks = document.querySelectorAll('link[data-dynamic="true"]');
        dynamicLinks.forEach((link) => link.remove());

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.dynamic = "true";
        document.head.appendChild(link);
    };

    const removeDynamicScripts = () => {
        const dynamicScripts = document.querySelectorAll('script[data-dynamic="true"]');
        dynamicScripts.forEach((script) => script.remove());
    };

    const resetScrollPosition = () => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };

    const removeExistingModals = () => {
        const modal = document.getElementById('recommend-modal');
        if (modal) {
            modal.remove();
        }
        document.body.style.overflow = 'auto';
    };

    const loadPage = async (page, stylesheet, script, refFile) => {
        try {
            console.log(`Loading page: ${page}`);
            removeExistingModals();
            const response = await fetch(`pages/${page}`);
            if (!response.ok) throw new Error(`Page not found: ${page}`);
            const content = await response.text();
            mainContent.innerHTML = content;
    
            resetScrollPosition();
            loadStylesheet(stylesheet);
            removeDynamicScripts();
    
            if (script) {
                const newScript = document.createElement("script");
                newScript.src = script;
                newScript.defer = true;
                newScript.dataset.dynamic = "true";
                newScript.onload = async () => {
                    if (refFile) {
                        const refResponse = await fetch(`data/${refFile}`);
                        if (!refResponse.ok) throw new Error(`Failed to load ${refFile}`);
                        const refData = await refResponse.json();
                        await new Promise(resolve => setTimeout(resolve, 0));
                        const event = new CustomEvent("refDataLoaded", { detail: refData });
                        document.dispatchEvent(event);
                    }
                    if (page === 'recommend.html' && typeof window.initializeRecommendations === 'function') {
                        const maxAttempts = 20;
                        let attempts = 0;
                        const tryInitialize = () => {
                            const moviesList = document.getElementById('movies-list');
                            if (moviesList || attempts >= maxAttempts) {
                                console.log('Calling initializeRecommendations after', attempts, 'attempts');
                                window.initializeRecommendations();
                            } else {
                                attempts++;
                                console.log('DOM not ready, retrying initializeRecommendations, attempt', attempts);
                                setTimeout(tryInitialize, 200);
                            }
                        };
                        tryInitialize();
                    }
                };
                newScript.onerror = (error) => {
                    console.error(`Failed to load script: ${script}`, error);
                };
                document.body.appendChild(newScript);
            }
        } catch (error) {
            console.error(error);
            mainContent.innerHTML = `<p>Error loading content: ${page}. Please try again later.</p>`;
        }
    };

    if (isIndexPage) {
        loadStylesheet("css/index.css");

        const cards = document.querySelectorAll(".index-card");
        cards.forEach((card) => {
            card.addEventListener("click", () => {
                const page = card.dataset.page;
                const stylesheet = `css/${page.replace(".html", "")}.css`;
                const script = `js/${page.replace(".html", "")}.js`;
                const refFile = `${page.replace(".html", "_ref.json")}`;
                loadPage(page, stylesheet, script, refFile);
            });
        });

        const headerLogo = document.querySelector(".header-logo");
        if (headerLogo) {
            headerLogo.addEventListener("click", () => {
                const page = headerLogo.dataset.page;
                const stylesheet = `css/${page.replace(".html", "")}.css`;
                const script = `js/${page.replace(".html", "")}.js`;
                loadPage(page, stylesheet, script, null);
            });
        }
    }
});

function storeRecommendation(recommendation) {
    if (!window.db) {
        console.error('Firestore not initialized. Make sure Firebase is set up in your HTML file.');
        return;
    }

    window.db.collection('recommendations').add(recommendation)
        .then(() => {
            console.log('Recommendation stored in Firestore');
        })
        .catch(error => {
            console.error('Error storing recommendation:', error);
        });
}