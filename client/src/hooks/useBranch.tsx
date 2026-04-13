import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Branch } from "@shared/schema";

const BRANCH_STORAGE_KEY = "selectedBranchId";

interface BranchContextValue {
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: number | null;
  selectBranch: (branchId: number) => void;
  isLoading: boolean;
  branchesEnabled: boolean;
  needsBranchSelection: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  selectedBranch: null,
  selectedBranchId: null,
  selectBranch: () => {},
  isLoading: false,
  branchesEnabled: false,
  needsBranchSelection: false,
});

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: configData } = useQuery<{ branchesEnabled: boolean }>({
    queryKey: ["/api/config"],
  });

  const branchesEnabled = configData?.branchesEnabled === true;

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: branchesEnabled,
    staleTime: 60_000,
  });

  const selectBranch = useCallback((branchId: number) => {
    setSelectedBranchId(branchId);
    localStorage.setItem(BRANCH_STORAGE_KEY, String(branchId));
  }, []);

  // If previously selected branch is no longer active, clear it
  useEffect(() => {
    if (!branchesEnabled || branches.length === 0) return;
    if (selectedBranchId !== null) {
      const stillValid = branches.some(b => b.id === selectedBranchId && b.isActive);
      if (!stillValid) {
        setSelectedBranchId(null);
        localStorage.removeItem(BRANCH_STORAGE_KEY);
      }
    }
  }, [branches, selectedBranchId, branchesEnabled]);

  // Auto-select if only 1 active branch
  useEffect(() => {
    if (!branchesEnabled || branches.length !== 1 || selectedBranchId !== null) return;
    selectBranch(branches[0].id);
  }, [branches, selectedBranchId, branchesEnabled, selectBranch]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) ?? null;

  const needsBranchSelection =
    branchesEnabled && branches.length > 1 && selectedBranchId === null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        selectedBranchId,
        selectBranch,
        isLoading,
        branchesEnabled,
        needsBranchSelection,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
