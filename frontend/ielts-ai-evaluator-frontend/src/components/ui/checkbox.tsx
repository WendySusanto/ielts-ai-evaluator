import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate && !props.checked;
      }
    }, [indeterminate, props.checked]);

    return (
      <label className={cn("relative inline-flex items-center", className)}>
        <input
          type="checkbox"
          className="peer h-4 w-4 shrink-0 appearance-none rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-indigo-600 checked:border-indigo-600 transition"
          ref={(node) => {
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as any).current = node;
            internalRef.current = node;
          }}
          {...props}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
