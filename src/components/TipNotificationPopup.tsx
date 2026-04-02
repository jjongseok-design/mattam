import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTipNotifications } from "@/hooks/useTipNotifications";

const TipNotificationPopup = () => {
  const { notifications, dismiss } = useTipNotifications();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 w-full max-w-sm px-4">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl shadow-lg px-4 py-3"
          >
            <span className="text-sm font-medium flex-1">{n.message}</span>
            <button
              onClick={() => dismiss(n.id)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TipNotificationPopup;
