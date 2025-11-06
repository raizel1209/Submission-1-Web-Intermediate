const VAPID_PUBLIC_KEY = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isUserSubscribed() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription;
}

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
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Gagal berlangganan push notification:', error);
    }
  } else {
    console.log('Sudah berlangganan:', subscription);
  }
}

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
      updateNotificationButton(true);
    } else {
      throw new Error(responseData.message || 'Gagal mengirim langganan ke server');
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

export async function unsubscribeNotification() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    try {
      await subscription.unsubscribe();
      // Kirim permintaan 'unsubscribe' ke server
      await sendUnsubscribeToServer(subscription);
    } catch (error) {
      console.error('Gagal berhenti berlangganan:', error);
    }
  }
}

async function sendUnsubscribeToServer(subscription) {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch('https://story-api.dicoding.dev/v1/notifications/unsubscribe', {
            method: 'POST', // Atau DELETE, sesuai spesifikasi API Anda
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        if (response.ok) {
            console.log('Berhasil berhenti berlangganan di server.');
            alert('Notifikasi telah dimatikan.');
            updateNotificationButton(false);
        } else {
            const responseData = await response.json();
            throw new Error(responseData.message || 'Gagal berhenti berlangganan di server.');
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}


export function updateNotificationButton(isSubscribed) {
  const notifButton = document.getElementById("notification-toggle");
  if (notifButton) {
    if (isSubscribed) {
      notifButton.textContent = "Matikan Notifikasi";
      notifButton.setAttribute("aria-label", "Matikan notifikasi");
    } else {
      notifButton.textContent = "Aktifkan Notifikasi";
      notifButton.setAttribute("aria-label", "Aktifkan notifikasi");
    }
  }
}

export async function handleNotificationButton() {
    const isSubscribed = await isUserSubscribed();
    if (isSubscribed) {
        await unsubscribeNotification();
    } else {
        await requestNotificationPermission();
    }
    // Update UI setelah aksi
    const finalSubscriptionState = await isUserSubscribed();
    updateNotificationButton(!!finalSubscriptionState);
}