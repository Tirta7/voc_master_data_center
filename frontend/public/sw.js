self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png', 
        badge: data.badge || '/icon-192.png',
        vibrate: [200, 100, 200], 
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open_url', title: 'Lihat Transaksi' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Failed to parse push notification JSON:', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Coba cari client yang sudah terbuka untuk PWA ini
      if (clientList.length > 0) {
        let client = clientList[0];
        // Focus ke window tersebut
        if ('focus' in client) {
          client.focus();
        }
        // Paksa navigasi ke target URL (Sangat penting untuk iOS PWA)
        if ('navigate' in client) {
          return client.navigate(targetUrl);
        }
      }
      // Jika tidak ada window terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
