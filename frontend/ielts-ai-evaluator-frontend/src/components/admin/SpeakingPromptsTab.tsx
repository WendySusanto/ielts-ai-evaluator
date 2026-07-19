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
  } = useApi<SpeakingPrompt[]>("/api/speaking-prompts?includeInactive=true");

  // Separate hook instance for the upsert: mutate overwrites its hook's data
  // with the POST response (a single prompt), which would poison the list
  // that useSortedRows spreads.
  const { mutate } = useApi<SpeakingPrompt>("", { skipInitialFetch: true });

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
