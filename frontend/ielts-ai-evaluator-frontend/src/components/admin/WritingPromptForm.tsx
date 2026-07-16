import { useForm } from "react-hook-form";
import WritingPrompt, { WritingPromptUpsertRequest } from "@/types/WritingPrompt";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WritingPromptFormProps {
  prompt?: WritingPrompt;
  onSubmit: (data: WritingPromptUpsertRequest) => void;
  onCancel: () => void;
}

const FieldError = ({ show, label }: { show: boolean; label: string }) =>
  show ? <p className="text-sm text-destructive mt-1">{label} is required.</p> : null;

export const WritingPromptForm = ({ prompt, onSubmit, onCancel }: WritingPromptFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WritingPromptUpsertRequest>({
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input {...register("topic", { required: true })} placeholder="Enter topic" />
          <FieldError show={!!errors.topic} label="Topic" />
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
        <FieldError show={!!errors.description} label="Description" />
      </div>

      <div>
        <Label htmlFor="preview">Preview</Label>
        <Input {...register("preview", { required: true })} placeholder="Enter preview text" />
        <FieldError show={!!errors.preview} label="Preview" />
      </div>

      <div>
        <Label htmlFor="questionText">Question Text</Label>
        <Textarea
          {...register("questionText", { required: true })}
          placeholder="Enter the full question"
        />
        <FieldError show={!!errors.questionText} label="Question text" />
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
            {...register("minimumWords", { required: true, valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="taskType">Task Type</Label>
          <Select
            value={watch("taskType")}
            onValueChange={(value) => setValue("taskType", value as "Task1" | "Task2")}
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
            onValueChange={(value) => setValue("level", value as "Academic" | "General")}
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
        <Input {...register("imageUrl")} placeholder="Enter image URL for Task 1" />
      </div>

      <div>
        <Label htmlFor="imageDescription">Image Description (optional)</Label>
        <Input
          {...register("imageDescription")}
          placeholder="Enter image description for Task 1"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={watch("isActive")}
          onChange={(e) => setValue("isActive", e.target.checked)}
        />
        <Label htmlFor="isActive">Active (visible to students)</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{prompt ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
};
