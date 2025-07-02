import { useQuery } from "@tanstack/react-query";
import type { StoreSettings } from "@shared/schema";

export function useStoreSettings() {
  const query = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        const data = await res.json();
        
        // Validate and normalize data structure
        if (data && typeof data === 'object') {
          // Ensure workingHours is properly structured
          if (data.workingHours && typeof data.workingHours !== 'object') {
            data.workingHours = {};
          }
          
          // Ensure all required fields have safe fallbacks
          return {
            ...data,
            storeName: data.storeName || "eDAHouse",
            welcomeTitle: data.welcomeTitle || "",
            storeDescription: data.storeDescription || "",
            workingHours: data.workingHours || {}
          };
        }
        
        // Return safe default structure
        return {
          storeName: "eDAHouse",
          welcomeTitle: "",
          storeDescription: "",
          workingHours: {}
        };
      } catch (error) {
        console.error('Error fetching store settings:', error);
        return {
          storeName: "eDAHouse",
          welcomeTitle: "",
          storeDescription: "",
          workingHours: {}
        };
      }
    },
    retry: 1,
    staleTime: 15 * 60 * 1000, // 15 minutes - prevent frequent refetches
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // CRITICAL: prevent refetch on window focus
    refetchOnReconnect: false, // prevent refetch on reconnect
    refetchOnMount: false, // prevent refetch on component mount
  });

  return {
    storeSettings: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}