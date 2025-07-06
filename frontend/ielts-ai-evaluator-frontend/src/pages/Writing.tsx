import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  Award,
  Mic,
  PenTool,
  BarChart3,
  Calendar,
  Star,
  Paperclip,
  FileText,
} from "lucide-react";
import {
  GRADIENT_BACKGROUND,
  GRADIENT_INDIGO,
  GRADIENT_INDIGO_BUTTON,
} from "@/styles/gradients";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

const Writing = () => {
  const [selectedTask, setSelectedTask] = useState<"task1" | "task2">("task1");

  const task1Topics = [
    {
      id: 1,
      title: "Population Growth Chart",
      description: "Analyze population trends across different countries",
      difficulty: "Medium",
      timeLimit: "20 minutes",
      type: "Line Graph",
      category: "Academic",
      preview:
        "The chart shows population changes in four countries from 1990 to 2020...",
    },
    {
      id: 2,
      title: "Energy Consumption Data",
      description: "Compare renewable vs non-renewable energy usage",
      difficulty: "Hard",
      timeLimit: "20 minutes",
      type: "Bar Chart",
      category: "Academic",
      preview:
        "The bar chart illustrates energy consumption patterns across different sources...",
    },
    {
      id: 3,
      title: "University Enrollment",
      description: "Describe changes in student enrollment over time",
      difficulty: "Easy",
      timeLimit: "20 minutes",
      type: "Table",
      category: "General",
      preview:
        "The table displays university enrollment figures for various departments...",
    },
    {
      id: 4,
      title: "Transportation Usage",
      description: "Compare different modes of transportation in urban areas",
      difficulty: "Medium",
      timeLimit: "20 minutes",
      type: "Pie Chart",
      category: "General",
      preview:
        "The pie chart shows the distribution of transportation methods used by commuters...",
    },
  ];

  const task2Topics = [
    {
      id: 1,
      title: "Technology in Education",
      description: "Should schools rely more on digital learning tools?",
      difficulty: "Medium",
      timeLimit: "40 minutes",
      type: "Opinion Essay",
      category: "General",
      preview:
        "In the digital age, educational institutions are increasingly integrating technology...",
    },
    {
      id: 2,
      title: "Environmental Protection",
      description: "Individual vs government responsibility for climate change",
      difficulty: "Hard",
      timeLimit: "40 minutes",
      type: "Discussion Essay",
      category: "General",
      preview:
        "Climate change is one of the most pressing challenges of our time...",
    },
    {
      id: 3,
      title: "Work-Life Balance",
      description: "The importance of maintaining balance in modern life",
      difficulty: "Easy",
      timeLimit: "40 minutes",
      type: "Agree/Disagree",
      category: "General",
      preview:
        "In today's fast-paced world, achieving work-life balance has become increasingly...",
    },
    {
      id: 4,
      title: "Social Media Impact",
      description: "Effects of social media on interpersonal relationships",
      difficulty: "Medium",
      timeLimit: "40 minutes",
      type: "Problem/Solution",
      category: "General",
      preview:
        "Social media platforms have revolutionized how people communicate and connect...",
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "Medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "Hard":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300";
    }
  };

  const currentTopics = selectedTask === "task1" ? task1Topics : task2Topics;

  return (
    <div className={`space-y-6`}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1
          className={`text-3xl font-bold ${GRADIENT_INDIGO} bg-clip-text text-transparent mb-2`}
        >
          Writing Practice ✍️
        </h1>
        <p className="text-dashboard-gray text-lg">
          Improve your IELTS writing skills with structured practice sessions
        </p>
      </div>

      {/* Task Selection */}
      <Tabs
        value={selectedTask}
        onValueChange={(value) => setSelectedTask(value as "task1" | "task2")}
      >
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-sm h-10 ">
          <TabsTrigger
            value="task1"
            className="cursor-pointer rounded-sm data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-gray-700 dark:text-gray-300 items-center flex justify-center transition-colors duration-200"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Writing Task 1
          </TabsTrigger>
          <TabsTrigger
            value="task2"
            className="cursor-pointer rounded-sm data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors duration-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Writing Task 2
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task1" className="mt-6">
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Task 1 - Academic Writing
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Describe, summarize or explain information presented in graphs,
              charts, tables or diagrams. Minimum 150 words, recommended time:
              20 minutes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="task2" className="mt-6">
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Task 2 - Essay Writing
            </h3>
            <p className="text-purple-700 dark:text-purple-300 text-sm">
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
            key={topic.id}
            className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 "
          >
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {topic.title}
                </CardTitle>
                <div>
                  <Badge
                    className={`text-xs font-medium bg-dashboard-indigo text-white rounded-full px-2 py-1 mr-2`}
                  >
                    {topic.category}
                  </Badge>
                  <Badge className={getDifficultyColor(topic.difficulty)}>
                    {topic.difficulty}
                  </Badge>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {topic.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {topic.timeLimit}
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {topic.type}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Preview:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  {topic.preview}
                </p>
              </div>

              <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0">
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
