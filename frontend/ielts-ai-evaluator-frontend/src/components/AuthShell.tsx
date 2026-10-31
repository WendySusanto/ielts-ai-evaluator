// src/components/AuthShell.tsx — the split sign-in / sign-up layout. Signed-out visitors land here
// directly, so the brand panel does the job the old landing page did: what the app is, and the
// disclaimer before any form.
import { LogoMark } from "@/components/AppSidebar";
import { DISCLAIMER } from "@/components/Disclaimer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BookMarked, Eye, EyeOff, Mic, PenLine, Target } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  { icon: Mic, label: "Speaking practice", tone: "text-tip" },
  { icon: PenLine, label: "Writing feedback", tone: "text-primary" },
  { icon: BookMarked, label: "Vocabulary notebook", tone: "text-primary" },
];

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Phones get only the logo and headline here; the form follows straight after. */}
      <aside className="flex flex-col gap-6 bg-secondary px-6 py-6 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <p className="font-semibold leading-tight text-foreground">When Band 7?</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-primary">
              LEARN · SPEAK · WRITE
            </p>
          </div>
        </div>

        <div className="lg:my-auto lg:space-y-10">
          <p className="font-serif text-3xl font-medium leading-tight tracking-tight text-balance text-foreground lg:text-6xl lg:leading-[1.05]">
            <span className="lg:hidden">Practise IELTS Writing and Speaking with AI feedback.</span>
            <span className="hidden lg:inline">
              Practise for the IELTS Writing and Speaking tests with AI feedback.
            </span>
          </p>

          <figure className="hidden max-w-lg -rotate-1 space-y-3 rounded-2xl bg-card p-5 shadow-xl shadow-black/5 lg:block">
            <figcaption className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-bold uppercase text-tip">
                <Target className="size-3.5" />
                Fix this first
              </span>
              <span className="text-muted-foreground">Example feedback</span>
            </figcaption>
            <p className="font-semibold text-card-foreground">
              Keep your verbs in the past tense when you tell a story
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-destructive line-through">We go to the temple and it is very quiet.</p>
              <p className="font-medium text-card-foreground">
                We went to the temple and it was completely silent.
              </p>
            </div>
          </figure>

          <ul className="hidden flex-wrap gap-x-7 gap-y-2 text-sm text-foreground lg:flex">
            {FEATURES.map(({ icon: Icon, label, tone }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className={cn("size-4", tone)} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-xs leading-relaxed text-secondary-foreground lg:block">{DISCLAIMER}</p>
      </aside>

      <main className="flex justify-center px-6 py-8 lg:items-center lg:py-12">
        <div className="w-full max-w-[400px]">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={cn("h-12 rounded-xl bg-card px-4", className)} {...props} />;
}

export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <AuthInput {...props} type={show ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-0.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
