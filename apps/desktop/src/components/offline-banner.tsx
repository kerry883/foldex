import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Shows a slim offline/online banner at the top of the layout.
 * Also triggers a background sync when the user comes back online.
 */
export function OfflineBanner() {
    const isOnline = useOnlineStatus();
    const wasOffline = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOffline.current = true;
            return;
        }

        // Just came back online
        if (wasOffline.current) {
            wasOffline.current = false;
            toast.success("You're back online!", { duration: 3000 });
        }
    }, [isOnline]);

    if (isOnline) return null;

    return (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-600 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="font-medium">You&apos;re offline</span>
            <span className="text-amber-600/70 dark:text-amber-400/70">
                — Notes & folders are saved locally. AI features require internet.
            </span>
        </div>
    );
}
