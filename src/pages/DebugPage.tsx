import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function DebugPage() {
  const { currentAssociation } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const [seasons, setSeasons] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!currentAssociation) return;

      // Fetch Cohorts
      const { data: cohorts, error: err } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id);

      if (err) setError(err);
      else setData(cohorts);

      // Fetch Seasons
      const { data: seasonsData, error: seasonError } = await supabase
        .from("seasons")
        .select("*")
        .eq("association_id", currentAssociation.association_id);

      if (seasonError) console.error("Season Error:", seasonError);
      setSeasons(seasonsData);
    }

    fetchData();
  }, [currentAssociation]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Cohorts</h1>
      <div className="mb-4">
        <strong>Current Association ID:</strong>{" "}
        {currentAssociation?.association_id}
      </div>
      {error && (
        <div className="text-red-500 mb-4">
          <strong>Error:</strong> {JSON.stringify(error, null, 2)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-bold">Cohorts</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        <div>
          <h2 className="font-bold">Seasons</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto h-96">
            {JSON.stringify(seasons, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
