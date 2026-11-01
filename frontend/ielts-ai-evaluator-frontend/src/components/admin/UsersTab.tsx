import { useState } from "react";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
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

/** ~4 tokens per session and a 30/hour cap, so real practice stays well under this. Above it,
 * someone may be collecting tokens — worth a look, not proof. */
const SUSPICIOUS_TOKENS_TODAY = 100;

/** A session is ~30–40k tokens and Free caps at 10 evaluations/day, so real use stays under this.
 * A guess — tune it once there are a few weeks of real numbers. */
const SUSPICIOUS_GEMINI_TOKENS_TODAY = 500_000;

/** An older API may omit these counters (separate deploys): show an em dash, not 0, so a missing
 * number can't hide an outlier. */
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

  const { sorted, key, dir, toggle } = useSortedRows(users ?? [], "email");
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const handleDelete = async (user: AdminUser) => {
    try {
      await api.delete(`/api/manage/users/${user.userId}`);
      toast.success(`Deleted ${user.email}`);
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error("Failed to delete user", { description: (err as Error).message });
    }
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
