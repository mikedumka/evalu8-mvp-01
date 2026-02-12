import { useState, useEffect } from "react";
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
import { Checkbox } from "../ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"];
type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type PreviousLevelRow = Database["public"]["Tables"]["previous_levels"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

interface CSVRow {
  "First Name": string;
  "Last Name": string;
  Birthdate: string;
  Gender?: string;
  Position: string;
  Cohort?: string;
  "Previous Level"?: string;
  Phone?: string;
  "Email 1"?: string;
  "Email 2"?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  row: CSVRow;
  rowIndex: number;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  isValid: boolean;
  mappedData?: {
    first_name: string;
    last_name: string;
    birth_date: string;
    birth_year: number;
    position_type_id: string;
    cohort_id: string | null;
    gender: string | null;
    previous_level_id: string | null;
    phone: string | null;
    email_1: string | null;
    email_2: string | null;
  };
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const { currentAssociation } = useAuth();
  const [step, setStep] = useState<"upload" | "review" | "importing">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  // Reference Data
  const [positions, setPositions] = useState<PositionTypeRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [previousLevels, setPreviousLevels] = useState<PreviousLevelRow[]>([]);
  const [existingPlayers, setExistingPlayers] = useState<PlayerRow[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Validation Results
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(
    new Set()
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("upload");
      setFile(null);
      setResults([]);
      setSelectedDuplicates(new Set());
      void fetchReferenceData();
    }
  }, [open]);

  const fetchReferenceData = async () => {
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

      // 2. Get Positions
      const { data: posData } = await supabase
        .from("position_types")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active");
      setPositions(posData || []);

      // 3. Get Cohorts
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name");
      setCohorts(cohortData || []);

      // 4. Get Previous Levels
      const { data: prevLevelData } = await supabase
        .from("previous_levels")
        .select("*")
        .eq("association_id", currentAssociation.association_id);
      setPreviousLevels(prevLevelData || []);

      // 5. Get Existing Players (for duplicate checking)
      if (seasonData?.id) {
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("association_id", currentAssociation.association_id)
          .eq("season_id", seasonData.id);
        setExistingPlayers(playerData || []);
      }
    } catch (err) {
      console.error("Error fetching reference data:", err);
    } finally {
      setLoadingRefs(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Birthdate",
      "Gender",
      "Position",
      "Cohort",
      "Previous Level",
      "Phone",
      "Email 1",
      "Email 2",
    ];
    const csvContent =
      headers.join(",") +
      "\n" +
      "John,Doe,05/15/2010,Male,Forward,U15,A,555-0101,john.dad@email.com,john.mom@email.com";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "player_import_template.csv");
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
      const warnings: string[] = [];
      let isDuplicate = false;

      // 1. Required Fields
      if (!row["First Name"]?.trim()) errors.push("First Name is required");
      if (!row["Last Name"]?.trim()) errors.push("Last Name is required");
      if (!row["Birthdate"]?.trim()) errors.push("Birthdate is required");
      if (!row["Position"]?.trim()) errors.push("Position is required");

      // 2. Data Format Validation
      let birthYear = 0;
      let birthDateStr = "";

      if (row["Birthdate"]?.trim()) {
        const dateParts = row["Birthdate"].trim().split("/");
        if (dateParts.length === 3) {
          const month = parseInt(dateParts[0]);
          const day = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);

          if (
            !isNaN(month) &&
            !isNaN(day) &&
            !isNaN(year) &&
            year > 1900 &&
            year <= new Date().getFullYear()
          ) {
            // Create ISO string for DB (YYYY-MM-DD)
            birthDateStr = `${year}-${month.toString().padStart(2, "0")}-${day
              .toString()
              .padStart(2, "0")}`;
            birthYear = year;
          } else {
            errors.push("Invalid Birthdate (use m/d/yyyy)");
          }
        } else {
          errors.push("Invalid Birthdate format (use m/d/yyyy)");
        }
      }

      // 3. Reference Data Validation
      let positionId = "";
      if (row["Position"]) {
        const pos = positions.find(
          (p) => p.name.toLowerCase() === row["Position"].trim().toLowerCase()
        );
        if (pos) {
          positionId = pos.id;
        } else {
          errors.push(`Position '${row["Position"]}' not found`);
        }
      }

      let cohortId: string | null = null;
      if (row["Cohort"]?.trim()) {
        const cohort = cohorts.find(
          (c) => c.name.toLowerCase() === row["Cohort"]?.trim().toLowerCase()
        );
        if (cohort) {
          cohortId = cohort.id;
        } else {
          errors.push(`Cohort '${row["Cohort"]}' not found`);
        }
      }

      let previousLevelId: string | null = null;
      if (row["Previous Level"]?.trim()) {
        const prevLevel = previousLevels.find(
          (pl) =>
            pl.name.toLowerCase() ===
            row["Previous Level"]?.trim().toLowerCase()
        );
        if (prevLevel) {
          previousLevelId = prevLevel.id;
        } else {
          errors.push(`Previous Level '${row["Previous Level"]}' not found`);
        }
      }

      // 4. Duplicate Check
      if (row["First Name"] && row["Last Name"] && birthDateStr) {
        const duplicate = existingPlayers.find(
          (p) =>
            p.first_name.toLowerCase() ===
              row["First Name"].trim().toLowerCase() &&
            p.last_name.toLowerCase() ===
              row["Last Name"].trim().toLowerCase() &&
            (p.birth_date === birthDateStr || p.birth_year === birthYear) // Check both for backward compatibility
        );
        if (duplicate) {
          isDuplicate = true;
          warnings.push("Player already exists in this season");
        }
      }

      // 5. Gender Normalization (Optional)
      let gender: string | null = null;
      if (row["Gender"]?.trim()) {
        const g = row["Gender"].trim();
        // Simple normalization, can be expanded
        if (["Male", "M", "Boy"].includes(g)) gender = "Male";
        else if (["Female", "F", "Girl"].includes(g)) gender = "Female";
        else gender = "Other";
      }

      return {
        row,
        rowIndex: index + 2, // +2 for 1-based index and header row
        errors,
        warnings,
        isDuplicate,
        isValid: errors.length === 0,
        mappedData:
          errors.length === 0
            ? {
                first_name: row["First Name"].trim(),
                last_name: row["Last Name"].trim(),
                birth_date: birthDateStr,
                birth_year: birthYear,
                position_type_id: positionId,
                cohort_id: cohortId,
                gender: gender,
                previous_level_id: previousLevelId,
                phone: row["Phone"]?.trim() || null,
                email_1: row["Email 1"]?.trim() || null,
                email_2: row["Email 2"]?.trim() || null,
              }
            : undefined,
      };
    });

    setResults(validationResults);
  };

  const handleImport = async () => {
    if (!currentAssociation || !activeSeasonId) return;
    setStep("importing");

    const recordsToInsert = results
      .filter((r) => r.isValid)
      .filter((r) => !r.isDuplicate || selectedDuplicates.has(r.rowIndex))
      .map((r) => ({
        association_id: currentAssociation.association_id,
        season_id: activeSeasonId,
        status: "active",
        ...r.mappedData!,
      }));

    if (recordsToInsert.length === 0) {
      setStep("review");
      return;
    }

    try {
      const { error } = await supabase.from("players").insert(recordsToInsert);

      if (error) throw error;

      onSuccess(`Successfully imported ${recordsToInsert.length} players.`);
      onOpenChange(false);
    } catch (err) {
      console.error("Import failed:", err);
      // In a real app, we might want to show specific errors here
      setStep("review");
    }
  };

  const validCount = results.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateCount = results.filter((r) => r.isDuplicate).length;
  const errorCount = results.filter((r) => !r.isValid).length;
  const selectedDuplicateCount = selectedDuplicates.size;
  const totalToImport = validCount + selectedDuplicateCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Players</DialogTitle>
          <DialogDescription>
            Upload a CSV file to register multiple players at once.
          </DialogDescription>
        </DialogHeader>

        {!activeSeasonId && !loadingRefs ? (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              No Active Season
            </div>
            <p className="mt-1 text-sm">
              You must have an active season to import players. Please activate
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                    {duplicateCount} Duplicates
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
                    <TabsTrigger value="duplicates">
                      Duplicates ({duplicateCount})
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
                            <th className="p-2 font-medium">Birthdate</th>
                            <th className="p-2 font-medium">Position</th>
                            <th className="p-2 font-medium">Cohort</th>
                            <th className="p-2 font-medium">Gender</th>
                            <th className="p-2 font-medium">Prev. Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results
                            .filter((r) => r.isValid && !r.isDuplicate)
                            .map((r) => (
                              <tr key={r.rowIndex}>
                                <td className="p-2 text-muted-foreground">
                                  {r.rowIndex}
                                </td>
                                <td className="p-2 font-medium">
                                  {r.row["Last Name"]}, {r.row["First Name"]}
                                </td>
                                <td className="p-2">{r.row["Birthdate"]}</td>
                                <td className="p-2">{r.row["Position"]}</td>
                                <td className="p-2">
                                  {r.row["Cohort"] || "-"}
                                </td>
                                <td className="p-2">
                                  {r.row["Gender"] || "-"}
                                </td>
                                <td className="p-2">
                                  {r.row["Previous Level"] || "-"}
                                </td>
                              </tr>
                            ))}
                          {results.filter((r) => r.isValid && !r.isDuplicate)
                            .length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
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
                    value="duplicates"
                    className="flex-1 overflow-hidden mt-2"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        These players appear to already exist in the active
                        season. Select the ones you want to import anyway.
                      </p>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-md">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground sticky top-0">
                          <tr>
                            <th className="p-2 w-10">
                              <Checkbox
                                checked={
                                  duplicateCount > 0 &&
                                  selectedDuplicates.size === duplicateCount
                                }
                                onCheckedChange={(
                                  checked: boolean | "indeterminate"
                                ) => {
                                  if (checked === true) {
                                    const allDupIndices = results
                                      .filter((r) => r.isDuplicate)
                                      .map((r) => r.rowIndex);
                                    setSelectedDuplicates(
                                      new Set(allDupIndices)
                                    );
                                  } else {
                                    setSelectedDuplicates(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="p-2 font-medium">Row</th>
                            <th className="p-2 font-medium">Name</th>
                            <th className="p-2 font-medium">Birthdate</th>
                            <th className="p-2 font-medium">Position</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results
                            .filter((r) => r.isDuplicate)
                            .map((r) => (
                              <tr
                                key={r.rowIndex}
                                className="bg-amber-50/50 dark:bg-amber-900/10"
                              >
                                <td className="p-2">
                                  <Checkbox
                                    checked={selectedDuplicates.has(r.rowIndex)}
                                    onCheckedChange={(
                                      checked: boolean | "indeterminate"
                                    ) => {
                                      const newSet = new Set(
                                        selectedDuplicates
                                      );
                                      if (checked === true)
                                        newSet.add(r.rowIndex);
                                      else newSet.delete(r.rowIndex);
                                      setSelectedDuplicates(newSet);
                                    }}
                                  />
                                </td>
                                <td className="p-2 text-muted-foreground">
                                  {r.rowIndex}
                                </td>
                                <td className="p-2 font-medium">
                                  {r.row["Last Name"]}, {r.row["First Name"]}
                                </td>
                                <td className="p-2">{r.row["Birthdate"]}</td>
                                <td className="p-2">{r.row["Position"]}</td>
                              </tr>
                            ))}
                          {duplicateCount === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-8 text-center text-muted-foreground"
                              >
                                No duplicates found.
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
                                    {r.row["Last Name"] || "?"},{" "}
                                    {r.row["First Name"] || "?"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {r.row["Position"] || "No Pos"} •{" "}
                                    {r.row["Birth Year"] || "No Year"}
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
                  setSelectedDuplicates(new Set());
                }}
                disabled={step === "importing"}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={totalToImport === 0 || step === "importing"}
              >
                {step === "importing" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Import {totalToImport} Players
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
