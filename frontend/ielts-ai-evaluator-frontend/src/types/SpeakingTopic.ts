export default interface SpeakingTopic {
  id: string;
  topic: string;
  description: string;
  part: "Part1" | "Part2" | "Part3";
  duration: number;
}
