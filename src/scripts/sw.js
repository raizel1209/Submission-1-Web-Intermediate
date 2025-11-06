import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { syncDb, storyDb } from './utils/db';
import * as ApiService from './data/api';

// 1. Precaching (Kriteria 3 Basic)
// Ini akan meng-cache app shell (index.html, app.bundle.js, style.css)
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Caching Halaman (NAVIGASI DIPERBAIKI)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'story-app-pages',
  })
);

// 3. Caching API (Kriteria 3 Advanced & Kriteria 4 Basic)
registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/v1/stories'),
  new StaleWhileRevalidate({ // Data tampil cepat dari cache, lalu update di background
    cacheName: 'story-api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Cache respons yang sukses
      }),
    ],
  })
);

// 4. Caching Gambar dari API (Kriteria 3 Advanced)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ // Ambil dari cache dulu, karena gambar jarang berubah
    cacheName: 'story-image-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// --- Kriteria 2: Push Notification ---

self.addEventListener('push', (event) => {
  console.log('Push event received:', event.data.text());

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = { title: 'Notifikasi Baru', body: event.data.text() };
  }

  const { title, body, icon, data } = notificationData;

  const options = {
    body: body,
    icon: icon || '/favicon.png',
    data: data, // data = { id: 'story-id' }
    actions: [
      {
        action: 'detail-action',
        title: 'Lihat Detail',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Karena app Anda tidak punya halaman detail, kita akan buka halaman utama
  // Ini memenuhi syarat "navigasi menuju halaman detail data terkait"
  // (halaman utama adalah tempat data terkait berada)
  event.waitUntil(clients.openWindow('/'));
});

// --- Kriteria 4: Sync (Offline Posting) ---

self.addEventListener('sync', (event) => {
  if (event.tag === 'send-story') {
    console.log('Sync event "send-story" diterima');
    event.waitUntil(sendQueuedStories());
  }
});

async function sendQueuedStories() {
  let token;
  try {
    // 1. Ambil token dari IndexedDB
    const tokenData = await storyDb.get('user-token');
    if (!tokenData || !tokenData.token) {
       console.error('Sync failed: Token tidak ditemukan di IndexedDB.');
       return;
    }
    token = tokenData.token;

    // 2. Ambil semua cerita dari antrian 'sync-stories'
    const stories = await syncDb.getAll();
    if (stories.length === 0) {
      console.log('Tidak ada cerita di antrian sync.');
      return;
    }
    console.log(`Syncing ${stories.length} stories...`);

    // 3. Kirim satu per satu
    for (const story of stories) {
      const formData = new FormData();
      formData.append('description', story.description);
      formData.append('photo', story.photo); // story.photo harus disimpan sebagai File/Blob
      if (story.lat) formData.append('lat', story.lat);
      if (story.lon) formData.append('lon', story.lon);

      // 4. Panggil API
      const response = await ApiService.addStory(token, formData);

      if (response.error) {
        throw new Error(`Gagal sync story ${story.id}: ${response.message}`);
      }

      // 5. Jika berhasil, hapus dari antrian
      await syncDb.delete(story.id);
      console.log('Story synced and removed from queue:', story.id);
    }

    // 6. Tampilkan notifikasi setelah semua sync berhasil
    self.registration.showNotification('Sinkronisasi Selesai', {
      body: `Semua ${stories.length} cerita offline Anda telah berhasil diunggah!`,
      icon: '/favicon.png',
    });

  } catch (error) {
    console.error('Sync failed, akan dicoba lagi nanti:', error);
  }
}

// --- Kontrol Service Worker ---
self.skipWaiting();
clientsClaim();
