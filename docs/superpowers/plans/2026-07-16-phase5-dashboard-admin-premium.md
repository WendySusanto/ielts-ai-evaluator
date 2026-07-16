# Phase 5 — Dashboard Trend, Admin Redesign, Premium, Production Prep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the final v2 phase: band-trend chart on the dashboard, admin split with speaking-prompt CRUD + sortable tables + per-user recent evaluations, a real Premium pricing page, and production-prep docs.

**Architecture:** Frontend-only (React 19 + Vite + Tailwind 4 + shadcn/ui). All data comes from existing, tested backend endpoints (`/api/dashboard` `bandTrend`, `/api/speaking-prompts`, `/api/manage/users`, `/api/manage/recent-evaluations?userId=`). The oversized `Admin.tsx` splits into per-tab components under `src/components/admin/`.

**Tech Stack:** Existing only — `useApi` hook, react-hook-form, sonner toasts, lucide icons, Radix tabs/dialog. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-07-16-phase5-dashboard-admin-premium-design.md`

## Global Constraints

- Frontend root: `frontend/ielts-ai-evaluator-frontend` — all `npm` commands run there.
- No backend changes. Backend suite re-runs once at the end as a regression guard (`dotnet test` from `backend`, expect 78/78 pass).
- No new npm dependencies.
- No frontend test infrastructure exists; per-task verification is `npm run build` (includes `tsc -b`) + the listed manual checks against the dev servers (backend `:7071`, frontend `:5173`).
- Chart series colors are fixed, validator-approved values (do not substitute): light `--chart-writing: oklch(0.58 0.13 185)`, `--chart-speaking: oklch(0.62 0.15 45)`; dark `--chart-writing: oklch(0.62 0.11 190)`, `--chart-speaking: oklch(0.64 0.14 50)`.
- Commit after every task with the message given in the task.

---

### Task 1: Chart tokens + `BandTrendCard` + Dashboard integration

**Files:**
- Modify: `frontend/ielts-ai-evaluator-frontend/src/index.css` (three insertions: `@theme inline` block ~line 30, `:root` ~line 70, `.dark` ~line 107)
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/dashboard/BandTrendCard.tsx`
- Modify: `frontend/ielts-ai-evaluator-frontend/src/pages/Dashboard.tsx:161-164` (left column)
- Modify: `frontend/ielts-ai-evaluator-frontend/src/components/skeleton/DashboardSkeleton.tsx:34-65` (left column)

**Interfaces:**
- Consumes: `DashboardBandPoint` from `@/types/dashboard` (exists: `{ createdAt: string; overallBand: number; type: "writing" | "speaking" }`).
- Produces: `BandTrendCard` component, props `{ points: DashboardBandPoint[]; targetScore: number | null }`. Tailwind utilities `fill-chart-writing`, `fill-chart-speaking`, `bg-chart-writing`, `bg-chart-speaking`.

- [ ] **Step 1: Add chart tokens to `index.css`**

Inside the `@theme inline` block (next to the existing `--color-tip` lines):

```css
  --color-chart-writing: var(--chart-writing);
  --color-chart-speaking: var(--chart-speaking);
```

Inside `:root` (light values, next to `--tip`):

```css
  /* Band-trend chart series — validated (dataviz palette checker) against white card */
  --chart-writing: oklch(0.58 0.13 185);
  --chart-speaking: oklch(0.62 0.15 45);
```

Inside `.dark`:

```css
  /* validated against dark card oklch(0.235 0.017 220) */
  --chart-writing: oklch(0.62 0.11 190);
  --chart-speaking: oklch(0.64 0.14 50);
```

- [ ] **Step 2: Create `BandTrendCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBandPoint } from "@/types/dashboard";
import { TrendingUp } from "lucide-react";

interface BandTrendCardProps {
  points: DashboardBandPoint[];
  targetScore: number | null;
}

// ponytail: hand-rolled SVG (≤20 points, native <title> tooltips); add a chart
// lib only if zoom/brush is ever needed.
const W = 640;
const H = 220;
const PLOT = { x0: 28, x1: W - 56, y0: 12, y1: H - 26 };

const SERIES = {
  writing: { label: "Writing", dot: "fill-chart-writing" },
  speaking: { label: "Speaking", dot: "fill-chart-speaking" },
} as const;

const yFor = (band: number) => PLOT.y1 - (band / 9) * (PLOT.y1 - PLOT.y0);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const BandTrendCard = ({ points, targetScore }: BandTrendCardProps) => {
  // Points arrive oldest→newest from the API; x is evaluation order, not time-scaled.
  const xFor = (i: number) =>
    PLOT.x0 + (i / (points.length - 1)) * (PLOT.x1 - PLOT.x0);

  return (
    <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <TrendingUp className="h-5 w-5 text-secondary" />
          Band Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="text-center py-8 text-foreground font-medium">
            Complete more evaluations to see your trend.
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              role="img"
              aria-label={`Band score trend across your last ${points.length} evaluations`}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((band) => (
                <g key={band}>
                  <line
                    x1={PLOT.x0}
                    x2={PLOT.x1}
                    y1={yFor(band)}
                    y2={yFor(band)}
                    className="stroke-border"
                    strokeWidth={band % 3 === 0 ? 1 : 0.5}
                  />
                  {band % 3 === 0 && (
                    <text
                      x={PLOT.x0 - 8}
                      y={yFor(band) + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {band}
                    </text>
                  )}
                </g>
              ))}
              {targetScore != null && (
                <g>
                  <line
                    x1={PLOT.x0}
                    x2={PLOT.x1}
                    y1={yFor(targetScore)}
                    y2={yFor(targetScore)}
                    className="stroke-muted-foreground"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PLOT.x1 + 6}
                    y={yFor(targetScore) + 3}
                    className="fill-muted-foreground text-[10px]"
                  >
                    Target {targetScore}
                  </text>
                </g>
              )}
              <polyline
                points={points
                  .map((p, i) => `${xFor(i)},${yFor(p.overallBand)}`)
                  .join(" ")}
                fill="none"
                className="stroke-muted-foreground/50"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(p.overallBand)}
                  r={4}
                  className={SERIES[p.type].dot}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  <title>{`${SERIES[p.type].label} ${p.overallBand.toFixed(1)} — ${fmtDate(p.createdAt)}`}</title>
                </circle>
              ))}
              <text
                x={PLOT.x0}
                y={H - 8}
                className="fill-muted-foreground text-[10px]"
              >
                {fmtDate(points[0].createdAt)}
              </text>
              <text
                x={PLOT.x1}
                y={H - 8}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {fmtDate(points[points.length - 1].createdAt)}
              </text>
            </svg>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-writing" />
                Writing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-speaking" />
                Speaking
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 3: Mount it in `Dashboard.tsx`**

Change the left column wrapper (currently `<div className="lg:col-span-2">` at line 163) to stack the chart above Recent Evaluations:

```tsx
        {/* Band Trend + Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <BandTrendCard
            points={dashboardData.bandTrend}
            targetScore={targetScore ?? null}
          />
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm h-[500px]">
```

(The existing Recent Evaluations `<Card>` and everything inside it is unchanged.) Add the import:

```tsx
import { BandTrendCard } from "@/components/dashboard/BandTrendCard";
```

- [ ] **Step 4: Mirror in `DashboardSkeleton.tsx`**

In the `lg:col-span-2` column, add `space-y-6` to the wrapper div and insert a chart skeleton card **before** the existing Recent Activity skeleton card:

```tsx
        <div className="lg:col-span-2 space-y-6">
          {/* Band Trend Skeleton */}
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full rounded-xl" />
            </CardContent>
          </Card>
```

- [ ] **Step 5: Verify**

Run: `npm run build` — Expected: clean (no tsc or vite errors).
Manual (dev servers): Dashboard shows the chart above Recent Evaluations; dots teal/orange with legend; dashed target line when a target score is set; hovering a dot shows a native tooltip; account with 0–1 evaluations shows the empty-state text; check light **and** dark mode.

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "v2 ui: dashboard band trend chart (validated chart tokens, inline svg)"
```

---

### Task 2: `useSortedRows` hook + `SortableHead`

**Files:**
- Create: `frontend/ielts-ai-evaluator-frontend/src/hooks/use-sorted-rows.ts`
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/SortableHead.tsx`

**Interfaces:**
- Produces: `useSortedRows<T>(rows: T[], initialKey: keyof T & string)` returning `{ sorted: T[]; key: string; dir: "asc" | "desc"; toggle: (k: keyof T & string) => void }`. `SortableHead` props `{ label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }`. Tasks 3–5 consume both.

- [ ] **Step 1: Create `use-sorted-rows.ts`**

```ts
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
```

- [ ] **Step 2: Create `SortableHead.tsx`**

```tsx
import { TableHead } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortableHeadProps {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}

export const SortableHead = ({ label, active, dir, onClick }: SortableHeadProps) => (
  <TableHead>
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 cursor-pointer select-none hover:text-foreground"
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  </TableHead>
);
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: clean (both files compile; unused-export is fine, consumers land in Task 3).

```bash
git add -A frontend
git commit -m "v2 ui: shared sortable-table hook and header for admin"
```

---

### Task 3: Extract `WritingPromptForm` + `WritingPromptsTab`, slim `Admin.tsx` to a tabbed shell

**Files:**
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/WritingPromptForm.tsx`
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/WritingPromptsTab.tsx`
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/UsersTab.tsx` (users table moves here now; the recent-evaluations dialog is added in Task 5)
- Rewrite: `frontend/ielts-ai-evaluator-frontend/src/pages/Admin.tsx`

**Interfaces:**
- Consumes: `useSortedRows` + `SortableHead` (Task 2); `WritingPrompt`, `WritingPromptUpsertRequest` from `@/types/WritingPrompt`; `User` from `@/types/User`; `useApi` from `@/hooks/use-api`.
- Produces: `WritingPromptForm` props `{ prompt?: WritingPrompt; onSubmit: (d: WritingPromptUpsertRequest) => void; onCancel: () => void }`; `WritingPromptsTab` and `UsersTab` (no props). Task 4 mirrors this form/tab shape for speaking; Task 5 extends `UsersTab`.

Fixes two latent bugs while extracting: (1) the upsert dialog never closed after submit (`onClose` was a no-op); (2) `<Checkbox {...register("isActive")} />` never updated the form — Radix Checkbox is not a native input; it needs `checked`/`onCheckedChange` wired to `watch`/`setValue`.

- [ ] **Step 1: Create `WritingPromptForm.tsx`**

Same fields as the current inline form (`pages/Admin.tsx:105-280`), with three changes: top-level component, inline required-field errors, fixed checkbox binding. Complete file:

```tsx
import { useForm } from "react-hook-form";
import WritingPrompt, { WritingPromptUpsertRequest } from "@/types/WritingPrompt";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WritingPromptFormProps {
  prompt?: WritingPrompt;
  onSubmit: (data: WritingPromptUpsertRequest) => void;
  onCancel: () => void;
}

const FieldError = ({ show, label }: { show: boolean; label: string }) =>
  show ? <p className="text-sm text-destructive mt-1">{label} is required.</p> : null;

export const WritingPromptForm = ({ prompt, onSubmit, onCancel }: WritingPromptFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WritingPromptUpsertRequest>({
    defaultValues: prompt ?? {
      topic: "",
      description: "",
      preview: "",
      questionType: "",
      questionText: "",
      duration: 40,
      minimumWords: 250,
      taskType: "Task2",
      level: "Academic",
      imageUrl: "",
      isActive: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input {...register("topic", { required: true })} placeholder="Enter topic" />
          <FieldError show={!!errors.topic} label="Topic" />
        </div>
        <div>
          <Label htmlFor="questionType">Question Type</Label>
          <Select
            value={watch("questionType")}
            onValueChange={(value) => setValue("questionType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Line Graph">Line Graph</SelectItem>
              <SelectItem value="Table">Table</SelectItem>
              <SelectItem value="Pie Chart">Pie Chart</SelectItem>
              <SelectItem value="Bar Chart">Bar Chart</SelectItem>
              <SelectItem value="Essay">Essay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          {...register("description", { required: true })}
          placeholder="Enter description"
        />
        <FieldError show={!!errors.description} label="Description" />
      </div>

      <div>
        <Label htmlFor="preview">Preview</Label>
        <Input {...register("preview", { required: true })} placeholder="Enter preview text" />
        <FieldError show={!!errors.preview} label="Preview" />
      </div>

      <div>
        <Label htmlFor="questionText">Question Text</Label>
        <Textarea
          {...register("questionText", { required: true })}
          placeholder="Enter the full question"
        />
        <FieldError show={!!errors.questionText} label="Question text" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            type="number"
            {...register("duration", { required: true, valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="minimumWords">Minimum Words</Label>
          <Input
            type="number"
            {...register("minimumWords", { required: true, valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="taskType">Task Type</Label>
          <Select
            value={watch("taskType")}
            onValueChange={(value) => setValue("taskType", value as "Task1" | "Task2")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Task1">Task 1</SelectItem>
              <SelectItem value="Task2">Task 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="level">Level</Label>
          <Select
            value={watch("level")}
            onValueChange={(value) => setValue("level", value as "Academic" | "General")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="imageUrl">Image URL (optional)</Label>
        <Input {...register("imageUrl")} placeholder="Enter image URL for Task 1" />
      </div>

      <div>
        <Label htmlFor="imageDescription">Image Description (optional)</Label>
        <Input
          {...register("imageDescription")}
          placeholder="Enter image description for Task 1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(v) => setValue("isActive", v === true)}
        />
        <Label htmlFor="isActive">Active (visible to students)</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{prompt ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Create `WritingPromptsTab.tsx`**

Controlled dialog (`editing`: `undefined` = closed, `null` = creating, object = editing) so submit actually closes it. Complete file:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";
import WritingPrompt, { WritingPromptUpsertRequest } from "@/types/WritingPrompt";
import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import { WritingPromptForm } from "./WritingPromptForm";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const WritingPromptsTab = () => {
  // undefined = dialog closed, null = creating, object = editing
  const [editing, setEditing] = useState<WritingPrompt | null | undefined>(undefined);

  const {
    data: prompts,
    isLoading,
    error,
    refetch,
    mutate,
  } = useApi<WritingPrompt[]>("/api/writing-prompts?includeInactive=true");

  const { sorted, key, dir, toggle } = useSortedRows(prompts ?? [], "topic");

  const handleUpsert = async (data: WritingPromptUpsertRequest) => {
    await mutate({
      url: "/api/writing-prompts",
      method: "POST",
      data,
      onSuccess: () => {
        toast.success(data.writingPromptId ? "Writing prompt updated" : "Writing prompt created");
        setEditing(undefined);
        refetch();
      },
      onError: (err) =>
        toast.error("Failed to save writing prompt", { description: err.message }),
    });
  };

  if (error) {
    return (
      <ErrorPage
        title="Failed to load writing prompts"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton columns={7} rows={5} />
        </CardContent>
      </Card>
    );
  }

  const sortable: { label: string; k: keyof WritingPrompt & string }[] = [
    { label: "Topic", k: "topic" },
    { label: "Type", k: "questionType" },
    { label: "Task", k: "taskType" },
    { label: "Level", k: "level" },
    { label: "Duration", k: "duration" },
    { label: "Status", k: "isActive" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Writing Tasks</CardTitle>
            <CardDescription>Manage IELTS writing prompts and tasks</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Writing Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {sortable.map((c) => (
                <SortableHead
                  key={c.k}
                  label={c.label}
                  active={key === c.k}
                  dir={dir}
                  onClick={() => toggle(c.k)}
                />
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((prompt) => (
              <TableRow key={prompt.writingPromptId}>
                <TableCell className="font-medium">{prompt.topic}</TableCell>
                <TableCell>{prompt.questionType}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{prompt.taskType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{prompt.level}</Badge>
                </TableCell>
                <TableCell>{prompt.duration} min</TableCell>
                <TableCell>
                  <Badge variant={prompt.isActive ? "default" : "outline"}>
                    {prompt.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(prompt)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No writing tasks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <DialogContent className="w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Writing Task" : "Create Writing Task"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this writing prompt"
                : "Add a new writing prompt for IELTS practice"}
            </DialogDescription>
          </DialogHeader>
          <WritingPromptForm
            prompt={editing ?? undefined}
            onSubmit={handleUpsert}
            onCancel={() => setEditing(undefined)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
```

- [ ] **Step 3: Create `UsersTab.tsx`** (read-only table, moved from Admin; sortable)

```tsx
import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { User } from "@/types/User";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const UsersTab = () => {
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useApi<User[]>("/api/manage/users");

  const { sorted, key, dir, toggle } = useSortedRows(users ?? [], "email");

  if (error) {
    return (
      <ErrorPage title="Failed to load users" message={error.message} onRetry={refetch} />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton columns={5} rows={5} />
        </CardContent>
      </Card>
    );
  }

  const sortable: { label: string; k: keyof User & string }[] = [
    { label: "Email", k: "email" },
    { label: "Full Name", k: "fullName" },
    { label: "Plan", k: "plan" },
    { label: "Target Score", k: "ieltsTargetScore" },
    { label: "Joined", k: "createdAt" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View registered users (read-only)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {sortable.map((c) => (
                <SortableHead
                  key={c.k}
                  label={c.label}
                  active={key === c.k}
                  dir={dir}
                  onClick={() => toggle(c.k)}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>
                  <Badge variant={user.plan === "Free" ? "secondary" : "default"}>
                    {user.plan}
                  </Badge>
                </TableCell>
                <TableCell>{user.ieltsTargetScore ?? "Not set"}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 4: Rewrite `Admin.tsx` as the shell** (complete replacement; the Speaking tab arrives in Task 4 — leave its slot out for now)

```tsx
import { useState } from "react";
import { FileText, Users2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { WritingPromptsTab } from "@/components/admin/WritingPromptsTab";
import { UsersTab } from "@/components/admin/UsersTab";

const triggerClass =
  "cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200";

const Admin = () => {
  const [tab, setTab] = useState("writing");

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
        <p className="text-foreground font-medium text-lg">
          Manage writing tasks, speaking tasks and users
        </p>
      </div>

      <Tabs className="space-y-4" value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 dark:bg-card border border-border p-1 rounded-sm h-10">
          <TabsTrigger value="writing" className={triggerClass}>
            <FileText className="h-4 w-4 mr-2" />
            Writing Tasks
          </TabsTrigger>
          <TabsTrigger value="user" className={triggerClass}>
            <Users2 className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writing" className="space-y-4">
          <WritingPromptsTab />
        </TabsContent>
        <TabsContent value="user" className="space-y-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
```

- [ ] **Step 5: Verify**

Run: `npm run build` — Expected: clean.
Manual: Admin loads; both tabs render; columns sort on click (arrow flips); create prompt → dialog **closes** and toast fires; edit prompt → toggling "Active" then Update actually persists the change (the checkbox fix); empty required fields show red error text.

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "v2 ui: split admin into tab components, sortable tables, fix dialog close + isActive binding"
```

---

### Task 4: Speaking-prompt CRUD (`SpeakingPromptForm` + `SpeakingPromptsTab` + third tab)

**Files:**
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/SpeakingPromptForm.tsx`
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/SpeakingPromptsTab.tsx`
- Modify: `frontend/ielts-ai-evaluator-frontend/src/pages/Admin.tsx` (add tab)

**Interfaces:**
- Consumes: `SpeakingPrompt`, `SpeakingPromptUpsertRequest`, `SpeakingPart` from `@/types/Speaking` (all exist); `useSortedRows`, `SortableHead`, form/tab patterns from Task 3.
- Produces: `SpeakingPromptForm` props `{ prompt?: SpeakingPrompt; onSubmit: (d: SpeakingPromptUpsertRequest) => void; onCancel: () => void }`; `SpeakingPromptsTab` (no props).

- [ ] **Step 1: Create `SpeakingPromptForm.tsx`**

```tsx
import { useForm } from "react-hook-form";
import {
  SpeakingPart,
  SpeakingPrompt,
  SpeakingPromptUpsertRequest,
} from "@/types/Speaking";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpeakingPromptFormProps {
  prompt?: SpeakingPrompt;
  onSubmit: (data: SpeakingPromptUpsertRequest) => void;
  onCancel: () => void;
}

const FieldError = ({ show, label }: { show: boolean; label: string }) =>
  show ? <p className="text-sm text-destructive mt-1">{label} is required.</p> : null;

export const SpeakingPromptForm = ({ prompt, onSubmit, onCancel }: SpeakingPromptFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SpeakingPromptUpsertRequest>({
    defaultValues: prompt ?? {
      topic: "",
      description: "",
      preview: "",
      part: "Part2",
      questionText: "",
      cuepoints: "",
      duration: 120,
      level: "Academic",
      isActive: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input {...register("topic", { required: true })} placeholder="Enter topic" />
          <FieldError show={!!errors.topic} label="Topic" />
        </div>
        <div>
          <Label htmlFor="part">Part</Label>
          <Select
            value={watch("part")}
            onValueChange={(value) => setValue("part", value as SpeakingPart)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select part" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Part1">Part 1 — Interview</SelectItem>
              <SelectItem value="Part2">Part 2 — Cue Card</SelectItem>
              <SelectItem value="Part3">Part 3 — Discussion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          {...register("description", { required: true })}
          placeholder="Enter description"
        />
        <FieldError show={!!errors.description} label="Description" />
      </div>

      <div>
        <Label htmlFor="preview">Preview</Label>
        <Input {...register("preview", { required: true })} placeholder="Enter preview text" />
        <FieldError show={!!errors.preview} label="Preview" />
      </div>

      <div>
        <Label htmlFor="questionText">Question / Cue Card Text</Label>
        <Textarea
          {...register("questionText", { required: true })}
          placeholder="Enter the main question or cue card text"
        />
        <FieldError show={!!errors.questionText} label="Question text" />
      </div>

      <div>
        <Label htmlFor="cuepoints">Cue Points (optional, one per line — mainly Part 2)</Label>
        <Textarea
          {...register("cuepoints")}
          placeholder={"what it is\nwhy it matters\nhow you use it"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            type="number"
            {...register("duration", { required: true, valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="level">Level</Label>
          <Select
            value={watch("level")}
            onValueChange={(value) => setValue("level", value as "Academic" | "General")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="speakingIsActive"
          checked={watch("isActive")}
          onCheckedChange={(v) => setValue("isActive", v === true)}
        />
        <Label htmlFor="speakingIsActive">Active (visible to students)</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{prompt ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Create `SpeakingPromptsTab.tsx`**

Mirror of `WritingPromptsTab` with speaking fields. Complete file:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Edit, Plus } from "lucide-react";
import { SpeakingPrompt, SpeakingPromptUpsertRequest } from "@/types/Speaking";
import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import { SpeakingPromptForm } from "./SpeakingPromptForm";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const partLabel = (part: string) => part.replace("Part", "Part ");

export const SpeakingPromptsTab = () => {
  // undefined = dialog closed, null = creating, object = editing
  const [editing, setEditing] = useState<SpeakingPrompt | null | undefined>(undefined);

  const {
    data: prompts,
    isLoading,
    error,
    refetch,
    mutate,
  } = useApi<SpeakingPrompt[]>("/api/speaking-prompts?includeInactive=true");

  const { sorted, key, dir, toggle } = useSortedRows(prompts ?? [], "topic");

  const handleUpsert = async (data: SpeakingPromptUpsertRequest) => {
    await mutate({
      url: "/api/speaking-prompts",
      method: "POST",
      data,
      onSuccess: () => {
        toast.success(
          data.speakingPromptId ? "Speaking prompt updated" : "Speaking prompt created",
        );
        setEditing(undefined);
        refetch();
      },
      onError: (err) =>
        toast.error("Failed to save speaking prompt", { description: err.message }),
    });
  };

  if (error) {
    return (
      <ErrorPage
        title="Failed to load speaking prompts"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton columns={6} rows={5} />
        </CardContent>
      </Card>
    );
  }

  const sortable: { label: string; k: keyof SpeakingPrompt & string }[] = [
    { label: "Topic", k: "topic" },
    { label: "Part", k: "part" },
    { label: "Level", k: "level" },
    { label: "Duration", k: "duration" },
    { label: "Status", k: "isActive" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Speaking Tasks</CardTitle>
            <CardDescription>Manage IELTS speaking prompts and cue cards</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setEditing(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Speaking Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {sortable.map((c) => (
                <SortableHead
                  key={c.k}
                  label={c.label}
                  active={key === c.k}
                  dir={dir}
                  onClick={() => toggle(c.k)}
                />
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((prompt) => (
              <TableRow key={prompt.speakingPromptId}>
                <TableCell className="font-medium">{prompt.topic}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{partLabel(prompt.part)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{prompt.level}</Badge>
                </TableCell>
                <TableCell>{prompt.duration}s</TableCell>
                <TableCell>
                  <Badge variant={prompt.isActive ? "default" : "outline"}>
                    {prompt.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(prompt)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No speaking tasks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
      >
        <DialogContent className="w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Speaking Task" : "Create Speaking Task"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this speaking prompt"
                : "Add a new speaking prompt for IELTS practice"}
            </DialogDescription>
          </DialogHeader>
          <SpeakingPromptForm
            prompt={editing ?? undefined}
            onSubmit={handleUpsert}
            onCancel={() => setEditing(undefined)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
```

**Note:** verified — `GET /api/speaking-prompts?includeInactive=true` is supported and admin-gated (`Functions/SpeakingPrompt.cs:26-30`), same contract as writing prompts.

- [ ] **Step 3: Add the tab to `Admin.tsx`**

Change `grid-cols-2` → `grid-cols-3` on `TabsList`, add imports (`Mic` from lucide, `SpeakingPromptsTab`), and insert between Writing and Users:

```tsx
          <TabsTrigger value="speaking" className={triggerClass}>
            <Mic className="h-4 w-4 mr-2" />
            Speaking Tasks
          </TabsTrigger>
```

```tsx
        <TabsContent value="speaking" className="space-y-4">
          <SpeakingPromptsTab />
        </TabsContent>
```

- [ ] **Step 4: Verify**

Run: `npm run build` — Expected: clean.
Manual: Speaking Tasks tab lists the seeded prompts (active and inactive); create a Part 2 prompt with cue points → appears in list and in the student Speaking browser; edit it, flip Active off → shows Inactive badge; validation errors render.

- [ ] **Step 5: Commit**

```bash
git add -A frontend
git commit -m "v2 ui: admin speaking-prompt crud tab"
```

---

### Task 5: Per-user recent evaluations dialog on the Users tab

**Files:**
- Create: `frontend/ielts-ai-evaluator-frontend/src/components/admin/RecentEvaluationsDialog.tsx`
- Modify: `frontend/ielts-ai-evaluator-frontend/src/components/admin/UsersTab.tsx`

**Interfaces:**
- Consumes: `GET /api/manage/recent-evaluations?userId={guid}` → `DashboardRecentItem[]` (same DTO as the dashboard's `recentItems`; type already in `@/types/dashboard`). `User` from `@/types/User`.
- Produces: `RecentEvaluationsDialog` props `{ user: User; onClose: () => void }`.

- [ ] **Step 1: Create `RecentEvaluationsDialog.tsx`**

Read-only — no links into feedback pages (ownership checks 403 an admin opening another user's feedback).

```tsx
import { useApi } from "@/hooks/use-api";
import { getRelativeTime } from "@/lib/utils";
import { DashboardRecentItem } from "@/types/dashboard";
import { User } from "@/types/User";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentEvaluationsDialogProps {
  user: User;
  onClose: () => void;
}

const taskLabel = (t: string) => t.replace("Task", "Task ").replace("Part", "Part ");

export const RecentEvaluationsDialog = ({ user, onClose }: RecentEvaluationsDialogProps) => {
  const { data: items, isLoading, error } = useApi<DashboardRecentItem[]>(
    `/api/manage/recent-evaluations?userId=${user.userId}`,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle>Recent evaluations — {user.fullName || user.email}</DialogTitle>
          <DialogDescription>This user's 10 most recent submissions.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <TableSkeleton columns={4} rows={3} />
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {item.type === "speaking" ? "Speaking" : "Writing"}{" "}
                      {taskLabel(item.taskType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.topic}</TableCell>
                  <TableCell>{item.overallBand.toFixed(1)}</TableCell>
                  <TableCell>{getRelativeTime(item.createdAt)}</TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No evaluations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Wire into `UsersTab.tsx`**

Add state + an Actions column:

```tsx
import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { RecentEvaluationsDialog } from "./RecentEvaluationsDialog";
```

Inside the component: `const [viewing, setViewing] = useState<User | null>(null);`

In the header row, after the sortable heads: `<TableHead>Actions</TableHead>`. In each body row:

```tsx
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="View recent evaluations"
                    onClick={() => setViewing(user)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TableCell>
```

Bump the empty-state `colSpan` from 5 to 6. Before the closing `</Card>`:

```tsx
      {viewing && (
        <RecentEvaluationsDialog user={viewing} onClose={() => setViewing(null)} />
      )}
```

- [ ] **Step 3: Verify**

Run: `npm run build` — Expected: clean.
Manual: Users tab → history icon opens the dialog with that user's evaluations (or the empty state); loading skeleton shows briefly; closing works via X/overlay.

- [ ] **Step 4: Commit**

```bash
git add -A frontend
git commit -m "v2 ui: admin per-user recent evaluations dialog"
```

---

### Task 6: Premium pricing page, delete `ComingSoon`

**Files:**
- Rewrite: `frontend/ielts-ai-evaluator-frontend/src/pages/Premium.tsx`
- Delete: `frontend/ielts-ai-evaluator-frontend/src/pages/ComingSoon.tsx` (Premium was its only consumer — verify with a grep before deleting)

**Interfaces:**
- Consumes: `GET /api/me` → `User` (for the current-plan badge). Free-plan quota facts: **10 writing + 10 speaking evaluations per day** (backend quota gate).

- [ ] **Step 1: Rewrite `Premium.tsx`**

```tsx
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { User } from "@/types/User";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FREE_FEATURES = [
  "10 writing evaluations per day",
  "10 speaking sessions per day",
  "Full band-score feedback on every submission",
  "Progress dashboard and feedback history",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited writing evaluations",
  "Unlimited speaking sessions",
  "Priority access to new features",
];

const Premium = () => {
  // Badge only — the page renders fine while (or if) this is loading/failed.
  const { data: profile } = useApi<User>("/api/me");
  const plan = profile?.plan;

  const FeatureList = ({ features }: { features: string[] }) => (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-card-foreground">
          <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          {f}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Plans</h1>
        <p className="text-foreground font-medium text-lg">
          Practice free every day, or go unlimited with Premium.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Sparkles className="h-5 w-5 text-secondary" />
                Free
              </CardTitle>
              {plan === "Free" && <Badge variant="secondary">Your plan</Badge>}
            </div>
            <CardDescription>Everything you need to start practicing</CardDescription>
            <p className="text-3xl font-bold text-card-foreground pt-2">
              $0<span className="text-sm font-medium text-muted-foreground"> / forever</span>
            </p>
          </CardHeader>
          <CardContent>
            <FeatureList features={FREE_FEATURES} />
          </CardContent>
        </Card>

        <Card className="border-2 border-primary shadow-lg bg-card backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Crown className="h-5 w-5 text-tip" />
                Premium
              </CardTitle>
              {plan != null && plan !== "Free" && <Badge>Your plan</Badge>}
            </div>
            <CardDescription>Unlimited practice for serious preparation</CardDescription>
            <p className="text-3xl font-bold text-card-foreground pt-2">
              Coming soon
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <FeatureList features={PREMIUM_FEATURES} />
            <Button
              className="w-full"
              onClick={() =>
                toast.info("Payments are coming soon", {
                  description: "Premium upgrades aren't available yet — enjoy Free in the meantime!",
                })
              }
            >
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Premium;
```

- [ ] **Step 2: Delete `ComingSoon.tsx`**

First confirm Premium was the only consumer:

Run: `grep -rn "ComingSoon" frontend/ielts-ai-evaluator-frontend/src`
Expected: no matches outside `pages/ComingSoon.tsx` itself. Then delete the file.

- [ ] **Step 3: Verify**

Run: `npm run build` — Expected: clean (this also proves no dangling `ComingSoon` import).
Manual: `/premium` shows both cards; "Your plan" badge on the correct card; CTA fires the toast; check light and dark.

- [ ] **Step 4: Commit**

```bash
git add -A frontend
git commit -m "v2 ui: premium pricing page, drop ComingSoon placeholder"
```

---

### Task 7: `DEPLOYMENT.md` + full verification pass

**Files:**
- Create: `docs/DEPLOYMENT.md`

**Interfaces:** none — docs + verification only.

- [ ] **Step 1: Write `docs/DEPLOYMENT.md`**

```markdown
# Deployment Checklist — When IELTS?

Prep reference for the first production deployment. Nothing here provisions anything.

## ⚠️ Before anything else: rotate exposed keys

The Gemini API key and Firebase service-account private key were committed to
history at one point and must be treated as compromised. Rotate both in their
consoles and use only the new values below. Never put real values in tracked files.

## Backend — Azure Functions App Settings

| Setting | Purpose | Notes |
|---|---|---|
| `DbConnectionString` | SQL database | production connection string |
| `GeminiApiKey` | Gemini evaluation calls | **rotated** key |
| `FIREBASE_PROJECT_ID` | Firebase Admin token verification | |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin credentials | **rotated** service-account JSON |
| `AzureSpeechKey` | Azure Speech (TTS/STT/pronunciation) | F0 tier works; app degrades to typed mode without it |
| `AzureSpeechRegion` | Azure Speech region | e.g. `southeastasia` |

**CORS:** enforced by the Functions host, not the worker. Locally it's
`Host.CORS` in `local.settings.json`; in production set the allowed origin to
the deployed frontend URL in the Function App's portal CORS settings
(with credentials enabled). An in-worker `AddCors` policy is never applied.

## Frontend — Vite build-time env (`.env.production`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | deployed Functions base URL |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Firebase web app config |

Firebase web config values are public identifiers, not secrets — but the API
key above (`GeminiApiKey`) and the service-account JSON are secrets and belong
only in App Settings.

## Build & verify

```bash
# backend (from backend/)
dotnet test                      # expect all green
# frontend (from frontend/ielts-ai-evaluator-frontend/)
npm run build                    # tsc -b + vite build, expect clean
```

## Run locally

```bash
# backend (from backend/IELTS.AI.Evaluator.Functions/)
func start                       # :7071
# frontend (from frontend/ielts-ai-evaluator-frontend/)
npm run dev                      # :5173
```

## Post-deploy smoke test

1. Register/login → dashboard loads (band trend renders with data).
2. Submit a writing task → feedback page.
3. Run a speaking session (mic if Azure Speech configured, typed fallback otherwise) → feedback with pronunciation card.
4. Admin account → all three admin tabs load; prompt CRUD works.
5. Unauthenticated API call returns 401; 11th free-tier evaluation of the day returns 429.
```

- [ ] **Step 2: Full verification**

Run: `dotnet test` (from `backend`) — Expected: 78/78 pass.
Run: `npm run build` (from `frontend/ielts-ai-evaluator-frontend`) — Expected: clean.
Manual walkthrough (light **and** dark): Dashboard (chart, tiles, recent), Speaking flow, Writing flow, Feedback History, Profile (spacing/contrast consistent with new pages — polish only if something is visibly broken), Premium, Admin (three tabs, both CRUD dialogs, per-user history dialog), 404 route.

- [ ] **Step 3: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: production deployment checklist"
```
