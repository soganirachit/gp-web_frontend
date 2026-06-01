/* eslint-disable no-restricted-globals */
/** Background push + notification click → postMessage to open tabs. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const notification = payload.notification || {};
  const data = payload.data || payload;
  const title = notification.title || data.title || "Genda Phool";
  const body = notification.body || data.body || "";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/favicon.ico",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage(data);
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) {
          const qs = new URLSearchParams({
            notification_type: String(
              data.type || data.notification_type || "",
            ),
            order_number: String(data.order_number || ""),
            ticket_number: String(data.ticket_number || ""),
            channel: String(data.channel || ""),
          });
          return self.clients.openWindow(`/?${qs.toString()}`);
        }
      }),
  );
});
