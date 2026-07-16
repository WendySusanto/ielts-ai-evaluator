import { useApi } from "@/hooks/use-api";
import { getRelativeTime } from "@/lib/utils";
import { DashboardRecentItem } from "@/types/dashboard";
import { User } from "@/types/User";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface RecentEvaluationsDialogProps {
  user: User;
  onClose: () => void;
}

const taskLabel = (t: string) => t.replace("Task", "Task ").replace("Part", "Part ");

export const RecentEvaluationsDialog = ({ user, onClose }: RecentEvaluationsDialogProps) => {
  const { data: items, isLoading, error } = useApi<DashboardRecentItem[]>(
    `/api/manage/recent-evaluations?userId=${user.userId}`,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle>Recent evaluations — {user.fullName || user.email}</DialogTitle>
          <DialogDescription>This user's 10 most recent submissions.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <TableSkeleton columns={4} rows={3} />
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {item.type === "speaking" ? "Speaking" : "Writing"}{" "}
                      {taskLabel(item.taskType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.topic}</TableCell>
                  <TableCell>{item.overallBand.toFixed(1)}</TableCell>
                  <TableCell>{getRelativeTime(item.createdAt)}</TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No evaluations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
