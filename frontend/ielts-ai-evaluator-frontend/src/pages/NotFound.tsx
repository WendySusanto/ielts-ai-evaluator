import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="border-0 bg-card/80 backdrop-blur-sm w-full max-w-2xl mx-auto">
        <div className="p-8 text-center space-y-6">
          {/* 404 Header */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              404
            </h1>
            <p className="text-2xl font-semibold text-card-foreground">
              Page Not Found
            </p>
          </div>

          {/* Icon */}
          <div className="p-6 mx-auto w-fit">
            <div className="p-8 rounded-full bg-muted dark:bg-muted/50 text-purple-600 dark:text-purple-400">
              <Search className="h-12 w-12" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3 max-w-md mx-auto">
            <p className="text-muted-foreground-bold">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-sm text-muted-foreground">
              Let's get you back to improving your IELTS score.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
