import { useMemo, useState } from "react";

/** Client-side sort for small admin tables. ISO date strings sort correctly
 * via localeCompare. ponytail: O(n log n) per render on ~10-row tables. */
export function useSortedRows<T>(rows: T[], initialKey: keyof T & string) {
  const [key, setKey] = useState<keyof T & string>(initialKey);
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, key, dir]);

  const toggle = (k: keyof T & string) => {
    if (k === key) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setKey(k);
      setDir("asc");
    }
  };

  return { sorted, key, dir, toggle };
}
