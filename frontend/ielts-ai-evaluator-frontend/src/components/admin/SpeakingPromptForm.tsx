import { useForm } from "react-hook-form";
import {
  SpeakingPart,
  SpeakingPrompt,
  SpeakingPromptUpsertRequest,
} from "@/types/Speaking";
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

interface SpeakingPromptFormProps {
  prompt?: SpeakingPrompt;
  onSubmit: (data: SpeakingPromptUpsertRequest) => void;
  onCancel: () => void;
}

const FieldError = ({ show, label }: { show: boolean; label: string }) =>
  show ? <p className="text-sm text-destructive mt-1">{label} is required.</p> : null;

export const SpeakingPromptForm = ({ prompt, onSubmit, onCancel }: SpeakingPromptFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SpeakingPromptUpsertRequest>({
    defaultValues: prompt ?? {
      topic: "",
      description: "",
      preview: "",
      part: "Part2",
      questionText: "",
      cuepoints: "",
      duration: 120,
      level: "Academic",
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
          <Label htmlFor="part">Part</Label>
          <Select
            value={watch("part")}
            onValueChange={(value) => setValue("part", value as SpeakingPart)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select part" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Part1">Part 1 — Interview</SelectItem>
              <SelectItem value="Part2">Part 2 — Cue Card</SelectItem>
              <SelectItem value="Part3">Part 3 — Discussion</SelectItem>
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
        <Label htmlFor="questionText">Question / Cue Card Text</Label>
        <Textarea
          {...register("questionText", { required: true })}
          placeholder="Enter the main question or cue card text"
        />
        <FieldError show={!!errors.questionText} label="Question text" />
      </div>

      <div>
        <Label htmlFor="cuepoints">Cue Points (optional, one per line — mainly Part 2)</Label>
        <Textarea
          {...register("cuepoints")}
          placeholder={"what it is\nwhy it matters\nhow you use it"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            type="number"
            {...register("duration", { required: true, valueAsNumber: true })}
          />
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

      <div className="flex items-center gap-2">
        <Checkbox
          id="speakingIsActive"
          checked={watch("isActive")}
          onChange={(e) => setValue("isActive", e.target.checked)}
        />
        <Label htmlFor="speakingIsActive">Active (visible to students)</Label>
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
