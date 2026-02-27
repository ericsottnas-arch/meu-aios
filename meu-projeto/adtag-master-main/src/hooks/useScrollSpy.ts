import { useState, useEffect, useRef } from "react";

interface UseScrollSpyOptions {
  sectionIds: string[];
  offset?: number;
}

export function useScrollSpy({ sectionIds, offset = 100 }: UseScrollSpyOptions) {
  const [activeSection, setActiveSection] = useState<string>(sectionIds[0] || "");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + offset;
      
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const sectionTop = section.offsetTop - container.offsetTop;
          if (scrollPosition >= sectionTop) {
            setActiveSection(sectionIds[i]);
            return;
          }
        }
      }
      
      setActiveSection(sectionIds[0]);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => container.removeEventListener("scroll", handleScroll);
  }, [sectionIds, offset]);

  const scrollToSection = (sectionId: string) => {
    const container = containerRef.current;
    const section = document.getElementById(sectionId);
    
    if (container && section) {
      const sectionTop = section.offsetTop - container.offsetTop;
      container.scrollTo({
        top: sectionTop - offset + 20,
        behavior: "smooth"
      });
    }
  };

  return { activeSection, setActiveSection, scrollToSection, containerRef };
}
