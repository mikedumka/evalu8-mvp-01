import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/types/database.types";
import { DrillConfiguration } from "./DrillConfiguration";
import { StaffConfiguration } from "./StaffConfiguration";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  cohort: { name: string } | null;
  location: { name: string } | null;
};

interface ConfigureSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
}

export function ConfigureSessionDialog({
  open,
  onOpenChange,
  session,
}: ConfigureSessionDialogProps) {
  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>
            Configure Session:{" "}
            {new Date(session.scheduled_date).toLocaleDateString()} @{" "}
            {session.location?.name}
          </DialogTitle>
          <DialogDescription>
            {session.cohort?.name} • {session.scheduled_time}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="drills"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="drills">Drill Configuration</TabsTrigger>
            <TabsTrigger value="staff">Staff Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="drills" className="flex-1 overflow-hidden mt-0">
            <DrillConfiguration session={session} />
          </TabsContent>

          <TabsContent value="staff" className="flex-1 overflow-hidden mt-0">
            <StaffConfiguration session={session} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
