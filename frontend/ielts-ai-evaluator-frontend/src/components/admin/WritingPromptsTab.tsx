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
  } = useApi<WritingPrompt[]>("/api/writing-prompts?includeInactive=true");

  // Separate hook instance for the upsert: mutate overwrites its hook's data
  // with the POST response (a single prompt), which would poison the list
  // that useSortedRows spreads.
  const { mutate } = useApi<WritingPrompt>("", { skipInitialFetch: true });

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
