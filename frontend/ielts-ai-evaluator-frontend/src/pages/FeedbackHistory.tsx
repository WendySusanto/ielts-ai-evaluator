import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  TrendingUp,
  TrendingDown,
  Mic,
  PenTool,
  Calendar,
  Clock,
  Target,
  BarChart3,
  Eye,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const FeedbackHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const feedbackHistory = [
    {
      id: 1,
      type: "Speaking",
      date: "2024-01-15",
      time: "14:30",
      overallScore: 7.0,
      scores: {
        fluency: 7.0,
        pronunciation: 6.5,
        grammar: 7.5,
        vocabulary: 7.0,
      },
      topic: "Environmental Issues",
      duration: "12 min",
      improvement: "+0.5",
      feedback:
        "Good use of vocabulary related to environmental topics. Work on pronunciation of complex words.",
    },
    {
      id: 2,
      type: "Writing Task 2",
      date: "2024-01-14",
      time: "16:45",
      overallScore: 6.5,
      scores: {
        taskResponse: 6.5,
        coherence: 7.0,
        lexicalResource: 6.0,
        grammar: 6.5,
      },
      topic: "Education Technology",
      wordCount: 287,
      improvement: "+0.0",
      feedback:
        "Clear argument structure. Expand vocabulary range and use more complex sentence structures.",
    },
    {
      id: 3,
      type: "Writing Task 1",
      date: "2024-01-13",
      time: "10:15",
      overallScore: 7.5,
      scores: {
        taskAchievement: 7.5,
        coherence: 7.0,
        lexicalResource: 8.0,
        grammar: 7.5,
      },
      topic: "Chart Analysis - Population Growth",
      wordCount: 165,
      improvement: "+1.0",
      feedback:
        "Excellent description of trends. Good use of data-specific vocabulary.",
    },
    {
      id: 4,
      type: "Speaking",
      date: "2024-01-12",
      time: "09:20",
      overallScore: 6.5,
      scores: {
        fluency: 6.0,
        pronunciation: 7.0,
        grammar: 6.5,
        vocabulary: 6.5,
      },
      topic: "Travel and Tourism",
      duration: "11 min",
      improvement: "-0.5",
      feedback:
        "Good pronunciation but work on fluency. Add more linking words to connect ideas.",
    },
    {
      id: 5,
      type: "Writing Task 2",
      date: "2024-01-10",
      time: "19:30",
      overallScore: 6.0,
      scores: {
        taskResponse: 6.0,
        coherence: 6.5,
        lexicalResource: 5.5,
        grammar: 6.0,
      },
      topic: "Social Media Impact",
      wordCount: 251,
      improvement: "-0.5",
      feedback:
        "Address all parts of the question more fully. Work on vocabulary variety.",
    },
  ];

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7.5) return "default";
    if (score >= 6.5) return "secondary";
    return "outline";
  };

  const getImprovementIcon = (improvement: string) => {
    if (improvement.startsWith("+"))
      return <TrendingUp className="h-4 w-4 text-primary" />;
    if (improvement.startsWith("-"))
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <div className="h-4 w-4" />;
  };

  const averageScore =
    feedbackHistory.reduce((sum, item) => sum + item.overallScore, 0) /
    feedbackHistory.length;

  const filteredHistory =
    activeTab === "all"
      ? feedbackHistory
      : feedbackHistory.filter((item) =>
          activeTab === "speaking"
            ? item.type === "Speaking"
            : item.type.includes("Writing")
        );

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Feedback History 📊
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your progress and review detailed AI feedback
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border text-foreground">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="border-border text-foreground">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {averageScore.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
              <Target className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {feedbackHistory.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">7.5</p>
                <p className="text-sm text-muted-foreground">Highest Score</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">5</p>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Score Progress Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6">
            {feedbackHistory
              .slice()
              .reverse()
              .map((session, index) => (
                <div
                  key={session.id}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-xs text-muted-foreground text-center">
                    {session.date.split("-")[2]}/{session.date.split("-")[1]}
                  </div>
                  <div
                    className="bg-primary rounded-t-lg w-8 flex items-end justify-center text-primary-foreground text-xs font-medium"
                    style={{ height: `${(session.overallScore / 9) * 200}px` }}
                  >
                    {session.overallScore}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {session.type === "Speaking"
                      ? "S"
                      : session.type.includes("Task 1")
                      ? "W1"
                      : "W2"}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed History with Tabs */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <History className="h-5 w-5 text-primary" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-card text-foreground"
              >
                All Sessions
              </TabsTrigger>
              <TabsTrigger
                value="speaking"
                className="data-[state=active]:bg-card text-foreground"
              >
                Speaking
              </TabsTrigger>
              <TabsTrigger
                value="writing"
                className="data-[state=active]:bg-card text-foreground"
              >
                Writing
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {filteredHistory.map((session) => (
                  <div
                    key={session.id}
                    className="border border-border rounded-lg p-6 bg-background hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          {session.type === "Speaking" ? (
                            <Mic className="h-6 w-6 text-primary" />
                          ) : (
                            <PenTool className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">
                            {session.type}
                          </h3>
                          <p className="text-muted-foreground">
                            {session.topic}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getScoreBadgeVariant(session.overallScore)}
                            className="text-sm font-medium"
                          >
                            Band {session.overallScore}
                          </Badge>
                          {getImprovementIcon(session.improvement)}
                          <span
                            className={`text-sm font-medium ${
                              session.improvement.startsWith("+")
                                ? "text-primary"
                                : session.improvement.startsWith("-")
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {session.improvement}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {session.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {Object.entries(session.scores).map(
                        ([criteria, score]) => (
                          <div key={criteria} className="text-center">
                            <p className="text-xs text-muted-foreground capitalize mb-1">
                              {criteria.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <p className="font-semibold text-primary text-lg">
                              {score}
                            </p>
                            <Progress
                              value={(score / 9) * 100}
                              className="h-2 mt-1"
                            />
                          </div>
                        )
                      )}
                    </div>

                    {/* Session Details */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex gap-4">
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.duration}
                          </span>
                        )}
                        {session.wordCount && (
                          <span className="flex items-center gap-1">
                            <PenTool className="h-4 w-4" />
                            {session.wordCount} words
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Feedback */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border">
                      <h4 className="font-medium text-foreground mb-2">
                        AI Feedback
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {session.feedback}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-border text-foreground"
                        onClick={() => navigate("/feedback/detailed")}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-border text-foreground"
                      >
                        <Download className="h-4 w-4" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackHistory;
