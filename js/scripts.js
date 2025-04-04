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

    const loadPage = async (page, stylesheet, script, refFile) => {
        try {
            console.log(`Loading page: ${page}`);
            const response = await fetch(`pages/${page}`);
            if (!response.ok) throw new Error("Page not found");
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
                newScript.onload = async () => { // Wait for script to load
                    if (refFile) {
                        const refResponse = await fetch(`data/${refFile}`);
                        if (!refResponse.ok) throw new Error(`Failed to load ${refFile}`);
                        const refData = await refResponse.json();
                        await new Promise(resolve => setTimeout(resolve, 0)); // Ensure DOM update
                        const event = new CustomEvent("refDataLoaded", { detail: refData });
                        document.dispatchEvent(event);
                    }
                };
                document.body.appendChild(newScript);
            }
        } catch (error) {
            console.error(error);
            mainContent.innerHTML = `<p>Error loading content. Please try again later.</p>`;
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
    }
});

