import { useState } from "react";
import { History } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { User } from "@/types/User";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const UsersTab = () => {
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useApi<User[]>("/api/manage/users");

  const { sorted, key, dir, toggle } = useSortedRows(users ?? [], "email");
  const [viewing, setViewing] = useState<User | null>(null);

  if (error) {
    return (
      <ErrorPage title="Failed to load users" message={error.message} onRetry={refetch} />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton columns={5} rows={5} />
        </CardContent>
      </Card>
    );
  }

  const sortable: { label: string; k: keyof User & string }[] = [
    { label: "Email", k: "email" },
    { label: "Full Name", k: "fullName" },
    { label: "Plan", k: "plan" },
    { label: "Target Score", k: "ieltsTargetScore" },
    { label: "Joined", k: "createdAt" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View registered users (read-only)</CardDescription>
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
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="View recent evaluations"
                    onClick={() => setViewing(user)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
    </Card>
  );
};
