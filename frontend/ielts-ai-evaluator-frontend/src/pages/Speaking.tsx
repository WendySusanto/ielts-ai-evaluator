import { WritingSkeleton } from "@/components/skeleton/WritingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetch } from "@/hooks/use-fetch";
import { GRADIENT_INDIGO, GRADIENT_INDIGO_BUTTON } from "@/styles/gradients";
import ApiResponse from "@/types/ApiResponse";
import type { SpeakingPart, SpeakingPrompt } from "@/types/Speaking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Clock, MessageCircle, MessagesSquare, Mic, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const PART_META: Record<
  SpeakingPart,
  { label: string; title: string; blurb: string; icon: typeof Mic }
> = {
  Part1: {
    label: "Part 1",
    title: "Introduction & Interview",
    blurb:
      "Answer familiar questions about yourself, your home, work, studies and interests. Speak for 4-5 minutes in short, natural responses.",
    icon: User,
  },
  Part2: {
    label: "Part 2",
    title: "Individual Long Turn (Cue Card)",
    blurb:
      "You get a cue card and 1 minute to prepare, then speak for 1-2 minutes without interruption. Cover every bullet point on the card.",
    icon: MessageCircle,
  },
  Part3: {
    label: "Part 3",
    title: "Two-way Discussion",
    blurb:
      "Discuss more abstract ideas connected to the Part 2 topic. Give developed, well-reasoned answers for 4-5 minutes.",
    icon: MessagesSquare,
  },
};

const Speaking = () => {
  const [selectedPart, setSelectedPart] = useState<SpeakingPart>("Part1");
  const navigate = useNavigate();

  const { data: speakingPrompts = [], isLoading } = useFetch<
    ApiResponse<SpeakingPrompt>
  >("/api/speaking-prompt");

  if (isLoading) {
    return <WritingSkeleton />;
  }

  const prompts = (speakingPrompts as SpeakingPrompt[]) ?? [];
  const currentTopics = prompts.filter((p) => p.part === selectedPart);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1
          className={`text-3xl font-bold ${GRADIENT_INDIGO} bg-clip-text text-transparent mb-2`}
        >
          Speaking Practice 🎤
        </h1>
        <p className="text-muted-foreground-bold text-lg">
          Practice each part of the IELTS Speaking test and get instant
          AI-powered feedback on fluency, vocabulary, grammar and pronunciation.
        </p>
      </div>

      {/* Part selection */}
      <Tabs
        value={selectedPart}
        onValueChange={(value) => setSelectedPart(value as SpeakingPart)}
      >
        <TabsList className="grid w-full grid-cols-3 dark:bg-card border border-gray-200 dark:border-gray-700 p-1 rounded-md h-11">
          {(Object.keys(PART_META) as SpeakingPart[]).map((part) => {
            const Icon = PART_META[part].icon;
            return (
              <TabsTrigger
                key={part}
                value={part}
                className="cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center gap-2 transition-colors duration-200"
              >
                <Icon className="h-4 w-4" />
                {PART_META[part].label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(PART_META) as SpeakingPart[]).map((part) => (
          <TabsContent key={part} value={part} className="mt-6">
            <div className="mb-6 p-4 rounded-lg border bg-card-purple-light dark:bg-card-purple-light/30 border-card-purple-light-border">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                {PART_META[part].label} — {PART_META[part].title}
              </h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                {PART_META[part].blurb}
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Topics grid */}
      {currentTopics.length === 0 ? (
        <Card className="border-0 shadow-lg bg-card">
          <CardContent className="py-12 text-center">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground-bold">
              No {PART_META[selectedPart].label} topics available yet. Check
              back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentTopics.map((topic) => (
            <Card
              key={topic.speakingPromptId}
              className="border-0 shadow-lg bg-card hover:shadow-xl transition-all duration-300"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg font-semibold text-card-foreground">
                    {topic.topic}
                  </CardTitle>
                  <Badge className="text-xs font-medium bg-secondary text-white rounded-full px-2 py-1">
                    {topic.level}
                  </Badge>
                </div>
                <p className="text-muted-foreground-bold text-sm">
                  {topic.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.round(topic.duration / 60)} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Mic className="h-4 w-4" />
                    {PART_META[selectedPart].label}
                  </div>
                </div>

                <div className="p-3 bg-card-background-light rounded-lg border border-card-border">
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
                      `/speaking/${topic.part}/${topic.speakingPromptId}`,
                    )
                  }
                  className={`w-full ${GRADIENT_INDIGO_BUTTON}`}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Speaking
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Speaking;
