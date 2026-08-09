import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Mic } from "lucide-react";
import { useState } from "react";
import type { SpeakingPart, SpeakingPrompt } from "@/types/Speaking";
import { useApi } from "@/hooks/use-api";
import { SpeakingSkeleton } from "@/components/skeleton/SpeakingSkeleton";
import { useNavigate } from "react-router";
import ErrorPage from "./ErrorPage";

type PartFilter = "all" | SpeakingPart;

const PART_LABEL: Record<SpeakingPart, string> = {
  Part1: "Part 1",
  Part2: "Part 2",
  Part3: "Part 3",
};

const Speaking = () => {
  const [partFilter, setPartFilter] = useState<PartFilter>("all");

  const navigate = useNavigate();

  const {
    data: speakingPrompts,
    isLoading: isLoadingPrompts,
    error,
    refetch,
  } = useApi<SpeakingPrompt[]>("/api/speaking-prompts");

  if (isLoadingPrompts) {
    return <SpeakingSkeleton />;
  }

  if (error) {
    return (
      <ErrorPage
        title="Failed to load speaking topics"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  const prompts = speakingPrompts ?? [];
  const topics = prompts.filter(
    (prompt) => partFilter === "all" || prompt.part === partFilter
  );

  return (
    <div className="space-y-6">
      {/* The layout header owns the h1 ("Speaking"). */}
      <p className="text-muted-foreground">
        Browse speaking topics and start a practice session with instant
        feedback.
      </p>

      {/* Filter row */}
      <Tabs
        value={partFilter}
        onValueChange={(value) => setPartFilter(value as PartFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Part1">Part 1</TabsTrigger>
          <TabsTrigger value="Part2">Part 2</TabsTrigger>
          <TabsTrigger value="Part3">Part 3</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Topic grid */}
      {topics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mic className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-foreground">No topics yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an admin to add speaking prompts.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <Card
              key={topic.speakingPromptId}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate(`/speaking/${topic.part}/${topic.speakingPromptId}`)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(
                    `/speaking/${topic.part}/${topic.speakingPromptId}`
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
                <Badge variant="secondary">{PART_LABEL[topic.part]}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(topic.duration / 60)} min
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Speaking;
