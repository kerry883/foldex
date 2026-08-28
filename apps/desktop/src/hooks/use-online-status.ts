import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        return navigator.onLine;
    });

    // 1. The Active Ping Function
    const verifyConnection = useCallback(async () => {
        // If the browser already knows the Wi-Fi is off, don't bother pinging.
        if (!navigator.onLine) {
            setIsOnline(false);
            return;
        }

        try {
            // Fetch a tiny 16px image from Google.
            // "mode: 'no-cors'" tells the browser to skip security checks since we 
            // don't care about the image data, we just care if the request survives!
            await fetch(`https://www.google.com/favicon.ico?t=${new Date().getTime()}`, {
                mode: "no-cors", 
                cache: "no-store" 
            });
            
            // If the fetch doesn't throw an error, we have real internet!
            setIsOnline(true);
        } catch (error) {
            // If it throws, the network is physically unreachable ("Lie-Fi")
            setIsOnline(false);
        }
    }, []);

    useEffect(() => {
        // Run the check immediately when the app loads
        verifyConnection();

        // 2. When the browser *thinks* Wi-Fi reconnected, verify it first!
        window.addEventListener("online", verifyConnection);
        
        // 3. If the browser knows the Wi-Fi physically disconnected, trust it instantly.
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("offline", handleOffline);

        // 4. (Optional but recommended) Re-verify every 30 seconds just to be safe
        const interval = setInterval(verifyConnection, 30000); 

        return () => {
            window.removeEventListener("online", verifyConnection);
            window.removeEventListener("offline", handleOffline);
            clearInterval(interval);
        };
    }, [verifyConnection]);

    return isOnline;
}