import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";

interface JsonNodeProps {
  keyName: string;
  value: unknown;
  depth: number;
  highlightPath?: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function matchesPath(keyName: string, highlightPath?: string): boolean {
  if (!highlightPath) return false;
  const lower = highlightPath.toLowerCase();
  return (
    keyName.toLowerCase().includes(lower) ||
    lower.includes(keyName.toLowerCase())
  );
}

function JsonNode({ keyName, value, depth, highlightPath }: JsonNodeProps) {
  const isMatch = matchesPath(keyName, highlightPath);
  const [open, setOpen] = useState(depth < 2 || isMatch);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMatch && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setOpen(true);
    }
  }, [isMatch]);

  if (value === null || value === undefined) {
    return (
      <div className="flex items-baseline gap-2 py-1" style={{ paddingLeft: depth * 18 }}>
        <span className="text-accent-purple text-[12px]">{keyName}:</span>
        <span className="text-text-muted text-[12px] italic">null</span>
      </div>
    );
  }

  if (typeof value === "string") {
    const truncated = value.length > 150 ? value.slice(0, 150) + "..." : value;
    return (
      <div
        ref={ref}
        className={`flex items-baseline gap-2 py-1 rounded-md ${
          isMatch ? "bg-accent-purple/10 ring-1 ring-accent-purple/30 px-1" : ""
        }`}
        style={{ paddingLeft: depth * 18 }}
      >
        <span className="text-accent-purple text-[12px] flex-shrink-0">
          {keyName}:
        </span>
        <span className="text-accent-green text-[12px] break-all">
          &quot;{truncated}&quot;
        </span>
      </div>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <div
        ref={ref}
        className={`flex items-baseline gap-2 py-1 rounded-md ${
          isMatch ? "bg-accent-blue/10 ring-1 ring-accent-blue/30 px-1" : ""
        }`}
        style={{ paddingLeft: depth * 18 }}
      >
        <span className="text-accent-purple text-[12px]">{keyName}:</span>
        <span className="text-accent-yellow text-[12px]">{String(value)}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 py-1 w-full text-left hover:bg-bg-card-hover rounded-md transition-colors ${
            isMatch ? "bg-accent-blue/10 ring-1 ring-accent-blue/30" : ""
          }`}
          style={{ paddingLeft: depth * 18 }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted" />
          )}
          <span className="text-accent-purple text-[12px] font-medium">{keyName}</span>
          <span className="text-accent-blue text-[11px]">
            Array[{value.length}]
          </span>
        </button>
        {open && (
          <div>
            {value.map((item, i) => (
              <JsonNode
                key={i}
                keyName={String(i)}
                value={item}
                depth={depth + 1}
                highlightPath={highlightPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isObject(value)) {
    const keys = Object.keys(value);
    return (
      <div ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 py-1 w-full text-left hover:bg-bg-card-hover rounded-md transition-colors ${
            isMatch ? "bg-accent-purple/10 ring-1 ring-accent-purple/30" : ""
          }`}
          style={{ paddingLeft: depth * 18 }}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted" />
          )}
          <span className="text-accent-purple text-[12px] font-medium">{keyName}</span>
          <span className="text-text-muted text-[11px]">
            [{keys.length}]
          </span>
        </button>
        {open && (
          <div>
            {keys.map((k) => (
              <JsonNode
                key={k}
                keyName={k}
                value={(value as Record<string, unknown>)[k]}
                depth={depth + 1}
                highlightPath={highlightPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

interface JsonTreeViewerProps {
  data: Record<string, unknown> | string | null;
  highlightPath?: string;
  label: string;
  colorAccent: "purple" | "blue";
}

export function JsonTreeViewer({
  data,
  highlightPath,
  label,
  colorAccent,
}: JsonTreeViewerProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-[14px]">
        No {label.toLowerCase()} data available
      </div>
    );
  }

  let parsed: Record<string, unknown>;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return (
        <div className="p-4 text-[12px] text-text-secondary whitespace-pre-wrap font-mono">
          {data}
        </div>
      );
    }
  } else {
    parsed = data;
  }

  const isInput = colorAccent === "purple";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-default">
        {isInput ? (
          <ArrowRight className="w-3.5 h-3.5 text-accent-purple" />
        ) : (
          <ArrowLeft className="w-3.5 h-3.5 text-accent-blue" />
        )}
        <span className={`text-[12px] font-bold uppercase tracking-[0.08em] ${
          isInput ? "text-accent-purple" : "text-accent-blue"
        }`}>
          {label}
        </span>
        {highlightPath && (
          <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-0.5 rounded-md ml-auto">
            {highlightPath}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono">
        {Object.entries(parsed).map(([key, val]) => (
          <JsonNode
            key={key}
            keyName={key}
            value={val}
            depth={0}
            highlightPath={highlightPath}
          />
        ))}
      </div>
    </div>
  );
}
