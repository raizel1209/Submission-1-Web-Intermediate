const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

// Fungsi untuk mengubah string base64 ke Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Fungsi utama untuk meminta izin dan berlangganan
export async function requestNotificationPermission() {
  if (!('Notification' in window) || !('PushManager' in window)) {
    alert("Browser ini tidak mendukung notifikasi.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert("Izin notifikasi tidak diberikan.");
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Jika belum berlangganan, buat langganan baru
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      // Kirim subscription ke server Anda
      sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Gagal berlangganan push notification:', error);
    }
  } else {
    // Jika sudah berlangganan
    console.log('Sudah berlangganan:', subscription);
    // (Anda bisa tambahkan logika untuk "disable" jika tombol di-toggle)
  }
}

// Fungsi untuk mengirim data langganan ke API server
async function sendSubscriptionToServer(subscription) {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const response = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });

    const responseData = await response.json();
    if (response.ok) {
      console.log('Langganan berhasil dikirim ke server.');
      alert('Berhasil mengaktifkan notifikasi!');
    } else {
      throw new Error(responseData.message || 'Gagal mengirim langganan ke server');
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// (Advanced) Fungsi untuk unsubscribe
export async function unsubscribeNotification() {
  // 1. Dapatkan subscription
  // 2. Panggil subscription.unsubscribe()
  // 3. Kirim permintaan DELETE ke /notifications/subscribe di API Anda
}
