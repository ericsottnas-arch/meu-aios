import { createContext, useContext, ReactNode } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";

interface ScrollSpyContextType {
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const ScrollSpyContext = createContext<ScrollSpyContextType | undefined>(undefined);

const SECTION_IDS = ["campaign", "audience", "creative"];

export function ScrollSpyProvider({ children }: { children: ReactNode }) {
  const { activeSection, scrollToSection, containerRef } = useScrollSpy({
    sectionIds: SECTION_IDS,
    offset: 100
  });

  return (
    <ScrollSpyContext.Provider value={{ activeSection, scrollToSection, containerRef }}>
      {children}
    </ScrollSpyContext.Provider>
  );
}

export function useScrollSpyContext() {
  const context = useContext(ScrollSpyContext);
  if (!context) {
    throw new Error("useScrollSpyContext must be used within ScrollSpyProvider");
  }
  return context;
}
