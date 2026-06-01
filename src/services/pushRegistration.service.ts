import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import api from "./api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

function hasFirebaseWebConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );
}

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await isSupported()) || !hasFirebaseWebConfig()) return null;
  if (!messagingInstance) {
    const app: FirebaseApp =
      getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch {
    return null;
  }
}

export async function registerPushTokenWithBackend(
  fcmToken: string,
): Promise<void> {
  await api.post("/users/me/push-token/", {
    fcm_token: fcmToken,
    expo_push_token: "",
    app_version: "web",
  });
}

export async function unregisterPushTokenFromBackend(): Promise<void> {
  await api.delete("/users/me/push-token/");
}

export async function subscribeWebPush(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const swReg = await registerServiceWorker();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg ?? undefined,
  });
  if (token) await registerPushTokenWithBackend(token);
  return token;
}

export async function unsubscribeWebPush(): Promise<void> {
  await unregisterPushTokenFromBackend();
}

export function listenForegroundWebPush(
  onPayload: (data: Record<string, unknown>) => void,
): (() => void) | null {
  let cancelled = false;
  void (async () => {
    const messaging = await getMessagingInstance();
    if (!messaging || cancelled) return;
    onMessage(messaging, (payload) => {
      const data = (payload.data ?? {}) as Record<string, unknown>;
      window.dispatchEvent(new CustomEvent("gp-order-push", { detail: data }));
      onPayload(data);
    });
  })();
  return () => {
    cancelled = true;
  };
}
