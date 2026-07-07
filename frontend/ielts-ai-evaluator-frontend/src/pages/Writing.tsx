import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Clock, PenTool, BarChart3, FileText } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import WritingPrompt from "@/types/WritingPrompt";
import { useApi } from "@/hooks/use-api";
import { WritingSkeleton } from "@/components/skeleton/WritingSkeleton";
import { useNavigate } from "react-router";

const Writing = () => {
  const [selectedTask, setSelectedTask] = useState<"task1" | "task2">("task1");

  const navigate = useNavigate();

  const { data: writingPrompts = [], isLoading: isLoadingPrompts } = useApi<
    WritingPrompt[]
  >("/api/writing-prompt");

  if (isLoadingPrompts) {
    return <WritingSkeleton />;
  }

  const currentTopics = writingPrompts
    ? selectedTask === "task1" && writingPrompts
      ? (writingPrompts as WritingPrompt[]).filter(
          (prompt) => prompt.taskType == "Task1"
        )
      : (writingPrompts as WritingPrompt[]).filter(
          (prompt) => prompt.taskType == "Task2"
        )
    : [];

  return (
    <div className={`space-y-6`}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Writing Practice
        </h1>
        <p className="text-foreground font-medium text-lg">
          Improve your IELTS writing skills with structured practice sessions
        </p>
      </div>

      {/* Task Selection */}
      <Tabs
        value={selectedTask}
        onValueChange={(value) => setSelectedTask(value as "task1" | "task2")}
      >
        <TabsList className="grid w-full grid-cols-2  dark:bg-card border border-gray-200 dark:border-gray-700 p-1 rounded-sm h-10 ">
          <TabsTrigger
            value="task1"
            className="cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Writing Task 1
          </TabsTrigger>
          <TabsTrigger
            value="task2"
            className="cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Writing Task 2
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task1" className="mt-6">
          <div className="mb-6 p-4 rounded-lg border bg-secondary border-border">
            <h3 className="font-semibold text-secondary-foreground mb-2">
              Task 1 - Academic Writing
            </h3>
            <p className="text-secondary-foreground text-sm">
              Describe, summarize or explain information presented in graphs,
              charts, tables or diagrams. Minimum 150 words, recommended time:
              20 minutes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="task2" className="mt-6">
          <div className="mb-6 p-4 bg-secondary rounded-lg border border-border">
            <h3 className="font-semibold text-secondary-foreground mb-2">
              Task 2 - Essay Writing
            </h3>
            <p className="text-secondary-foreground text-sm">
              Write an essay responding to a point of view, argument or problem.
              Minimum 250 words, recommended time: 40 minutes.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentTopics.map((topic) => (
          <Card
            key={topic.writingPromptId}
            className="border-0 shadow-lg bg-card backdrop-blur-sm hover:shadow-xl transition-all duration-300 "
          >
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  {topic.topic}
                </CardTitle>
                <div>
                  <Badge className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-2 py-1 mr-2">
                    {topic.level}
                  </Badge>
                </div>
              </div>
              <p className="text-foreground font-medium text-sm">
                {topic.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {topic.duration} min
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {topic.minimumWords} words
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Preview:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  {topic.preview}
                </p>
              </div>

              <Button
                onClick={() =>
                  navigate(
                    `/writing/${topic.taskType}/${topic.writingPromptId}`
                  )
                }
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Start Writing
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Writing;
