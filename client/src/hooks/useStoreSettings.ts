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
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    storeSettings: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}