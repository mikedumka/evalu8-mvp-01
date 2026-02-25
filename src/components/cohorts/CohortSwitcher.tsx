import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Cohort {
  id: string;
  name: string;
}

interface CohortSwitcherProps {
  selectedCohortId: string;
  onCohortChange: (id: string) => void;
  className?: string;
}

export function CohortSwitcher({
  selectedCohortId,
  onCohortChange,
  className,
}: CohortSwitcherProps) {
  const { currentAssociation } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCohorts() {
      if (!currentAssociation?.association_id) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from("cohorts")
          .select("id, name")
          .eq("association_id", currentAssociation.association_id)
          .eq("status", "active")
          .order("name");

        if (data) {
          setCohorts(data);
          // Verify validity of selection
          if (
            selectedCohortId &&
            !data.find((c) => c.id === selectedCohortId)
          ) {
            onCohortChange("");
          }
        }
      } catch (error) {
        console.error("Error fetching cohorts", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCohorts();
  }, [currentAssociation?.association_id]);

  return (
    <div className={cn(className)}>
      <Select
        value={selectedCohortId}
        onValueChange={onCohortChange}
        disabled={loading || cohorts.length === 0}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={loading ? "Loading cohorts..." : "Select cohort..."}
          />
        </SelectTrigger>
        <SelectContent>
          {cohorts.map((cohort) => (
            <SelectItem key={cohort.id} value={cohort.id}>
              {cohort.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
