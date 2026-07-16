import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBandPoint } from "@/types/dashboard";
import { TrendingUp } from "lucide-react";

interface BandTrendCardProps {
  points: DashboardBandPoint[];
  targetScore: number | null;
}

// ponytail: hand-rolled SVG (≤20 points, native <title> tooltips); add a chart
// lib only if zoom/brush is ever needed.
const W = 640;
const H = 220;
const PLOT = { x0: 28, x1: W - 56, y0: 12, y1: H - 26 };

const SERIES = {
  writing: { label: "Writing", dot: "fill-chart-writing" },
  speaking: { label: "Speaking", dot: "fill-chart-speaking" },
} as const;

const yFor = (band: number) => PLOT.y1 - (band / 9) * (PLOT.y1 - PLOT.y0);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const BandTrendCard = ({ points, targetScore }: BandTrendCardProps) => {
  // Points arrive oldest→newest from the API; x is evaluation order, not time-scaled.
  const xFor = (i: number) =>
    PLOT.x0 + (i / (points.length - 1)) * (PLOT.x1 - PLOT.x0);

  return (
    <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <TrendingUp className="h-5 w-5 text-secondary" />
          Band Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="text-center py-8 text-foreground font-medium">
            Complete more evaluations to see your trend.
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              role="img"
              aria-label={`Band score trend across your last ${points.length} evaluations`}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((band) => (
                <g key={band}>
                  <line
                    x1={PLOT.x0}
                    x2={PLOT.x1}
                    y1={yFor(band)}
                    y2={yFor(band)}
                    className="stroke-border"
                    strokeWidth={band % 3 === 0 ? 1 : 0.5}
                  />
                  {band % 3 === 0 && (
                    <text
                      x={PLOT.x0 - 8}
                      y={yFor(band) + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {band}
                    </text>
                  )}
                </g>
              ))}
              {targetScore != null && (
                <g>
                  <line
                    x1={PLOT.x0}
                    x2={PLOT.x1}
                    y1={yFor(targetScore)}
                    y2={yFor(targetScore)}
                    className="stroke-muted-foreground"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PLOT.x1 + 6}
                    y={yFor(targetScore) + 3}
                    className="fill-muted-foreground text-[10px]"
                  >
                    Target {targetScore}
                  </text>
                </g>
              )}
              <polyline
                points={points
                  .map((p, i) => `${xFor(i)},${yFor(p.overallBand)}`)
                  .join(" ")}
                fill="none"
                className="stroke-muted-foreground/50"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(p.overallBand)}
                  r={4}
                  className={SERIES[p.type].dot}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  <title>{`${SERIES[p.type].label} ${p.overallBand.toFixed(1)} — ${fmtDate(p.createdAt)}`}</title>
                </circle>
              ))}
              <text
                x={PLOT.x0}
                y={H - 8}
                className="fill-muted-foreground text-[10px]"
              >
                {fmtDate(points[0].createdAt)}
              </text>
              <text
                x={PLOT.x1}
                y={H - 8}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {fmtDate(points[points.length - 1].createdAt)}
              </text>
            </svg>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-writing" />
                Writing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-speaking" />
                Speaking
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
