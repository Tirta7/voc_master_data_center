function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerAndSubscribePush(axiosInstance: any) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Browser atau perangkat ini tidak mendukung Web Push Notification.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak oleh pengguna.');
  }

  const response = await axiosInstance.get('/push/vapid-public-key');
  const keyData = response.data;
  
  if (!keyData || !keyData.publicKey) {
    console.error('Raw VAPID API Response:', response);
    throw new Error('VAPID Public Key belum terkonfigurasi di server. Response API: ' + JSON.stringify(keyData).substring(0, 100));
  }

  const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);

  let subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Unsubscribe from the old key so we can register with the new VAPID key
    await subscription.unsubscribe();
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  await axiosInstance.post('/push/subscribe', subscription);
  
  return true;
}
