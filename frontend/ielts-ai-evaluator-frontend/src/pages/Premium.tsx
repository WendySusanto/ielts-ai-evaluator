import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { User } from "@/types/User";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FREE_FEATURES = [
  "10 writing evaluations per day",
  "10 speaking sessions per day",
  "Full band-score feedback on every submission",
  "Progress dashboard and feedback history",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited writing evaluations",
  "Unlimited speaking sessions",
  "Priority access to new features",
];

const Premium = () => {
  // Badge only — the page renders fine while (or if) this is loading/failed.
  const { data: profile } = useApi<User>("/api/me");
  const plan = profile?.plan;

  const FeatureList = ({ features }: { features: string[] }) => (
    <ul className="space-y-3">
      {features.map((f) => (
        <li
          key={f}
          className="flex items-start gap-2 text-sm text-card-foreground"
        >
          <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          {f}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Plans</h1>
        <p className="text-foreground font-medium text-lg">
          Practice free every day, or go unlimited with Premium.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                Free
              </CardTitle>
              {plan === "Free" && <Badge variant="secondary">Your plan</Badge>}
            </div>
            <CardDescription>
              Everything you need to start practicing
            </CardDescription>
            <p className="text-3xl font-bold text-card-foreground pt-2">
              $0
              <span className="text-sm font-medium text-muted-foreground">
                {" "}
                / forever
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <FeatureList features={FREE_FEATURES} />
          </CardContent>
        </Card>

        <Card className="border-2 border-primary shadow-lg bg-card backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Crown className="h-5 w-5 text-tip" />
                Premium
              </CardTitle>
              {plan != null && plan !== "Free" && <Badge>Your plan</Badge>}
            </div>
            <CardDescription>
              Unlimited practice for serious preparation
            </CardDescription>
            <p className="text-3xl font-bold text-card-foreground pt-2">
              Coming soon
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <FeatureList features={PREMIUM_FEATURES} />
            <Button
              className="w-full"
              onClick={() =>
                toast.info("Payments are coming soon", {
                  description:
                    "Premium upgrades aren't available yet — enjoy Free in the meantime!",
                })
              }
            >
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Premium;
