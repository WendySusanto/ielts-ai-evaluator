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
} from "lucide-react";
import {
  GRADIENT_BACKGROUND,
  GRADIENT_INDIGO,
  GRADIENT_INDIGO_BUTTON,
} from "@/styles/gradients";

const Dashboard = () => {
  const stats = [
    {
      title: "Speaking Sessions",
      value: "12",
      change: "+3 this week",
      icon: Mic,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Writing Tasks",
      value: "8",
      change: "+2 this week",
      icon: PenTool,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Average Score",
      value: "7.5",
      change: "+0.5 improvement",
      icon: BarChart3,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Study Streak",
      value: "15 days",
      change: "Keep it up!",
      icon: Target,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  const recentActivities = [
    {
      type: "Speaking",
      topic: "Technology & Innovation",
      score: 8.0,
      date: "Today",
    },
    {
      type: "Writing Task 1",
      topic: "Data Analysis",
      score: 7.5,
      date: "Yesterday",
    },
    {
      type: "Writing Task 2",
      topic: "Environmental Issues",
      score: 8.5,
      date: "2 days ago",
    },
  ];

  const upcomingGoals = [
    { title: "Complete 5 Speaking Sessions", progress: 60 },
    { title: "Improve Writing Task 1 Score", progress: 40 },
    { title: "Practice Academic Vocabulary", progress: 80 },
  ];

  return (
    <div className={`space-y-6 `}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1
          className={`text-3xl font-bold ${GRADIENT_INDIGO} bg-clip-text text-transparent mb-2`}
        >
          Welcome back, Sarah! 👋
        </h1>
        <p className="text-dashboard-gray text-lg">
          Ready to continue your IELTS journey? Let's achieve your target score
          together.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg  backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1 text-dashboard-gray">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-dashboard-gray-dark ">
                    {stat.value}
                  </p>
                  <p className="text-xs text-dashboard-gray mt-1">
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full bg-dashboard-gray-bg dark:bg-dashboard-gray-bg/50 ${stat.color}`}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg  backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-dashboard-gray-dark">
                <Clock className="h-5 w-5 text-dashboard-indigo-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-dashboard-gray-bg/80 dark:bg-dashboard-gray-bg/50 border border-gray-100 dark:border-gray-600"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type.includes("Speaking")
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      }`}
                    >
                      {activity.type.includes("Speaking") ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <PenTool className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-dashboard-gray-dark ">
                        {activity.type}
                      </p>
                      <p className="text-sm text-dashboard-gray">
                        {activity.topic}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="secondary"
                      className="mb-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      {activity.score}
                    </Badge>
                    <p className="text-xs text-dashboard-gray">
                      {activity.date}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Goals & Progress */}
        <div>
          <Card className="border-0 shadow-lg  backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-dashboard-gray-dark">
                <Target className="h-5 w-5 text-dashboard-indigo-accent" />
                Weekly Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {upcomingGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-dashboard-gray-dark">
                      {goal.title}
                    </p>
                    <span className="text-xs text-dashboard-gray">
                      {goal.progress}%
                    </span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg  backdrop-blur-sm mt-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-dashboard-gray-dark">
                <Star className="h-5 w-5 text-dashboard-indigo-accent" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className={`w-full justify-start ${GRADIENT_INDIGO_BUTTON}`}
              >
                <Mic className={`h-4 w-4 mr-2`} />
                Start Speaking Practice
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Begin Writing Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Progress Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
