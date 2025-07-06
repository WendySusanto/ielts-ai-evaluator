import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PenTool,
  Clock,
  Target,
  BarChart3,
  Brain,
  FileText,
  CheckCircle,
} from "lucide-react";

const WritingPractice = () => {
  const taskType = "task1"; // This can be "task1" or "task2"

  const [essay, setEssay] = useState("");
  const [timeLeft, setTimeLeft] = useState(taskType === "task1" ? 1200 : 2400); // 20 or 40 minutes
  const [wordCount, setWordCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssay(text);
    setWordCount(
      text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    );
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  };

  const minWords = 150;
  const targetWords = 200;
  const wordProgress = Math.min((wordCount / targetWords) * 100, 100);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Writing Task 1</h1>
        <p className="text-gray-600">
          Academic Writing - Describe visual information in at least 150 words
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Task Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary">
                <p className="text-gray-800 mb-4">
                  <strong>
                    The chart below shows the percentage of households in owned
                    and rented accommodation in England and Wales between 1918
                    and 2011.
                  </strong>
                </p>
                <p className="text-gray-700">
                  Summarise the information by selecting and reporting the main
                  features, and make comparisons where relevant.
                </p>
              </div>

              {/* Sample Chart Placeholder */}
              <div className="mt-4 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-600">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Sample Chart</p>
                  <p className="text-sm">
                    Housing Ownership in England & Wales (1918-2011)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Writing Area */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Your Response
                </CardTitle>
                <CardDescription>
                  Write your response here. Aim for at least 150 words.
                </CardDescription>
              </div>
              <Badge variant={"secondary"} className="text-lg">
                <span>{formatTime(timeLeft)}</span>
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Word Count Progress
                  </span>
                  <Badge
                    variant={wordCount >= minWords ? "default" : "secondary"}
                  >
                    {wordCount}/{targetWords} words
                  </Badge>
                </div>
                <Progress value={wordProgress} className="h-2" />
                <p className="text-xs text-gray-600">
                  {wordCount < minWords
                    ? `${
                        minWords - wordCount
                      } more words needed to meet minimum requirement`
                    : "Great! You've met the minimum word requirement"}
                </p>
              </div>

              <Textarea
                placeholder="Begin writing your Task 1 response here. Remember to:
- Introduce what the chart shows
- Describe the main trends and patterns
- Highlight significant changes or comparisons
- Use appropriate vocabulary for describing data
- Write at least 150 words"
                value={essay}
                onChange={handleTextChange}
                className="min-h-[400px] resize-none"
              />

              <div className="flex justify-between items-center">
                <Button variant="outline">Save Draft</Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={wordCount < minWords || isAnalyzing}
                  className="min-w-[120px]"
                >
                  {isAnalyzing ? "Analyzing..." : "Get AI Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Writing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Task 1 Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Structure:</strong> Introduction → Overview → Body
                  paragraphs with details
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Language:</strong> Use varied vocabulary for trends
                  (increase, rise, peak, decline)
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Time:</strong> Spend about 20 minutes on Task 1
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Focus:</strong> Describe data objectively, don't give
                  opinions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sample Phrases */}
          <Card>
            <CardHeader>
              <CardTitle>Useful Phrases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Introducing:</p>
                <p className="text-gray-700">"The chart illustrates..."</p>
                <p className="text-gray-700">"The data shows..."</p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Comparing:</p>
                <p className="text-gray-700">"In contrast to..."</p>
                <p className="text-gray-700">
                  "While X increased, Y decreased..."
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">Trends:</p>
                <p className="text-gray-700">"Rose steadily..."</p>
                <p className="text-gray-700">"Fluctuated between..."</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WritingPractice;
