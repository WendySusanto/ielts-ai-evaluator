import { useState } from "react";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { AdminUser } from "@/types/User";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecentEvaluationsDialog } from "./RecentEvaluationsDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** A speaking session takes ~4 tokens and the backend caps issuance at 30/hour, so even a heavy
 * day of genuine practice lands well under this. Past it, someone is collecting tokens rather
 * than using them — a starting point for a look, not proof on its own. */
const SUSPICIOUS_TOKENS_TODAY = 100;

/** A full speaking session runs roughly 30–40k Gemini tokens (≈20 examiner turns plus the
 * evaluation), and the Free plan caps evaluations at 10/day, so even a relentless day of real
 * practice stays well under this. A guess calibrated on shape, not on measured data — tune it
 * once the column has shown a few weeks of real numbers. */
const SUSPICIOUS_GEMINI_TOKENS_TODAY = 500_000;

/** Frontend and Functions deploy from separate workflows, so a newer page can briefly talk to an
 * older API that omits these counters. Renders an em dash when that happens rather than 0 — on a
 * screen whose whole job is spotting outliers, a missing number shown as zero would hide exactly
 * the account you are looking for. */
const UsageCell = ({ value, threshold }: { value: number | undefined; threshold: number }) => {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;

  return value >= threshold ? (
    <Badge variant="destructive">{value.toLocaleString()}</Badge>
  ) : (
    <span className="text-muted-foreground">{value.toLocaleString()}</span>
  );
};

export const UsersTab = () => {
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useApi<AdminUser[]>("/api/manage/users");

  // Separate hook instance for the delete: mutate overwrites its hook's data with the response
  // (204, so empty), which would wipe the list useSortedRows spreads.
  const { mutate } = useApi<void>("", { skipInitialFetch: true });

  const { sorted, key, dir, toggle } = useSortedRows(users ?? [], "email");
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const handleDelete = async (user: AdminUser) => {
    await mutate({
      url: `/api/manage/users/${user.userId}`,
      method: "DELETE",
      onSuccess: () => {
        toast.success(`Deleted ${user.email}`);
        setDeleting(null);
        refetch();
      },
      onError: (err) => toast.error("Failed to delete user", { description: err.message }),
    });
  };

  if (error) {
    return (
      <ErrorPage title="Failed to load users" message={error.message} onRetry={refetch} />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton columns={8} rows={5} />
        </CardContent>
      </Card>
    );
  }

  const sortable: { label: string; k: keyof AdminUser & string }[] = [
    { label: "Email", k: "email" },
    { label: "Full Name", k: "fullName" },
    { label: "Plan", k: "plan" },
    { label: "Target Score", k: "ieltsTargetScore" },
    { label: "Speech Tokens Today", k: "speechTokensToday" },
    { label: "Gemini Tokens Today", k: "geminiTokensToday" },
    { label: "Joined", k: "createdAt" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View registered users (read-only). Sort by Speech Tokens Today to spot accounts
          pulling far more Azure Speech tokens than practising would need.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {sortable.map((c) => (
                <SortableHead
                  key={c.k}
                  label={c.label}
                  active={key === c.k}
                  dir={dir}
                  onClick={() => toggle(c.k)}
                />
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>
                  <Badge variant={user.plan === "Free" ? "secondary" : "default"}>
                    {user.plan}
                  </Badge>
                </TableCell>
                <TableCell>{user.ieltsTargetScore ?? "Not set"}</TableCell>
                <TableCell>
                  <UsageCell
                    value={user.speechTokensToday}
                    threshold={SUSPICIOUS_TOKENS_TODAY}
                  />
                </TableCell>
                <TableCell>
                  <UsageCell
                    value={user.geminiTokensToday}
                    threshold={SUSPICIOUS_GEMINI_TOKENS_TODAY}
                  />
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="View recent evaluations"
                      onClick={() => setViewing(user)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete user"
                      onClick={() => setDeleting(user)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      {viewing && (
        <RecentEvaluationsDialog user={viewing} onClose={() => setViewing(null)} />
      )}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.email}?</DialogTitle>
            <DialogDescription>
              They lose access to every endpoint within a minute. Their evaluations and usage
              history stay in the database, and their Firebase sign-in still works — it just
              reaches nothing. Undoing this means editing the database directly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleting && handleDelete(deleting)}
            >
              Delete user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
