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
      <Card className="w-full max-w-md" role="alert">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <h2 className="text-xl font-semibold text-card-foreground mb-2">
              {title}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft />
                Go Back
              </Button>
            )}

            {showRetryButton &&
              (onRetry ? (
                <Button onClick={onRetry}>
                  <RefreshCw />
                  Try Again
                </Button>
              ) : (
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw />
                  Reload Page
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorPage;
