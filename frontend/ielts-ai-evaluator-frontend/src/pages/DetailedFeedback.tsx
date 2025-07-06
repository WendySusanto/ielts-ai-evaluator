import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  BookOpen,
  MessageSquare,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const DetailedFeedback = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const feedbackData = {
    overallBand: 6.5,
    criteria: {
      taskResponse: {
        band: 6.5,
        generalFeedback:
          "Good attempt at addressing the question with relevant ideas, though some aspects could be developed more thoroughly.",
        subScores: {
          addressAllPartsOfQuestion: {
            score: 7,
            comment:
              "The response mostly addresses all parts, but minor elements are underdeveloped.",
          },
          clearOpinionIfRequired: {
            score: 6,
            comment:
              "The opinion is stated but not consistently maintained throughout.",
          },
          wellDevelopedIdeas: {
            score: 6,
            comment:
              "Ideas are somewhat developed, but lack depth in explanation and argumentation.",
          },
          examplesAndSupport: {
            score: 7,
            comment:
              "Examples are present but occasionally generic or not clearly linked to the argument.",
          },
        },
        issues: [
          {
            text: "I think the government should take care of the environment.",
            comment:
              "This opinion is too general and not elaborated with a clear reason or example.",
          },
          {
            text: "For example, pollution is bad.",
            comment:
              "Vague example. Be more specific about how pollution impacts people or ecosystems.",
          },
        ],
      },
      coherenceCohesion: {
        band: 6.0,
        generalFeedback:
          "The essay shows reasonable organization but could benefit from stronger transitions and clearer paragraph structure.",
        subScores: {
          logicalFlowOfIdeas: {
            score: 6,
            comment:
              "The structure is mostly logical but lacks clear transitions between some paragraphs.",
          },
          paragraphing: {
            score: 6,
            comment:
              "Paragraphing is used but sometimes contains multiple ideas or lacks topic sentences.",
          },
          cohesiveDevices: {
            score: 5,
            comment:
              "Basic cohesive devices are overused and mechanical in places.",
          },
          referencingClarity: {
            score: 7,
            comment:
              "Referencing is mostly clear, but could be improved for clarity in pronoun use.",
          },
        },
        issues: [
          {
            text: "First of all, secondly, thirdly, finally...",
            comment: "Avoid formulaic listing. Use more natural transitions.",
          },
          {
            text: "This shows the problem.",
            comment:
              "What is 'this'? Clarify the reference to maintain coherence.",
          },
        ],
      },
      lexicalResource: {
        band: 6.0,
        generalFeedback:
          "Vocabulary shows adequate range but needs improvement in precision and collocation usage.",
        subScores: {
          vocabularyRange: {
            score: 6,
            comment:
              "Shows some range, but repetition of common words like 'important' weakens impact.",
          },
          wordChoiceAccuracy: {
            score: 6,
            comment: "Some imprecise word choices reduce clarity.",
          },
          collocations: {
            score: 5,
            comment:
              "Occasional awkward combinations indicate a need to improve collocation usage.",
          },
          spelling: {
            score: 7,
            comment: "Spelling is generally accurate with minor issues.",
          },
        },
        issues: [
          {
            text: "This is a big problem for the nature.",
            comment: "Use 'environment' instead of 'the nature'.",
          },
          {
            text: "Very good solution can be done.",
            comment:
              "Awkward phrasing; consider 'A highly effective solution could be implemented.'",
          },
        ],
      },
      grammaticalRangeAccuracy: {
        band: 6.0,
        generalFeedback:
          "Grammar shows reasonable control but frequent minor errors affect overall accuracy.",
        subScores: {
          sentenceVariety: {
            score: 6,
            comment:
              "Some variety, but repetitive sentence patterns reduce effectiveness.",
          },
          tenseAccuracy: {
            score: 6,
            comment: "Occasional tense errors affect clarity.",
          },
          subjectVerbAgreement: {
            score: 7,
            comment: "Mostly accurate with a few minor errors.",
          },
          articleAndPrepositionUse: {
            score: 5,
            comment:
              "Frequent misuse of articles and prepositions impacts grammatical accuracy.",
          },
          errorDensity: {
            score: 6,
            comment: "Frequent minor errors but do not obscure meaning.",
          },
        },
        issues: [
          {
            text: "The people is worrying about climate change.",
            comment: "Incorrect subject-verb agreement. Use 'people are'.",
          },
          {
            text: "Government should take a action.",
            comment: "Incorrect article usage. It should be 'an action'.",
          },
        ],
      },
    },
  };

  const criteriaLabels = {
    taskResponse: "Task Response",
    coherenceCohesion: "Coherence & Cohesion",
    lexicalResource: "Lexical Resource",
    grammaticalRangeAccuracy: "Grammar & Accuracy",
  };

  const criteriaColors = {
    taskResponse: "red",
    coherenceCohesion: "orange",
    lexicalResource: "purple",
    grammaticalRangeAccuracy: "blue",
  };

  const getScoreColor = (score: number) => {
    if (score >= 7.5) return "text-green-600 dark:text-green-400";
    if (score >= 6.5) return "text-blue-600 dark:text-blue-400";
    if (score >= 5.5) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7.5) return "default";
    if (score >= 6.5) return "secondary";
    return "outline";
  };

  const getHighlightColor = (criteriaKey: string) => {
    const colors = {
      taskResponse:
        "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600",
      coherenceCohesion:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-600",
      lexicalResource:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600",
      grammaticalRangeAccuracy:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600",
    };
    return (
      colors[criteriaKey as keyof typeof colors] ||
      "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
    );
  };

  const shouldShowIssue = (criteriaKey: string) => {
    return selectedFilter === "all" || selectedFilter === criteriaKey;
  };

  const sampleEssay = `Climate change is one of the most pressing issues facing our world today. I think the government should take care of the environment.

First of all, secondly, thirdly, finally... these are the main points I want to discuss.

For example, pollution is bad. This is a big problem for the nature.

The people is worrying about climate change. Government should take a action.

Very good solution can be done.

This shows the problem. In conclusion, we must work together to solve environmental issues.`;

  const renderHighlightedText = () => {
    let highlightedText = sampleEssay;

    // Apply highlights based on selected filter
    Object.entries(feedbackData.criteria).forEach(([criteriaKey, criteria]) => {
      if (shouldShowIssue(criteriaKey)) {
        criteria.issues.forEach((issue, index) => {
          const issueText = issue.text;
          const regex = new RegExp(
            `(${issueText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
            "gi"
          );
          const colorClass = getHighlightColor(criteriaKey);
          highlightedText = highlightedText.replace(
            regex,
            `<span class="${colorClass} px-1 py-0.5 rounded cursor-pointer border-b-2" data-issue="${index}" data-criteria="${criteriaKey}">$1</span>`
          );
        });
      }
    });

    return (
      <div
        dangerouslySetInnerHTML={{
          __html: highlightedText.replace(/\n/g, "<br />"),
        }}
      />
    );
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/feedback")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Detailed Feedback
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Writing Task 2 - Environmental Issues
              </p>
            </div>
          </div>
          <Badge
            variant={getScoreBadgeVariant(feedbackData.overallBand)}
            className="text-lg px-4 py-2"
          >
            <Award className="h-4 w-4 mr-2" />
            Band {feedbackData.overallBand}
          </Badge>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filter by Criteria
            </CardTitle>
            <CardDescription>
              Select a specific criteria to highlight only those errors, or view
              all errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Errors</TabsTrigger>
                <TabsTrigger value="taskResponse" className="text-red-600">
                  Task Response
                </TabsTrigger>
                <TabsTrigger
                  value="coherenceCohesion"
                  className="text-orange-600"
                >
                  Coherence
                </TabsTrigger>
                <TabsTrigger
                  value="lexicalResource"
                  className="text-purple-600"
                >
                  Vocabulary
                </TabsTrigger>
                <TabsTrigger
                  value="grammaticalRangeAccuracy"
                  className="text-blue-600"
                >
                  Grammar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Overall Score Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <TrendingUp className="h-5 w-5" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.entries(feedbackData.criteria).map(([key, criteria]) => (
                <div key={key} className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {criteriaLabels[key as keyof typeof criteriaLabels]}
                  </p>
                  <p
                    className={`text-2xl font-bold ${getScoreColor(
                      criteria.band
                    )}`}
                  >
                    {criteria.band}
                  </p>
                  <Progress
                    value={(criteria.band / 9) * 100}
                    className="h-2 mt-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sample Essay with Filtered Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Your Essay with Highlighted Issues
              {selectedFilter !== "all" && (
                <Badge variant="outline" className="ml-2">
                  Showing:{" "}
                  {
                    criteriaLabels[
                      selectedFilter as keyof typeof criteriaLabels
                    ]
                  }
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Hover over highlighted text to see specific feedback for each
              error
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 leading-relaxed">
              {renderHighlightedText()}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Criteria Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(feedbackData.criteria).map(([key, criteria]) => (
            <Card
              key={key}
              className={
                selectedFilter !== "all" && selectedFilter !== key
                  ? "opacity-50"
                  : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {criteriaLabels[key as keyof typeof criteriaLabels]}
                  </span>
                  <Badge variant={getScoreBadgeVariant(criteria.band)}>
                    Band {criteria.band}
                  </Badge>
                </CardTitle>
                {criteria.generalFeedback && (
                  <CardDescription>{criteria.generalFeedback}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sub-scores */}
                <div className="space-y-3">
                  {Object.entries(criteria.subScores).map(
                    ([subKey, subScore]) => (
                      <div key={subKey} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">
                            {subKey.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span
                            className={`font-semibold ${getScoreColor(
                              subScore.score
                            )}`}
                          >
                            {subScore.score}/9
                          </span>
                        </div>
                        <Progress
                          value={(subScore.score / 9) * 100}
                          className="h-1"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {subScore.comment}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {/* Issues */}
                {criteria.issues.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Specific Issues Found
                    </h4>
                    <div className="space-y-2">
                      {criteria.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-3 ${getHighlightColor(
                            key
                          )} border-opacity-50`}
                        >
                          <p className="text-sm font-medium mb-1">
                            "{issue.text}"
                          </p>
                          <p className="text-xs opacity-80">{issue.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/feedback")} variant="outline">
                Back to History
              </Button>
              <Button onClick={() => navigate("/writing")}>
                Practice More Writing
              </Button>
              <Button variant="secondary">Download Report</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default DetailedFeedback;
