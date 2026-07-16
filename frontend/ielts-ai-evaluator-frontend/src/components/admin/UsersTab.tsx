import { useApi } from "@/hooks/use-api";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { SortableHead } from "./SortableHead";
import ErrorPage from "@/pages/ErrorPage";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import { User } from "@/types/User";
import { Badge } from "@/components/ui/badge";
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
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
