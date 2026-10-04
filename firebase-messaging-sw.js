importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCiattAZKHvXx_qUwkZRLYjoojLeaYbMm4",
    authDomain: "my-messenger-3d827.firebaseapp.com",
    databaseURL: "https://my-messenger-3d827-default-rtdb.firebaseio.com",
    projectId: "my-messenger-3d827",
    storageBucket: "my-messenger-3d827.firebasestorage.app",
    messagingSenderId: "452001582539",
    appId: "1:452001582539:web:6233a4c49f227e41787a4e"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    var title = (payload.notification && payload.notification.title) || 'پیام جدید';
    var body = (payload.notification && payload.notification.body) || '';
    self.registration.showNotification(title, {
        body: body,
        icon: '/quran-app/icon-192.png',
        dir: 'rtl'
    });
});
