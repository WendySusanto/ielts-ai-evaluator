import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Users2, Edit, Plus } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import WritingPrompt, {
  WritingPromptUpsertRequest,
} from "@/types/WritingPrompt";
import { User } from "@/types/User";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeleton/TableSkeleton";
import ErrorPage from "./ErrorPage";

const Admin = () => {
  const [selectedTask, setSelectedTask] = useState<"writing" | "user">(
    "writing",
  );

  const {
    data: writingPrompts = [],
    isLoading: isLoadingPrompts,
    error: promptsError,
    refetch: refetchPrompts,
    mutate: mutatePrompts,
  } = useApi<WritingPrompt[]>("/api/writing-prompts?includeInactive=true");

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useApi<User[]>("/api/manage/users");

  const handleUpsertPrompt = async (data: WritingPromptUpsertRequest) => {
    await mutatePrompts({
      url: "/api/writing-prompts",
      method: "POST",
      data,
      onSuccess: () => {
        toast.success("Writing prompt created/updated successfully");
        refetchPrompts();
      },
      onError: (error) => {
        toast.error("Failed to create/update writing prompt", {
          description: error.message,
        });
      },
    });
  };

  // Show errors
  if (promptsError || usersError) {
    return (
      <ErrorPage
        title="Failed to load admin data"
        message={
          promptsError?.message || usersError?.message || "An error occurred"
        }
        onRetry={() => {
          refetchPrompts();
          refetchUsers();
        }}
      />
    );
  }

  const WritingPromptForm = ({
    prompt,
    onSubmit,
    onClose,
  }: {
    prompt?: WritingPrompt;
    onSubmit: (data: WritingPromptUpsertRequest) => void;
    onClose: () => void;
  }) => {
    const { register, handleSubmit, reset, setValue, watch } =
      useForm<WritingPromptUpsertRequest>({
        defaultValues: prompt ?? {
          topic: "",
          description: "",
          preview: "",
          questionType: "",
          questionText: "",
          duration: 40,
          minimumWords: 250,
          taskType: "Task2",
          level: "Academic",
          imageUrl: "",
          isActive: true,
        },
      });

    const handleFormSubmit = (data: WritingPromptUpsertRequest) => {
      onSubmit(data);
      reset();
      onClose();
    };

    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              {...register("topic", { required: true })}
              placeholder="Enter topic"
            />
          </div>
          <div>
            <Label htmlFor="questionType">Question Type</Label>
            <Select
              value={watch("questionType")}
              onValueChange={(value) => setValue("questionType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Line Graph">Line Graph</SelectItem>
                <SelectItem value="Table">Table</SelectItem>
                <SelectItem value="Pie Chart">Pie Chart</SelectItem>
                <SelectItem value="Bar Chart">Bar Chart</SelectItem>
                <SelectItem value="Essay">Essay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            {...register("description", { required: true })}
            placeholder="Enter description"
          />
        </div>

        <div>
          <Label htmlFor="preview">Preview</Label>
          <Input
            {...register("preview", { required: true })}
            placeholder="Enter preview text"
          />
        </div>

        <div>
          <Label htmlFor="questionText">Question Text</Label>
          <Textarea
            {...register("questionText", { required: true })}
            placeholder="Enter the full question"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              type="number"
              {...register("duration", { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="minimumWords">Minimum Words</Label>
            <Input
              type="number"
              {...register("minimumWords", {
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taskType">Task Type</Label>
            <Select
              value={watch("taskType")}
              onValueChange={(value) =>
                setValue("taskType", value as "Task1" | "Task2")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Task1">Task 1</SelectItem>
                <SelectItem value="Task2">Task 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="level">Level</Label>
            <Select
              value={watch("level")}
              onValueChange={(value) =>
                setValue("level", value as "Academic" | "General")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input
            {...register("imageUrl")}
            placeholder="Enter image URL for Task 1"
          />
        </div>

        <div>
          <Label htmlFor="imageDescription">Image Description (optional)</Label>
          <Input
            {...register("imageDescription")}
            placeholder="Enter image description for Task 1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="isActive" {...register("isActive")} />
          <Label htmlFor="isActive">Active (visible to students)</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit">{prompt ? "Update" : "Create"}</Button>
        </div>
      </form>
    );
  };

  return (
    <div className={`space-y-6`}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Admin Dashboard
        </h1>
        <p className="text-foreground font-medium text-lg">
          Manage writing tasks and users
        </p>
      </div>

      {/* Task Selection */}
      <Tabs
        className="space-y-4"
        value={selectedTask}
        onValueChange={(value) => setSelectedTask(value as "writing" | "user")}
      >
        <TabsList className="grid w-full grid-cols-2 dark:bg-card border border-border p-1 rounded-sm h-10">
          <TabsTrigger
            value="writing"
            className="cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Writing Tasks
          </TabsTrigger>

          <TabsTrigger
            value="user"
            className="cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200"
          >
            <Users2 className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writing" className="space-y-4">
          {isLoadingPrompts ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <TableSkeleton columns={6} rows={5} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Writing Tasks</CardTitle>
                    <CardDescription>
                      Manage IELTS writing prompts and tasks
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Writing Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Writing Task</DialogTitle>
                        <DialogDescription>
                          Add a new writing prompt for IELTS practice
                        </DialogDescription>
                      </DialogHeader>
                      <WritingPromptForm
                        onSubmit={(data) => handleUpsertPrompt(data)}
                        onClose={() => {}}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(writingPrompts ?? []).map((prompt) => (
                      <TableRow key={prompt.writingPromptId}>
                        <TableCell className="font-medium">
                          {prompt.topic}
                        </TableCell>
                        <TableCell>{prompt.questionType}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{prompt.taskType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{prompt.level}</Badge>
                        </TableCell>
                        <TableCell>{prompt.duration} min</TableCell>
                        <TableCell>
                          <Badge
                            variant={prompt.isActive ? "default" : "outline"}
                          >
                            {prompt.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Writing Task</DialogTitle>
                              </DialogHeader>
                              <WritingPromptForm
                                prompt={prompt}
                                onSubmit={(data) => handleUpsertPrompt(data)}
                                onClose={() => {}}
                              />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(writingPrompts ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground"
                        >
                          No writing tasks yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          {isLoadingUsers ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <TableSkeleton columns={5} rows={5} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View registered users (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Target Score</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users ?? []).map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">
                          {user.email}
                        </TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.plan === "Free" ? "secondary" : "default"
                            }
                          >
                            {user.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.ieltsTargetScore ?? "Not set"}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(users ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
