import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Star,
  ArrowLeft,
  Sparkles,
  Target,
  BookOpen,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComingSoonProps {
  title?: string;
  feature?: string;
  description?: string;
  estimatedDate?: string;
}

const ComingSoon = ({
  title = "Coming Soon",
  feature = "This Feature",
  description = "We're working hard to bring you something amazing! This feature is currently under development and will be available soon.",
}: ComingSoonProps) => {
  const navigate = useNavigate();

  const upcomingFeatures = [
    {
      title: "AI-Powered Speaking Analysis",
      description: "Real-time pronunciation and fluency feedback",
      icon: Target,
      status: "In Development",
    },
    {
      title: "Advanced Writing Templates",
      description: "Task-specific writing frameworks and examples",
      icon: BookOpen,
      status: "Planning",
    },
    {
      title: "Progress Analytics",
      description: "Detailed performance insights and trends",
      icon: Zap,
      status: "Coming Soon",
    },
  ];

  return (
    <div className="space-y-6 min-h-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-gray-200 dark:border-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-foreground font-medium text-lg">
          {feature} is on its way to enhance your IELTS preparation journey
        </p>
      </div>

      {/* Main Coming Soon Card */}
      <div className="flex justify-center">
        <Card className="border-0 shadow-xl bg-card backdrop-blur-sm w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6 mx-auto">
                  <Rocket className="h-12 w-12 text-secondary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-card-foreground mb-4">
                Something Amazing is Coming!
              </h2>

              <p className="text-foreground font-medium text-lg mb-6 leading-relaxed">
                {description}
              </p>

              <Button
                onClick={() => navigate("/")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 px-8 py-2"
              >
                <Star className="h-4 w-4 mr-2" />
                Explore Current Features
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Preview Grid */}
      <div className="mt-12">
        <h3 className="text-xl font-semibold text-card-foreground mb-6 text-center">
          What's Coming Next
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingFeatures.map((feature, index) => (
            <Card
              key={index}
              className="border-0 shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg text-card-foreground">
                      {feature.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground font-medium text-sm mb-4">
                  {feature.description}
                </p>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    feature.status === "In Development"
                      ? "border-green-200 text-green-700 dark:border-green-700 dark:text-green-400"
                      : feature.status === "Planning"
                      ? "border-yellow-200 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400"
                      : "border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                  }`}
                >
                  {feature.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <Card className="border-0 shadow-lg bg-card backdrop-blur-sm mt-8">
        <CardContent className="p-8 text-center">
          <h4 className="text-lg font-semibold text-card-foreground mb-3">
            Stay Updated
          </h4>
          <p className="text-foreground font-medium mb-6">
            Want to be the first to know when new features are available?
            Continue using the app and you'll automatically get access to new
            features as they're released.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/feedback")}
              className="border-gray-200 dark:border-gray-600"
            >
              View Your Progress
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
