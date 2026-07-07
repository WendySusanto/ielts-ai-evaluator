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
import {
  User as UserIcon,
  Target,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Settings,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@/types/User";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileSkeleton } from "@/components/skeleton/ProfileSkeleton";
import ErrorPage from "./ErrorPage";

const Profile = () => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current user profile data
  const {
    data: userProfile,
    isLoading,
    error,
    refetch,
    mutate,
  } = useApi<User>("/api/GetUserProfile");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<Partial<User>>();
  // Update form when user profile data loads
  useEffect(() => {
    if (userProfile) {
      console.log("User Profile Loaded:", userProfile);
      reset({
        ...userProfile,
        targetTestDate: userProfile.targetTestDate
          ? new Date(userProfile.targetTestDate).toLocaleDateString("en-CA")
          : new Date().toLocaleDateString("en-CA"),
      });
    }
  }, [userProfile, reset]);

  const handleSaveProfile = async (data: Partial<User>) => {
    setIsSaving(true);
    try {
      await mutate({
        url: "/api/user",
        method: "POST",
        data: {
          ...data,
          userId: currentUser?.userId,
          dateTimeOffset: new Date().getTimezoneOffset(),
        },
        onSuccess: () => {
          toast.success("Profile updated successfully");
          setIsEditing(false);
        },
        onError: (error) => {
          toast.error("Failed to update profile", {
            description: error.message,
          });
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <ErrorPage
        title="Failed to load profile"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
        <p className="text-foreground font-medium text-lg">
          Manage your account settings and IELTS goals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <UserIcon className="h-5 w-5 text-secondary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your profile details and IELTS goals
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-gray-200 dark:border-gray-600"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="border-gray-200 dark:border-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit(handleSaveProfile)}
                      disabled={isSaving || !isDirty}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        value={userProfile?.email || ""}
                        disabled={true} // Email should not be editable
                        className="pl-10 bg-muted"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan" className="text-sm font-medium">
                      Current Plan
                    </Label>
                    <div className="relative">
                      <Award className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={userProfile?.plan || "Free"}
                        disabled={true}
                        className="pl-10 bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* IELTS Goals */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-secondary" />
                    IELTS Goals
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="ieltsTargetType"
                        className="text-sm font-medium"
                      >
                        Target Type
                      </Label>
                      <Select
                        value={watch("ieltsTargetType")}
                        onValueChange={(value) =>
                          setValue("ieltsTargetType", value)
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Academic">Academic</SelectItem>
                          <SelectItem value="General Training">
                            General Training
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="ieltsTargetScore"
                        className="text-sm font-medium"
                      >
                        Target Score
                      </Label>
                      <Select
                        value={watch("ieltsTargetScore")?.toString() || ""}
                        onValueChange={(value) =>
                          setValue("ieltsTargetScore", parseFloat(value))
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target score" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(
                            (score) => (
                              <SelectItem key={score} value={score.toString()}>
                                {score}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="targetTestDate"
                      className="text-sm font-medium"
                    >
                      Target Test Date
                    </Label>
                    <div className="relative">
                      <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="targetTestDate"
                        type="date"
                        {...register("targetTestDate")}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Statistics & Quick Info */}
        <div className="space-y-6">
          {/* Usage Statistics */}
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <BookOpen className="h-5 w-5 text-secondary" />
                Usage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Writing Tasks
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      Completed
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                >
                  {userProfile?.writingQuotaUsed || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Speaking Tasks
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      Completed
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                >
                  {userProfile?.speakingQuotaUsed || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground font-medium">Plan</span>
                <Badge
                  variant={
                    userProfile?.plan === "Free" ? "secondary" : "default"
                  }
                >
                  {userProfile?.plan || "Free"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground font-medium">
                  Target Score
                </span>
                <span className="text-sm font-medium text-card-foreground">
                  {userProfile?.ieltsTargetScore || "Not set"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground font-medium">
                  Target Date
                </span>
                <span className="text-sm font-medium text-card-foreground">
                  {userProfile?.targetTestDate
                    ? new Date(userProfile.targetTestDate).toLocaleDateString()
                    : "Not set"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground font-medium">
                  Auth Provider
                </span>
                <span className="text-sm font-medium text-card-foreground">
                  {userProfile?.authProvider || "Firebase"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
