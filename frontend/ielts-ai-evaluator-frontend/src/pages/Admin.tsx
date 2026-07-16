import { useState } from "react";
import { FileText, Mic, Users2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { WritingPromptsTab } from "@/components/admin/WritingPromptsTab";
import { SpeakingPromptsTab } from "@/components/admin/SpeakingPromptsTab";
import { UsersTab } from "@/components/admin/UsersTab";

const triggerClass =
  "cursor-pointer rounded-sm data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground items-center flex justify-center transition-colors duration-200";

const Admin = () => {
  const [tab, setTab] = useState("writing");

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
        <p className="text-foreground font-medium text-lg">
          Manage writing tasks, speaking tasks and users
        </p>
      </div>

      <Tabs className="space-y-4" value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 dark:bg-card border border-border p-1 rounded-sm h-10">
          <TabsTrigger value="writing" className={triggerClass}>
            <FileText className="h-4 w-4 mr-2" />
            Writing Tasks
          </TabsTrigger>
          <TabsTrigger value="speaking" className={triggerClass}>
            <Mic className="h-4 w-4 mr-2" />
            Speaking Tasks
          </TabsTrigger>
          <TabsTrigger value="user" className={triggerClass}>
            <Users2 className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writing" className="space-y-4">
          <WritingPromptsTab />
        </TabsContent>
        <TabsContent value="speaking" className="space-y-4">
          <SpeakingPromptsTab />
        </TabsContent>
        <TabsContent value="user" className="space-y-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
