import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

export const useNotifications = () => {
  const deviceId = getDeviceId();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission as NotificationPermission;
  });

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      if (result === "granted") {
        // 알림 허용 상태를 DB에 기록 (endpoint 없이 간단 기록)
        await supabase.from("push_subscriptions").upsert({
          device_id: deviceId,
          endpoint: `device:${deviceId}`,
          p256dh: "",
          auth: "",
        }).then(() => {});
      }
      return result === "granted";
    } catch {
      return false;
    }
  }, [deviceId]);

  const sendLocalNotification = useCallback((title: string, body: string) => {
    if (permission !== "granted") return;
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          body,
        });
      } else {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    } catch {}
  }, [permission]);

  return { permission, requestPermission, sendLocalNotification };
};
