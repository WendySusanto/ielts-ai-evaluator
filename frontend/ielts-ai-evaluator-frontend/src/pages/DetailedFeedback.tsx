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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  BookOpen,
  MessageSquare,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/use-fetch";
import { DetailedFeedbackSkeleton } from "@/components/skeleton/DetailedFeedbackSkeleton";
import type { EvaluationDetail } from "@/types/evaluation";
import ErrorPage from "./ErrorPage";

const DetailedFeedback = () => {
  const navigate = useNavigate();
  const { essayId } = useParams<{ essayId: string }>();
  const [selectedFilter, setSelectedFilter] = useState<string>("taskResponse");

  // Fetch evaluation data from API
  const {
    data: evaluationData,
    isLoading,
    error,
  } = useFetch<EvaluationDetail>(`/api/evaluation-detail?id=${essayId}`);

  // Show loading state
  if (isLoading) {
    return <DetailedFeedbackSkeleton />;
  }

  // Show error state
  if (error || !evaluationData) {
    return (
      <ErrorPage
        title="Error loading evaluation details"
        message={error?.message || "Evaluation not found"}
      />
    );
  }

  const feedbackData = evaluationData.feedback;

  const criteriaLabels = {
    taskResponse: "Task Response",
    coherenceCohesion: "Coherence & Cohesion",
    lexicalResource: "Lexical Resource",
    grammaticalRangeAccuracy: "Grammar & Accuracy",
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

  const getHighlightColorHover = (criteriaKey: string) => {
    const colors = {
      taskResponse:
        "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600",
      coherenceCohesion:
        "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-600",
      lexicalResource:
        "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600",
      grammaticalRangeAccuracy:
        "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600",
    };
    return (
      colors[criteriaKey as keyof typeof colors] ||
      "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
    );
  };

  const shouldShowIssue = (criteriaKey: string) => {
    return selectedFilter === criteriaKey;
  };

  const renderHighlightedText = () => {
    let highlightedText = evaluationData.userAnswer;

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
          const colorClassHover = getHighlightColorHover(criteriaKey);
          highlightedText = highlightedText.replace(
            regex,
            `<span class="group relative ${colorClass} px-1 py-0.5 rounded cursor-pointer border-b-2" data-issue="${index}" data-criteria="${criteriaKey}">$1<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 min-w-64 p-3 ${colorClassHover} border rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-normal">${issue.comment}</div></span>`
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="taskResponse" className="text-red-600">
                Task Response
              </TabsTrigger>
              <TabsTrigger
                value="coherenceCohesion"
                className="text-orange-600"
              >
                Coherence
              </TabsTrigger>
              <TabsTrigger value="lexicalResource" className="text-purple-600">
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
            <Badge variant="outline" className="ml-2">
              Showing:{" "}
              {criteriaLabels[selectedFilter as keyof typeof criteriaLabels]}
            </Badge>
          </CardTitle>
          <CardDescription>
            Hover over highlighted text to see specific feedback for each error
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
            className={selectedFilter !== key ? "opacity-50" : ""}
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
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
              onClick={() => navigate("/writing")}
            >
              Practice More Writing
            </Button>
            <Button variant="secondary">Download Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedFeedback;
