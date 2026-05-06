"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Пошук...",
  debounce = 200,
  className,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => onChange(local), debounce);
    return () => clearTimeout(id);
  }, [local, debounce, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {local && (
        <button
          onClick={() => { setLocal(""); onChange(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Очистити"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
