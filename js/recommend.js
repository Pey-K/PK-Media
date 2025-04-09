function initializeRecommendations() {
    console.log('initializeRecommendations called');

    if (!window.firebase || !window.db || !window.messaging) {
        console.error('Firebase not initialized. Ensure Firebase is set up in index.html.');
        return;
    }

    const db = window.db;
    const messaging = window.messaging;
    const moviesList = document.getElementById('movies-list');
    const tvshowsList = document.getElementById('tvshows-list');
    const musicList = document.getElementById('music-list');

    if (!moviesList || !tvshowsList || !musicList) {
        console.error('One or more category list elements not found:', {
            moviesList: !!moviesList,
            tvshowsList: !!tvshowsList,
            musicList: !!musicList
        });
        return;
    }

    function wrapText(text, maxLength) {
        if (text.length <= maxLength) return text;
        let wrapped = '';
        for (let i = 0; i < text.length; i += maxLength) {
            wrapped += text.slice(i, i + maxLength) + (i + maxLength < text.length ? '\n' : '');
        }
        return wrapped;
    }

    db.collection('recommendations')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            console.log('Firestore snapshot received:', snapshot.size, 'documents');
            moviesList.innerHTML = '';
            tvshowsList.innerHTML = '';
            musicList.innerHTML = '';

            if (snapshot.empty) {
                console.log('No recommendations found in Firestore.');
                moviesList.innerHTML = '<p>No recommendations yet.</p>';
                tvshowsList.innerHTML = '<p>No recommendations yet.</p>';
                musicList.innerHTML = '<p>No recommendations yet.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('Recommendation data:', data);

                const requestEntry = document.createElement('div');
                requestEntry.classList.add('request-entry');

                let details = '';
                let targetList;

                if (data.category === 'Movies') {
                    details = `<p><strong>${wrapText(data.title, 20)}</strong></p>`;
                    targetList = moviesList;
                } else if (data.category === 'TV Shows') {
                    details = `<p><strong>${wrapText(data.show, 20)}</strong></p>` +
                             (data.season ? `<p>Season: <strong>${wrapText(data.season, 20)}</strong></p>` : '');
                    targetList = tvshowsList;
                } else if (data.category === 'Music') {
                    details = `<p><strong>${wrapText(data.artist, 20)}</strong></p>` +
                             (data.album ? `<p>Album: <strong>${wrapText(data.album, 20)}</strong></p>` : '');
                    targetList = musicList;
                }

                requestEntry.innerHTML = `
                    ${details}
                    <p class="timestamp">${new Date(data.timestamp).toLocaleString()}</p>
                `;
                targetList.appendChild(requestEntry);
            });
        }, error => {
            console.error('Error fetching recommendations:', error);
        });

    function requestNotificationPermission() {
        messaging.requestPermission()
            .then(() => {
                console.log('Notification permission granted.');
                return messaging.getToken();
            })
            .then(token => {
                console.log('FCM Token:', token);
                
            })
            .catch(err => {
                console.error('Unable to get permission to notify:', err);
            });
    }

    requestNotificationPermission();

    messaging.onMessage(payload => {
        console.log('Message received:', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: 'firebase-logo.png'
        };
        new Notification(notificationTitle, notificationOptions);
    });
}

window.initializeRecommendations = initializeRecommendations;