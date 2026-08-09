import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Clock, FileText } from "lucide-react";
import { useState } from "react";
import WritingPrompt from "@/types/WritingPrompt";
import { useApi } from "@/hooks/use-api";
import { WritingSkeleton } from "@/components/skeleton/WritingSkeleton";
import { useNavigate } from "react-router";
import ErrorPage from "./ErrorPage";

type TaskFilter = "all" | "Task1" | "Task2";
type LevelFilter = "all" | "Academic" | "General";

const TASK_LABEL: Record<"Task1" | "Task2", string> = {
  Task1: "Task 1",
  Task2: "Task 2",
};

const Writing = () => {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");

  const navigate = useNavigate();

  const {
    data: writingPrompts,
    isLoading: isLoadingPrompts,
    error,
    refetch,
  } = useApi<WritingPrompt[]>("/api/writing-prompts");

  if (isLoadingPrompts) {
    return <WritingSkeleton />;
  }

  if (error) {
    return (
      <ErrorPage
        title="Failed to load writing topics"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  const prompts = writingPrompts ?? [];
  const topics = prompts.filter(
    (prompt) =>
      (taskFilter === "all" || prompt.taskType === taskFilter) &&
      (levelFilter === "all" || prompt.level === levelFilter)
  );

  return (
    <div className="space-y-6">
      {/* The layout header owns the h1 ("Writing"). */}
      <p className="text-muted-foreground">
        Browse writing prompts and start a timed practice session.
      </p>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={taskFilter}
          onValueChange={(value) => setTaskFilter(value as TaskFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Task1">Task 1</TabsTrigger>
            <TabsTrigger value="Task2">Task 2</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={levelFilter}
          onValueChange={(value) => setLevelFilter(value as LevelFilter)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="Academic">Academic</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topic grid */}
      {topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-foreground">No topics yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an admin to add writing prompts.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <Card
              key={topic.writingPromptId}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate(`/writing/${topic.taskType}/${topic.writingPromptId}`)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(
                    `/writing/${topic.taskType}/${topic.writingPromptId}`
                  );
                }
              }}
              className="cursor-pointer gap-3 p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <h3 className="font-semibold text-card-foreground">
                {topic.topic}
              </h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {topic.preview}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
                <Badge variant="secondary">{TASK_LABEL[topic.taskType]}</Badge>
                <Badge variant="secondary">{topic.level}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {topic.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {topic.minimumWords}+ words
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Writing;
