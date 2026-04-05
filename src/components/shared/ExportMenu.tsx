import { useState, useRef, useEffect } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface ExportOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
}

interface ExportMenuProps {
  options: ExportOption[];
}

export function ExportMenu({ options }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary border border-border-subtle rounded-lg hover:border-border-default transition-colors"
      >
        <FileDown className="w-3.5 h-3.5" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 bg-bg-elevated border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]">
          {options.map((opt, i) => (
            <button
              key={i}
              disabled={loadingIdx !== null}
              onClick={async () => {
                setLoadingIdx(i);
                try {
                  await opt.onClick();
                } finally {
                  setLoadingIdx(null);
                  setOpen(false);
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors text-left"
            >
              {loadingIdx === i ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                opt.icon ?? <FileDown className="w-3.5 h-3.5" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
