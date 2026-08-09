import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl mx-auto">
        <div className="p-8 text-center space-y-6">
          {/* The layout header owns the page's h1 ("Page not found"). */}
          <div className="space-y-2">
            <p className="text-6xl font-bold text-primary">404</p>
            <p className="text-2xl font-semibold text-card-foreground">
              Page Not Found
            </p>
          </div>

          {/* Icon */}
          <div className="p-6 mx-auto w-fit">
            <div className="p-8 rounded-full bg-secondary text-secondary-foreground">
              <Search className="h-12 w-12" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3 max-w-md mx-auto">
            <p className="text-card-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-sm text-muted-foreground">
              Let's get you back to improving your IELTS score.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft />
              Go Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
