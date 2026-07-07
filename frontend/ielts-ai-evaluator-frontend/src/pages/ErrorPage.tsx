import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ErrorPageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showBackButton?: boolean;
  showRetryButton?: boolean;
}

const ErrorPage = ({
  title = "Something went wrong",
  message = "We encountered an error while loading this page. Please try again.",
  onRetry,
  showBackButton = true,
  showRetryButton = true,
}: ErrorPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <Card className="w-full max-w-md border-0 shadow-lg bg-card backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-card-foreground mb-2">
              {title}
            </h2>

            <p className="text-foreground font-medium text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-200 dark:border-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}

            {showRetryButton && onRetry && (
              <Button
                onClick={onRetry}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>

          {!onRetry && showRetryButton && (
            <div className="mt-4">
              <Button
                onClick={() => window.location.reload()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorPage;
