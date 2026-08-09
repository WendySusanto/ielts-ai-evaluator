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
      // A span, not a label: callers already wrap this in their own <label>,
      // and nested labels break click-to-toggle.
      <span className={cn("relative inline-flex items-center", className)}>
        <input
          type="checkbox"
          className="peer size-4 shrink-0 appearance-none rounded-[0.25rem] border border-input bg-background shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:border-primary indeterminate:bg-primary indeterminate:border-primary"
          ref={(node) => {
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
            internalRef.current = node;
          }}
          {...props}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100">
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";
