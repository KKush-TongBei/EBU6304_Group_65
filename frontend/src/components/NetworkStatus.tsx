import { useEffect, useState } from "react";
import { useLocale } from "../locale";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface NetworkStatusProps {
  onRetry?: () => void;
  retryDelay?: number;
}

export function NetworkStatus({ onRetry, retryDelay = 30000 }: NetworkStatusProps) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { t } = useLocale();
  const [showRetry, setShowRetry] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOnline && wasOffline && onRetry) {
      setShowRetry(true);
      setCountdown(Math.floor(retryDelay / 1000));

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const retryTimer = setTimeout(() => {
        onRetry();
        setShowRetry(false);
      }, retryDelay);

      return () => {
        clearInterval(timer);
        clearTimeout(retryTimer);
      };
    }
  }, [isOnline, wasOffline, onRetry, retryDelay]);

  if (isOnline) {
    if (wasOffline) {
      return (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-xl shadow-lg text-sm">
          {t("common.networkRestored")}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-amber-100 dark:bg-amber-900/90 border-b border-amber-200 dark:border-amber-800 p-3 text-center">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-amber-800 dark:text-amber-200">
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          {t("common.networkOffline")}
        </span>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition"
          >
            {countdown > 0
              ? t("common.retryCountdown", { s: countdown })
              : t("common.retryNow")}
          </button>
        )}
      </div>
    </div>
  );
}
