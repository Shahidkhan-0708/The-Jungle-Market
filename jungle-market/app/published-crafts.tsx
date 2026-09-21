"use client";
import { useEffect, useState } from "react";
import { Craft, request } from "@/lib/workflow";
import { ShieldCheck, Sparkles } from "lucide-react";
import Link from 'next/link';

export default function PublishedCrafts({ query = "" }: { query?: string }) {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let serverList: Craft[] = [];
        try {
          const result = await request<{ data: Craft[] }>("/v1/catalog/search?q=" + encodeURIComponent(query));
          serverList = result.data || [];
        } catch {}

        let localList: Craft[] = [];
        try {
          const stored = localStorage.getItem("jungle-published-crafts");
          if (stored) localList = JSON.parse(stored);
        } catch {}

        const combined = [...localList, ...serverList].filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
        
        const filtered = query
          ? combined.filter((c) =>
              [c.title, c.category, c.region, c.materials, c.artisan].join(" ").toLowerCase().includes(query.toLowerCase())
            )
          : combined;

        if (active) {
          setCrafts(filtered);
          setError("");
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load published crafts.");
      }
    }
    void load();
    const timer = setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [query]);

  if (!crafts.length) return null;

  return (
    <section className="section">
      <div className="section-title">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> RECENTLY PUBLISHED</div>
          <h2>Live from our artisan workshops</h2>
        </div>
      </div>
      <div className="product-grid">
        {crafts.map((c) => (
          <article key={c.id} className="product-card" data-component="Product card">
            <div className="product-photo">
              {c.image_uri && (
                <img
                  src={c.image_uri}
                  alt={c.title}
                  style={{ width: "100%", height: 220, objectFit: "contain", background: "#FAF7EE" }}
                />
              )}
              <span className="badge green"><ShieldCheck size={12} /> Live on ONDC</span>
            </div>
            <div className="product-meta">
              <span className="eyebrow">{c.category}</span>
              <span>★ 4.9</span>
            </div>
            <h3 style={{ fontSize: 18, margin: "4px 0", lineHeight: 1.3 }}>{c.title}</h3>
            <p style={{ margin: "2px 0 8px", fontSize: 13, color: "#666" }}>by {c.artisan} · {c.region}</p>
            <div className="row between" style={{ alignItems: "center", marginTop: "auto" }}>
              <strong style={{ fontSize: 20, color: "#004525" }}>₹{c.price.toLocaleString("en-IN")}</strong>
              <Link className="jm-btn secondary" href={`/?craft=${c.id}`} style={{ padding: "6px 14px", fontSize: 13 }}>
                View Craft
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
