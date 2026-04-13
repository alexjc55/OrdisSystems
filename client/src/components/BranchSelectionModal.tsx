import { MapPin, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/hooks/useBranch";
import { useCommonTranslation } from "@/hooks/use-language";
import type { Branch } from "@shared/schema";

interface BranchSelectionModalProps {
  dismissible?: boolean;
  onClose?: () => void;
}

export default function BranchSelectionModal({ dismissible = false, onClose }: BranchSelectionModalProps) {
  const { branches, needsBranchSelection, selectBranch, selectedBranchId } = useBranch();
  const { t } = useCommonTranslation();

  if (!dismissible && !needsBranchSelection) return null;

  const handleSelect = (branchId: number) => {
    selectBranch(branchId);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {String(t('branch.selectTitle'))}
          </h2>
          <p className="text-gray-500 text-sm">
            {String(t('branch.selectSubtitle'))}
          </p>
        </div>

        <div className="space-y-3">
          {branches.map((branch: Branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelect(branch.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 group ${
                branch.id === selectedBranchId
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary hover:bg-primary/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  branch.id === selectedBranchId ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className={`font-medium transition-colors flex-1 ${
                  branch.id === selectedBranchId ? 'text-primary' : 'text-gray-800 group-hover:text-primary'
                }`}>
                  {branch.name}
                </span>
                {branch.id === selectedBranchId && (
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {dismissible && onClose && (
          <Button variant="outline" className="w-full mt-4" onClick={onClose}>
            {String(t('actions.cancel'))}
          </Button>
        )}
      </div>
    </div>
  );
}
