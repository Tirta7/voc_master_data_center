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
      // Focus if already open
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new if not
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
