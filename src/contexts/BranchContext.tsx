import React, { createContext, useContext, useState, useEffect } from 'react';

export type BranchOption = 'الكل' | 'الجيش' | 'المعادي';

interface BranchContextType {
  selectedBranch: BranchOption;
  setSelectedBranch: (branch: BranchOption) => void;
  availableBranches: BranchOption[];
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBranch, setSelectedBranchState] = useState<BranchOption>(() => {
    const saved = localStorage.getItem('selected_branch');
    if (saved === 'الكل' || saved === 'الجيش' || saved === 'المعادي') {
      return saved as BranchOption;
    }
    return 'الجيش';
  });

  const availableBranches: BranchOption[] = ['الكل', 'الجيش', 'المعادي'];

  const setSelectedBranch = (branch: BranchOption) => {
    setSelectedBranchState(branch);
    localStorage.setItem('selected_branch', branch);
  };

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, availableBranches }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
