function initializeRecommendations() {
    console.log('initializeRecommendations called');

    if (!window.firebase || !window.db || !window.messaging) {
        console.error('Firebase not initialized. Ensure Firebase is set up in index.html.');
        return;
    }

    const db = window.db;
    const messaging = window.messaging;
    const musicList = document.getElementById('music-list');

    if (!musicList) {
        console.error('Music list element not found:', { musicList: !!musicList });
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
            musicList.innerHTML = '';

            if (snapshot.empty) {
                console.log('No recommendations found in Firestore.');
                musicList.innerHTML = '<p>No recommendations yet.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('Recommendation data:', data);

                if (data.category === 'Music') {
                    const requestEntry = document.createElement('div');
                    requestEntry.classList.add('request-entry');

                    const details = `<p><strong>${wrapText(data.artist, 20)}</strong></p>` +
                                  (data.album ? `<p>Album: <strong>${wrapText(data.album, 20)}</strong></p>` : '');

                    requestEntry.innerHTML = `
                        ${details}
                        <p class="timestamp">${new Date(data.timestamp).toLocaleString()}</p>
                    `;
                    musicList.appendChild(requestEntry);
                }
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