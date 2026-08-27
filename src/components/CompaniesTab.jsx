import React, { useState } from "react";
import { Tag, Building2, Plus, Check, X, Trash2, Copy, Archive, FolderKanban } from "lucide-react";
import { Card, Pill, Select, TextInput, Button, IconBtn, Toggle, TaskChip } from "./ui";
import { uid, PROJECT_COLORS, suggestDuplicateName } from "../lib/utils";

// Per-contact activities and per-company billing "projects" (engagements)
// are on hold — logging time now only asks for company + activity — but the
// data and management UI stay intact underneath in case they come back.
const SHOW_CONTACTS_AND_ENGAGEMENTS = false;

export default function CompaniesTab({ data, setData }) {
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState("client");
  const [newTaskType, setNewTaskType] = useState("");

  const [addingContactFor, setAddingContactFor] = useState(null); // clientId currently showing its inline add-contact form
  const [contactName, setContactName] = useState("");
  const [contactBudget, setContactBudget] = useState("");

  const [addingEngagementFor, setAddingEngagementFor] = useState(null); // clientId currently showing its inline add-project form
  const [engagementName, setEngagementName] = useState("");
  const [engagementBudget, setEngagementBudget] = useState("");

  const addClient = () => {
    const n = clientName.trim();
    if (!n) return;
    const color = PROJECT_COLORS[data.clients.length % PROJECT_COLORS.length];
    setData({ ...data, clients: [...data.clients, { id: uid(), name: n, type: clientType, color, taskIds: [] }] });
    setClientName("");
  };
  const removeClient = (id) => setData({ ...data, clients: data.clients.filter((c) => c.id !== id), projects: data.projects.filter((p) => p.clientId !== id) });
  const toggleClientTask = (clientId, taskId) => {
    setData({
      ...data,
      clients: data.clients.map((c) => {
        if (c.id !== clientId) return c;
        const taskIds = c.taskIds || [];
        const has = taskIds.includes(taskId);
        return { ...c, taskIds: has ? taskIds.filter((id) => id !== taskId) : [...taskIds, taskId] };
      }),
    });
  };

  const addProject = (clientId) => {
    const n = contactName.trim();
    if (!n || !clientId) return;
    const color = PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length];
    const project = { id: uid(), name: n, clientId, status: "active", budget: contactBudget ? parseFloat(contactBudget) : null, color, taskIds: [] };
    setData({ ...data, projects: [...data.projects, project] });
    setContactName(""); setContactBudget(""); setAddingContactFor(null);
  };
  const removeProject = (id) => setData({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  const toggleStatus = (id) => setData({ ...data, projects: data.projects.map((p) => p.id === id ? { ...p, status: p.status === "inactive" ? "active" : "inactive" } : p) });

  // ---- global activity (task type) pool — admin-managed, shared across every company ----
  const addTaskType = () => {
    const n = newTaskType.trim();
    if (!n || data.taskTypes.find((t) => t.name.toLowerCase() === n.toLowerCase())) return;
    setData({ ...data, taskTypes: [...data.taskTypes, { id: uid(), name: n }] });
    setNewTaskType("");
  };
  const removeTaskType = (id) => {
    setData({
      ...data,
      taskTypes: data.taskTypes.filter((t) => t.id !== id),
      projects: data.projects.map((p) => ({ ...p, taskIds: p.taskIds.filter((tid) => tid !== id) })),
      clients: data.clients.map((c) => ({ ...c, taskIds: (c.taskIds || []).filter((tid) => tid !== id) })),
    });
  };
  const toggleProjectTask = (projectId, taskId) => {
    setData({
      ...data,
      projects: data.projects.map((p) => {
        if (p.id !== projectId) return p;
        const has = p.taskIds.includes(taskId);
        return { ...p, taskIds: has ? p.taskIds.filter((id) => id !== taskId) : [...p.taskIds, taskId] };
      }),
    });
  };

  // ---- monthly "projects" (billing/budget cycles) — belong to a company, not a specific contact ----
  const addEngagement = (clientId) => {
    const n = engagementName.trim();
    if (!n || !clientId) return;
    const engagement = { id: uid(), clientId, name: n, status: "active", budget: engagementBudget ? parseFloat(engagementBudget) : null, createdAt: Date.now(), archivedAt: null };
    setData({ ...data, engagements: [...data.engagements, engagement] });
    setEngagementName(""); setEngagementBudget(""); setAddingEngagementFor(null);
  };
  const removeEngagement = (id) => setData({ ...data, engagements: data.engagements.filter((e) => e.id !== id) });
  const toggleEngagementStatus = (id) => setData({
    ...data,
    engagements: data.engagements.map((e) => e.id === id
      ? { ...e, status: e.status === "archived" ? "active" : "archived", archivedAt: e.status === "archived" ? null : Date.now() }
      : e),
  });
  // one click: start next month's project pre-filled from this one, and close this one out
  const duplicateEngagement = (source) => {
    const next = { id: uid(), clientId: source.clientId, name: suggestDuplicateName(source.name), status: "active", budget: source.budget, createdAt: Date.now(), archivedAt: null };
    setData({
      ...data,
      engagements: [
        ...data.engagements.map((e) => e.id === source.id ? { ...e, status: "archived", archivedAt: Date.now() } : e),
        next,
      ],
    });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Tag size={15} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Activity pool</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "4px 0 14px" }}>
          One shared list of activities — like "Manage Inbox" — that admins control here and can then turn on per company below, so everyone logs time against the same wording no matter the company.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <TextInput placeholder="New activity, e.g. Manage Inbox" value={newTaskType} onChange={(e) => setNewTaskType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTaskType()} />
          <Button onClick={addTaskType}><Plus size={14} /> Add</Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.taskTypes.map((t) => (
            <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "5px 6px 5px 12px", borderRadius: 100, background: "var(--wash)", color: "var(--ink-2)", fontWeight: 600 }}>
              {t.name}
              <IconBtn danger title="Remove from pool (also unassigns from all contacts)" onClick={() => removeTaskType(t.id)}><X size={12} /></IconBtn>
            </span>
          ))}
          {data.taskTypes.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No activities yet — add the first one above.</p>}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Building2 size={15} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Add a company</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "4px 0 14px" }}>
          Any team member can log time against any activity you turn on for a company below.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput placeholder="Company or department name" value={clientName} onChange={(e) => setClientName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addClient()} />
          <Select value={clientType} onChange={(e) => setClientType(e.target.value)} style={{ maxWidth: 140 }}>
            <option value="client">Client company</option>
            <option value="department">Internal dept.</option>
          </Select>
          <Button onClick={addClient}><Plus size={14} /> Add</Button>
        </div>
      </Card>

      {data.clients.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--ink-3)" }}>No companies yet — add one above to start turning on activities.</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {data.clients.map((client) => {
            const contacts = data.projects.filter((p) => p.clientId === client.id);
            return (
              <Card key={client.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={16} color="var(--ink-3)" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)" }}>{client.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>{client.type === "department" ? "Internal dept." : "Client company"}</span>
                  </div>
                  <IconBtn danger title="Remove company" onClick={() => removeClient(client.id)}><Trash2 size={14} /></IconBtn>
                </div>

                <div style={{ marginBottom: SHOW_CONTACTS_AND_ENGAGEMENTS ? 16 : 0 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Activities for {client.name}</div>
                  {data.taskTypes.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Add activities to the pool above first.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {data.taskTypes.map((t) => (
                        <TaskChip key={t.id} name={t.name} active={(client.taskIds || []).includes(t.id)} onClick={() => toggleClientTask(client.id, t.id)} />
                      ))}
                    </div>
                  )}
                </div>

                {SHOW_CONTACTS_AND_ENGAGEMENTS && <div style={{ display: "grid", gap: 10 }}>
                  {contacts.map((p) => (
                    <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Pill color={p.color}>{p.name}</Pill>
                          {p.budget ? <span style={{ fontSize: 12, color: "var(--ink-3)" }}>· budget {p.budget}</span> : null}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Toggle checked={p.status !== "inactive"} onChange={() => toggleStatus(p.id)} label={p.status === "inactive" ? "Inactive" : "Active"} />
                          <IconBtn danger title="Remove contact" onClick={() => removeProject(p.id)}><Trash2 size={14} /></IconBtn>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Activities for this contact</div>
                      {data.taskTypes.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Add activities to the pool above first.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {data.taskTypes.map((t) => (
                            <TaskChip key={t.id} name={t.name} active={p.taskIds.includes(t.id)} onClick={() => toggleProjectTask(p.id, t.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {contacts.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No contacts at {client.name} yet.</p>}

                  {addingContactFor === client.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--wash)", padding: 10, borderRadius: 9 }}>
                      <TextInput autoFocus placeholder="Contact name (e.g. CEO, CFO)" value={contactName} onChange={(e) => setContactName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProject(client.id)} />
                      <TextInput type="number" min="0" placeholder="Budget (optional)" value={contactBudget} onChange={(e) => setContactBudget(e.target.value)} style={{ maxWidth: 140 }} />
                      <Button onClick={() => addProject(client.id)}><Check size={14} /></Button>
                      <IconBtn title="Cancel" onClick={() => { setAddingContactFor(null); setContactName(""); setContactBudget(""); }}><X size={14} /></IconBtn>
                    </div>
                  ) : (
                    <button onClick={() => setAddingContactFor(client.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
                      <Plus size={14} /> Add contact at {client.name}
                    </button>
                  )}
                </div>}

                {SHOW_CONTACTS_AND_ENGAGEMENTS && <>
                  <div style={{ borderTop: "1px solid var(--line)", margin: "16px 0 14px" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <FolderKanban size={14} color="var(--ink-3)" />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-3)" }}>Projects at {client.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 10px" }}>
                    A billing/budget cycle — e.g. a monthly retainer. Duplicate at the start of a new cycle to carry the name and budget forward and archive the old one in one step.
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {data.engagements.filter((e) => e.clientId === client.id).map((e) => (
                      <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--wash)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <Pill muted={e.status === "archived"} color="var(--accent)">{e.name}</Pill>
                          {e.budget ? <span style={{ fontSize: 12, color: "var(--ink-3)" }}>· budget {e.budget}</span> : null}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {e.status !== "archived" && (
                            <IconBtn title="Duplicate for next cycle & archive this one" onClick={() => duplicateEngagement(e)}><Copy size={14} /></IconBtn>
                          )}
                          <IconBtn title={e.status === "archived" ? "Reactivate" : "Archive"} onClick={() => toggleEngagementStatus(e.id)}><Archive size={14} /></IconBtn>
                          <IconBtn danger title="Delete permanently" onClick={() => removeEngagement(e.id)}><Trash2 size={14} /></IconBtn>
                        </div>
                      </div>
                    ))}
                    {data.engagements.filter((e) => e.clientId === client.id).length === 0 && (
                      <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No projects at {client.name} yet — optional, only needed if you want to bucket time into monthly cycles.</p>
                    )}

                    {addingEngagementFor === client.id ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--wash)", padding: 10, borderRadius: 9 }}>
                        <TextInput autoFocus placeholder="Project name (e.g. Retainer — August 2026)" value={engagementName} onChange={(e) => setEngagementName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEngagement(client.id)} />
                        <TextInput type="number" min="0" placeholder="Budget (optional)" value={engagementBudget} onChange={(e) => setEngagementBudget(e.target.value)} style={{ maxWidth: 140 }} />
                        <Button onClick={() => addEngagement(client.id)}><Check size={14} /></Button>
                        <IconBtn title="Cancel" onClick={() => { setAddingEngagementFor(null); setEngagementName(""); setEngagementBudget(""); }}><X size={14} /></IconBtn>
                      </div>
                    ) : (
                      <button onClick={() => setAddingEngagementFor(client.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
                        <Plus size={14} /> New project at {client.name}
                      </button>
                    )}
                  </div>
                </>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
