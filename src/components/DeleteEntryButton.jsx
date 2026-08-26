import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { IconBtn, Button } from "./ui";

export default function DeleteEntryButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Delete?</span>
        <Button variant="danger" onClick={onConfirm} style={{ padding: "5px 10px", fontSize: 12 }}>Yes</Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} style={{ padding: "5px 10px", fontSize: 12 }}>No</Button>
      </div>
    );
  }
  return <IconBtn danger title="Delete entry" onClick={() => setConfirming(true)}><Trash2 size={14} /></IconBtn>;
}
