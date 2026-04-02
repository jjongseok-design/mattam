import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TipNotification {
  id: string;
  message: string;
  tip_id: string | null;
  created_at: string;
}

function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem("mattam_device_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("mattam_device_id", id); }
    return id;
  } catch { return null; }
}

export function useTipNotifications() {
  const [notifications, setNotifications] = useState<TipNotification[]>([]);

  useEffect(() => {
    const deviceId = getDeviceId();
    if (!deviceId) return;

    supabase
      .from("notifications" as any)
      .select("id, message, tip_id, created_at")
      .eq("device_id", deviceId)
      .eq("is_read", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data?.length) setNotifications(data as TipNotification[]);
      });
  }, []);

  const dismiss = async (id: string) => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    await supabase
      .from("notifications" as any)
      .update({ is_read: true })
      .eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAll = async () => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    await supabase
      .from("notifications" as any)
      .update({ is_read: true })
      .eq("device_id", deviceId)
      .eq("is_read", false);
    setNotifications([]);
  };

  return { notifications, dismiss, dismissAll };
}
