"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    console.log("[DEBUG_PAGE] Component mounted");

    if (hasFetched.current) {
      console.log("[DEBUG_PAGE] Fetch skipped (already fetched)");
      return;
    }
    hasFetched.current = true;

    async function testSupabaseConnection() {
      try {
        console.log("[QUERY_START] Starting simple select query on products...");
        const startTime = Date.now();
        
        const { data: result, error: fetchError } = await supabase
          .from("products")
          .select("id, title")
          .limit(5);
        
        const endTime = Date.now();

        if (fetchError) {
          console.error(`[QUERY_ERROR] Failed after ${endTime - startTime}ms:`, fetchError.message);
          setError(fetchError.message);
        } else {
          console.log(`[QUERY_SUCCESS] Succeeded in ${endTime - startTime}ms. Found ${result?.length || 0} rows.`);
          setData(result);
        }
      } catch (err: any) {
        console.error("[QUERY_ERROR] Exception caught:", err.message);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    testSupabaseConnection();
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "monospace", backgroundColor: "#000", color: "#0f0", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff", marginBottom: "20px" }}>Diagnostic Debug Page</h1>
      
      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #333", backgroundColor: "#111" }}>
        <strong>Status:</strong> {loading ? "⏳ Fetching from Supabase..." : "✅ Done"}
      </div>

      {error && (
        <div style={{ color: "#f00", padding: "15px", border: "1px solid #f00", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <h3>Results:</h3>
          <pre style={{ whiteSpace: "pre-wrap", backgroundColor: "#111", padding: "15px", border: "1px solid #333" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
