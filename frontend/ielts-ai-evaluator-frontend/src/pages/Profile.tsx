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
import { ProfileSkeleton } from "@/components/skeleton/ProfileSkeleton";
import ErrorPage from "./ErrorPage";

// View mode is the page's resting state, so its fields must stay readable.
// The base input dims disabled controls to 50% opacity — well under AA.
const READ_ONLY_FIELD = "read-only:bg-muted read-only:text-foreground";
const VIEW_MODE_CONTROL =
  "disabled:opacity-100 disabled:bg-muted disabled:text-foreground";

interface ProfileFormValues {
  fullName: string;
  ieltsTargetScore: number | null;
  targetTestDate: string; // yyyy-MM-dd, "" when unset
}

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: userProfile,
    isLoading,
    error,
    refetch,
    mutate,
  } = useApi<User>("/api/me");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: { fullName: "", ieltsTargetScore: null, targetTestDate: "" },
  });

  // Update form when user profile data loads
  useEffect(() => {
    if (userProfile) {
      reset({
        fullName: userProfile.fullName ?? "",
        ieltsTargetScore: userProfile.ieltsTargetScore,
        targetTestDate: userProfile.targetTestDate
          ? new Date(userProfile.targetTestDate).toLocaleDateString("en-CA")
          : "",
      });
    }
  }, [userProfile, reset]);

  const handleSaveProfile = async (data: ProfileFormValues) => {
    setIsSaving(true);
    // Backend stores 0 / default(DateTimeOffset) as "not set" and returns null for them.
    await mutate({
      url: "/api/me",
      method: "PUT",
      data: {
        fullName: data.fullName,
        ieltsTargetScore: data.ieltsTargetScore ?? 0,
        targetTestDate: data.targetTestDate
          ? new Date(data.targetTestDate).toISOString()
          : "0001-01-01T00:00:00+00:00",
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
    setIsSaving(false);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
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
                    className="sm:shrink-0"
                  >
                    <Settings />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      form="profile-form"
                      disabled={isSaving || !isDirty}
                    >
                      {isSaving ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      {isSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submitting via the form (not an onClick) so Enter saves instead
                  of triggering a native GET reload that would drop the edits. */}
              <form
                id="profile-form"
                onSubmit={handleSubmit(handleSaveProfile)}
                className="space-y-4"
              >
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fullName"
                        {...register("fullName")}
                        readOnly={!isEditing}
                        className={`pl-10 ${READ_ONLY_FIELD}`}
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        value={userProfile?.email || ""}
                        readOnly // Email is set by the sign-in provider
                        className={`pl-10 ${READ_ONLY_FIELD}`}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>

                {/* IELTS Goals */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    IELTS Goals
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          setValue("ieltsTargetScore", parseFloat(value), {
                            shouldDirty: true,
                          })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger
                          id="ieltsTargetScore"
                          className={`w-full ${VIEW_MODE_CONTROL}`}
                        >
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

                    <div className="space-y-2">
                      <Label
                        htmlFor="targetTestDate"
                        className="text-sm font-medium"
                      >
                        Target Test Date
                      </Label>
                      <div className="relative">
                        <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        {/* date inputs ignore readOnly for the native picker,
                            so this one stays disabled outside edit mode. */}
                        <Input
                          id="targetTestDate"
                          type="date"
                          {...register("targetTestDate")}
                          disabled={!isEditing}
                          className={`pl-10 ${VIEW_MODE_CONTROL}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Account Status — only what the form beside it does not already show */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <dt className="text-sm text-muted-foreground">Plan</dt>
                  <dd>
                    <Badge
                      variant={
                        userProfile?.plan === "Free" ? "secondary" : "default"
                      }
                    >
                      {userProfile?.plan || "Free"}
                    </Badge>
                  </dd>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <dt className="text-sm text-muted-foreground">Member since</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {userProfile?.createdAt
                      ? new Date(userProfile.createdAt).toLocaleDateString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
