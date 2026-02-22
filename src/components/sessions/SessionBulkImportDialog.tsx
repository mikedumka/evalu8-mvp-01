import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  FileUp,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

interface SessionBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  autoGenerateNames?: boolean;
}

interface CSVRow {
  "Session Name": string;
  Date: string;
  Time: string;
  Duration: string;
  Location: string;
  Cohort: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  row: CSVRow;
  rowIndex: number;
  errors: string[];
  isValid: boolean;
  mappedData?: {
    name: string;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes: number;
    location_id: string | null;
    cohort_id: string;
  };
}

export function SessionBulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
  autoGenerateNames = false,
}: SessionBulkImportDialogProps) {
  const { currentAssociation } = useAuth();
  const [step, setStep] = useState<"upload" | "review" | "importing">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  // Reference Data
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [existingSessions, setExistingSessions] = useState<
    {
      scheduled_date: string;
      scheduled_time: string;
      location_id: string | null;
      cohort_id: string | null;
    }[]
  >([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Validation Results
  const [results, setResults] = useState<ValidationResult[]>([]);
  const prevOpenRef = useRef(open);

  const fetchReferenceData = useCallback(async () => {
    if (!currentAssociation) return;
    setLoadingRefs(true);
    try {
      // 1. Get Active Season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("id")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .maybeSingle();

      setActiveSeasonId(seasonData?.id || null);

      if (seasonData?.id) {
        // Fetch existing sessions for duplicate checking
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("scheduled_date, scheduled_time, location_id, cohort_id")
          .eq("season_id", seasonData.id);
        setExistingSessions(sessionData || []);
      }

      // 2. Get Cohorts
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name");
      setCohorts(cohortData || []);

      // 3. Get Locations
      const { data: locationData } = await supabase
        .from("locations")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("name");
      setLocations(locationData || []);
    } catch (err) {
      console.error("Error fetching reference data:", err);
    } finally {
      setLoadingRefs(false);
    }
  }, [currentAssociation]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep("upload");
      setFile(null);
      setResults([]);
      void fetchReferenceData();
    }
    prevOpenRef.current = open;
  }, [open, fetchReferenceData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    let headers = [
      "Session Name",
      "Date",
      "Time",
      "Duration",
      "Location",
      "Cohort",
    ];

    let exampleRow = "U11 Evaluation 1,11/15/2025,18:00,60,Main Arena,U11";

    if (autoGenerateNames) {
      // Remove Session Name from template
      headers = headers.filter((h) => h !== "Session Name");
      // Adjust example row
      exampleRow = "11/15/2025,18:00,60,Main Arena,U11";
    }

    const csvContent = headers.join(",") + "\n" + exampleRow;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "session_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = () => {
    if (!file || !activeSeasonId) return;
    setParsing(true);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize headers to Title Case
        const map: Record<string, string> = {
          "session name": "Session Name",
          session: "Session Name", // Alias
          date: "Date",
          time: "Time",
          duration: "Duration",
          location: "Location",
          cohort: "Cohort",
        };
        return map[header.toLowerCase().trim()] || header.trim();
      },
      complete: (results) => {
        validateRows(results.data);
        setParsing(false);
        setStep("review");
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setParsing(false);
      },
    });
  };

  const validateRows = (rows: CSVRow[]) => {
    const validationResults: ValidationResult[] = rows.map((row, index) => {
      const errors: string[] = [];

      // 1. Required Fields
      if (!autoGenerateNames && !row["Session Name"]?.trim())
        errors.push("Session Name is required");
      if (!row["Date"]?.trim()) errors.push("Date is required");
      if (!row["Time"]?.trim()) errors.push("Time is required");
      if (!row["Location"]?.trim()) errors.push("Location is required");
      if (!row["Cohort"]?.trim()) errors.push("Cohort is required");

      // 3. Data Format Validation
      let scheduledDateStr = "";
      if (row["Date"]?.trim()) {
        const dateParts = row["Date"].trim().split("/");
        if (dateParts.length === 3) {
          const month = parseInt(dateParts[0]);
          const day = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);

          if (
            !isNaN(month) &&
            !isNaN(day) &&
            !isNaN(year) &&
            year > 1900 &&
            year <= new Date().getFullYear() + 5 // Allow future dates
          ) {
            scheduledDateStr = `${year}-${month
              .toString()
              .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
          } else {
            errors.push("Invalid Date (use MM/DD/YYYY)");
          }
        } else {
          // Try YYYY-MM-DD
          const isoParts = row["Date"].trim().split("-");
          if (isoParts.length === 3) {
            scheduledDateStr = row["Date"].trim();
          } else {
            errors.push("Invalid Date format (use MM/DD/YYYY)");
          }
        }
      }

      // Time Validation (Simple check)
      let scheduledTimeStr = row["Time"]?.trim() || "";
      // If it's like 6:00 PM, convert to 18:00:00?
      // For now, assume the user provides valid time string or we just store it.
      // But Supabase `time` type expects HH:MM:SS.
      // Let's try to normalize simple HH:MM
      if (scheduledTimeStr.match(/^\d{1,2}:\d{2}$/)) {
        scheduledTimeStr += ":00";
      }

      // Duration
      let duration = 60;
      if (row["Duration"]?.trim()) {
        const d = parseInt(row["Duration"].trim());
        if (!isNaN(d) && d > 0) {
          duration = d;
        } else {
          errors.push("Duration must be a positive number");
        }
      }

      // 4. Reference Data Validation
      let cohortId = "";
      let locationId = "";
      let sessionName = row["Session Name"]?.trim() || "";

      if (row["Location"]?.trim()) {
        const loc = locations.find(
          (l) => l.name.toLowerCase() === row["Location"]?.trim().toLowerCase(),
        );
        if (loc) {
          locationId = loc.id;
        } else {
          // Keep showing user error, but technically could be allowed to be null if optional? Usually location is required.
          const availableLocations = locations.map((l) => l.name).join(", ");
          errors.push(
            `Location '${row["Location"]}' not found. Available locations: ${availableLocations}`,
          );
        }
      }

      if (row["Cohort"]?.trim()) {
        const cohort = cohorts.find(
          (c) => c.name.toLowerCase() === row["Cohort"]?.trim().toLowerCase(),
        );
        if (cohort) {
          cohortId = cohort.id;

          if (autoGenerateNames) {
            // (COHORT) + "SESSION" + (2 Digit Row Number starting at 01 for the Import)
            // Example: U13-COED-SESSION-01
            // Use index + 1 for counting sessions in this import batch
            const sessionNum = (index + 1).toString().padStart(2, "0");
            // Normalize cohort name for display if needed, but requirements say (COHORT)
            // Assuming strict uppercase or trimmed name
            const cohortPrefix = cohort.name.toUpperCase().replace(/\s+/g, "-");
            sessionName = `${cohortPrefix}-SESSION-${sessionNum}`;
          }
        } else {
          const availableCohorts = cohorts.map((c) => c.name).join(", ");
          errors.push(
            `Cohort '${row["Cohort"]}' not found. Available cohorts: ${availableCohorts}`,
          );
        }
      }

      // 5. Duplicate Detection
      // A) Duplicate within the import file itself
      const duplicateInFile = rows.find(
        (chk, chkIdx) =>
          chkIdx < index &&
          chk["Cohort"] === row["Cohort"] &&
          chk["Date"] === row["Date"] &&
          chk["Time"] === row["Time"],
      );
      if (duplicateInFile) {
        errors.push("Duplicate session found within this import file.");
      }

      // B) Duplicate against existing sessions in DB
      // Convert current row Date/Time to match DB format for comparison?
      // Actually DB stores strings for date, time.
      // scheduledDateStr is YYYY-MM-DD
      // scheduledTimeStr is HH:MM:SS
      if (
        scheduledDateStr &&
        scheduledTimeStr &&
        cohortId &&
        existingSessions.length > 0
      ) {
        const isDuplicate = existingSessions.some(
          (s) =>
            s.scheduled_date === scheduledDateStr &&
            s.scheduled_time === scheduledTimeStr &&
            s.cohort_id === cohortId,
        );

        if (isDuplicate) {
          errors.push(
            "This session already exists in the system (Same Cohort, Date & Time).",
          );
        }
      }

      return {
        row,
        rowIndex: index + 2,
        errors,
        isValid: errors.length === 0,
        mappedData:
          errors.length === 0
            ? {
                name: sessionName,
                scheduled_date: scheduledDateStr,
                scheduled_time: scheduledTimeStr,
                duration_minutes: duration,
                location_id: locationId,
                cohort_id: cohortId,
              }
            : undefined,
      };
    });

    setResults(validationResults);
  };

  const handleImport = async () => {
    if (!currentAssociation || !activeSeasonId) return;
    setStep("importing");

    try {
      // Group sessions by cohort
      const validResults = results.filter((r) => r.isValid);

      // Get unique cohort IDs from the import data
      const cohortIds = Array.from(
        new Set(validResults.map((r) => r.mappedData!.cohort_id)),
      );

      for (const cohortId of cohortIds) {
        // Get all sessions for this cohort
        const cohortSessions = validResults
          .filter((r) => r.mappedData!.cohort_id === cohortId)
          .sort((a, b) => {
            // Sort by date and time to ensure chronological order for waves
            const dateA = new Date(
              `${a.mappedData!.scheduled_date}T${a.mappedData!.scheduled_time}`,
            );
            const dateB = new Date(
              `${b.mappedData!.scheduled_date}T${b.mappedData!.scheduled_time}`,
            );
            return dateA.getTime() - dateB.getTime();
          });

        if (cohortSessions.length === 0) continue;

        // 1. Get Cohort Details & Player Count for Wave Calculation
        const { data: cohort, error: cohortError } = await supabase
          .from("cohorts")
          .select("session_capacity, minimum_sessions_per_athlete")
          .eq("id", cohortId)
          .single();

        if (cohortError || !cohort) {
          console.error(
            `Could not fetch details for cohort ${cohortId}`,
            cohortError,
          );
          continue;
        }

        // Get Player Count for this cohort in the active season
        const { count: playerCount, error: playerError } = await supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("cohort_id", cohortId)
          .eq("status", "active")
          .eq("season_id", activeSeasonId);

        if (playerError) {
          console.error(
            `Could not fetch player count for cohort ${cohortId}`,
            playerError,
          );
          continue;
        }

        const sessionCapacity =
          cohort.session_capacity && cohort.session_capacity > 0
            ? cohort.session_capacity
            : 20; // Default buffer
        // Calculate Sessions Per Wave: Total Active Players / Session Capacity (rounded up)
        const sessionsPerWave =
          Math.ceil((playerCount || 0) / sessionCapacity) || 1;

        // 2. Determine Starting Wave Number (Check existing waves)
        const { data: existingWaves } = await supabase
          .from("waves")
          .select("wave_number")
          .eq("cohort_id", cohortId)
          .eq("season_id", activeSeasonId)
          .eq("wave_type", "standard")
          .order("wave_number", { ascending: false })
          .limit(1);

        let nextWaveNumber = (existingWaves?.[0]?.wave_number || 0) + 1;

        // 3. Create Waves and Assign Sessions
        let processedCount = 0;

        while (processedCount < cohortSessions.length) {
          // Determine sessions for this wave
          const sessionsForThisWave = cohortSessions.slice(
            processedCount,
            processedCount + sessionsPerWave,
          );

          // Create a new Wave record
          const { data: newWave, error: waveError } = await supabase
            .from("waves")
            .insert({
              season_id: activeSeasonId,
              association_id: currentAssociation.association_id,
              cohort_id: cohortId,
              wave_number: nextWaveNumber,
              wave_type: "standard",
              status: "not_started",
            })
            .select()
            .single();

          if (waveError) {
            console.error("Failed to create wave:", waveError);
            throw waveError;
          }

          // Insert Sessions linked to this Wave
          const sessionsPayload = sessionsForThisWave.map((s) => ({
            association_id: currentAssociation.association_id,
            season_id: activeSeasonId,
            status: "draft",
            wave_id: newWave.id, // Link to the newly created wave
            ...s.mappedData!,
          }));

          const { error: sessionError } = await supabase
            .from("sessions")
            .insert(sessionsPayload);

          if (sessionError) {
            console.error("Failed to insert sessions:", sessionError);
            throw sessionError;
          }

          processedCount += sessionsForThisWave.length;
          nextWaveNumber++;
        }
      }

      onSuccess(`Successfully imported sessions and generated waves.`);
      onOpenChange(false);
    } catch (err) {
      console.error("Import process failed:", err);
      // Ideally show user an error message, but component uses simple onSuccess callback
    } finally {
      setStep("review"); // Reset or close? Maybe close if success.
      // If success loop finished, success called. If error, catch block log.
    }
  };

  const validCount = results.filter((r) => r.isValid).length;
  const errorCount = results.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Sessions</DialogTitle>
          <DialogDescription>
            Upload a CSV file to schedule multiple sessions at once.
          </DialogDescription>
        </DialogHeader>

        {!activeSeasonId && !loadingRefs ? (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              No Active Season
            </div>
            <p className="mt-1 text-sm">
              You must have an active season to import sessions. Please activate
              a season first.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            {step === "upload" && (
              <div className="flex flex-col items-center justify-center gap-6 py-8 border-2 border-dashed rounded-lg bg-muted/30">
                <div className="p-4 rounded-full bg-muted">
                  <FileUp className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Drag and drop your file here or click to browse.
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={handleFileChange}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 size-4" />
                    Download Template
                  </Button>
                  <Button asChild>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      Select File
                    </label>
                  </Button>
                </div>
                {file && (
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle2 className="size-4" />
                    {file.name}
                  </div>
                )}
              </div>
            )}

            {step === "review" && (
              <div className="flex flex-col h-full gap-4">
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" />
                    {validCount} Valid
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/15 text-destructive">
                    <XCircle className="size-4" />
                    {errorCount} Errors
                  </div>
                </div>

                <Tabs
                  defaultValue="valid"
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <TabsList>
                    <TabsTrigger value="valid">
                      Valid Records ({validCount})
                    </TabsTrigger>
                    <TabsTrigger value="errors">
                      Errors ({errorCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="valid"
                    className="flex-1 overflow-hidden mt-2"
                  >
                    <ScrollArea className="h-[300px] border rounded-md">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-2 font-medium">Row</th>
                            <th className="p-2 font-medium">Name</th>
                            <th className="p-2 font-medium">Date/Time</th>
                            <th className="p-2 font-medium">Location</th>
                            <th className="p-2 font-medium">Cohort</th>
                            <th className="p-2 font-medium">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results
                            .filter((r) => r.isValid)
                            .map((r) => (
                              <tr key={r.rowIndex}>
                                <td className="p-2 text-muted-foreground">
                                  {r.rowIndex}
                                </td>
                                <td className="p-2 font-medium">
                                  {r.row["Session Name"]}
                                </td>
                                <td className="p-2">
                                  {r.row["Date"]} {r.row["Time"]}
                                </td>
                                <td className="p-2">{r.row["Location"]}</td>
                                <td className="p-2">{r.row["Cohort"]}</td>
                                <td className="p-2">
                                  {r.row["Duration"] || "60"} min
                                </td>
                              </tr>
                            ))}
                          {validCount === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="p-8 text-center text-muted-foreground"
                              >
                                No valid records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent
                    value="errors"
                    className="flex-1 overflow-hidden mt-2"
                  >
                    <ScrollArea className="h-[300px] border rounded-md">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-2 font-medium">Row</th>
                            <th className="p-2 font-medium">Data</th>
                            <th className="p-2 font-medium">Issues</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results
                            .filter((r) => !r.isValid)
                            .map((r) => (
                              <tr key={r.rowIndex} className="bg-destructive/5">
                                <td className="p-2 text-muted-foreground">
                                  {r.rowIndex}
                                </td>
                                <td className="p-2">
                                  <div className="font-medium">
                                    {r.row["Session Name"] || "?"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {r.row["Cohort"] || "No Cohort"} •{" "}
                                    {r.row["Date"] || "?"}
                                  </div>
                                </td>
                                <td className="p-2 text-destructive">
                                  <ul className="list-disc list-inside">
                                    {r.errors.map((err, i) => (
                                      <li key={i}>{err}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                          {errorCount === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-8 text-center text-muted-foreground"
                              >
                                No errors found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={processFile}
                disabled={!file || !activeSeasonId || parsing}
              >
                {parsing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Review Import
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setResults([]);
                }}
                disabled={step === "importing"}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || step === "importing"}
              >
                {step === "importing" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Import {validCount} Sessions
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
