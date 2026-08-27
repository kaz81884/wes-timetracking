import React, { useMemo, useState } from "react";
import { BookUser, Building2, Plus, Check, X, Trash2, Pencil, Phone, MapPin, StickyNote, Search } from "lucide-react";
import { Card, TextInput, Button, IconBtn } from "./ui";
import { uid, formatPhone } from "../lib/utils";

const emptyPerson = () => ({ firstName: "", lastName: "", nickname: "", title: "", address: "", notes: "", phones: [{ id: uid(), label: "", number: "" }] });

function PersonForm({ initial, onSave, onCancel }) {
  const [person, setPerson] = useState(initial);
  const set = (field, value) => setPerson({ ...person, [field]: value });

  const setPhone = (id, field, value) => setPerson({ ...person, phones: person.phones.map((p) => p.id === id ? { ...p, [field]: value } : p) });
  const addPhone = () => setPerson({ ...person, phones: [...person.phones, { id: uid(), label: "", number: "" }] });
  const removePhone = (id) => setPerson({ ...person, phones: person.phones.filter((p) => p.id !== id) });

  const save = () => {
    const firstName = person.firstName.trim();
    if (!firstName) return;
    onSave({
      ...person,
      firstName,
      lastName: person.lastName.trim(),
      nickname: person.nickname.trim(),
      title: person.title.trim(),
      address: person.address.trim(),
      notes: person.notes.trim(),
      phones: person.phones.filter((p) => p.label.trim() || p.number.trim()).map((p) => ({ id: p.id, label: p.label.trim(), number: p.number.trim() })),
    });
  };

  return (
    <div style={{ display: "grid", gap: 8, background: "var(--wash)", padding: 12, borderRadius: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <TextInput autoFocus placeholder="First name" value={person.firstName} onChange={(e) => set("firstName", e.target.value)} />
        <TextInput placeholder="Last name" value={person.lastName} onChange={(e) => set("lastName", e.target.value)} />
        <TextInput placeholder="Nickname (optional)" value={person.nickname} onChange={(e) => set("nickname", e.target.value)} />
      </div>
      <TextInput placeholder="Title (optional)" value={person.title} onChange={(e) => set("title", e.target.value)} />
      <TextInput placeholder="Address (optional)" value={person.address} onChange={(e) => set("address", e.target.value)} />

      <div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Phone numbers</div>
        <div style={{ display: "grid", gap: 6 }}>
          {person.phones.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 6 }}>
              <TextInput placeholder="Label, e.g. Cell" value={p.label} onChange={(e) => setPhone(p.id, "label", e.target.value)} style={{ maxWidth: 140 }} />
              <TextInput placeholder="Number" value={p.number} onChange={(e) => setPhone(p.id, "number", formatPhone(e.target.value))} />
              <IconBtn danger title="Remove" onClick={() => removePhone(p.id)}><X size={14} /></IconBtn>
            </div>
          ))}
        </div>
        <button onClick={addPhone} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: "6px 0 0" }}>
          <Plus size={13} /> Add phone number
        </button>
      </div>

      <TextInput placeholder="Notes (optional)" value={person.notes} onChange={(e) => set("notes", e.target.value)} />

      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={save} disabled={!person.firstName.trim()}><Check size={14} /> Save</Button>
        <Button variant="ghost" onClick={onCancel}><X size={14} /> Cancel</Button>
      </div>
    </div>
  );
}

export default function DirectoryTab({ data, setData, currentUser }) {
  const isAdmin = currentUser.role === "admin";
  const [addingFor, setAddingFor] = useState(null); // clientId currently showing its add-person form
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const matches = (p) => {
    if (!query) return true;
    const haystack = [p.firstName, p.lastName, p.nickname, p.title, p.notes, ...(p.phones || []).map((ph) => ph.number)].join(" ").toLowerCase();
    return haystack.includes(query);
  };
  const visibleClients = useMemo(() => {
    if (!query) return data.clients;
    return data.clients.filter((c) => (data.directory || []).some((p) => p.clientId === c.id && matches(p)));
  }, [data.clients, data.directory, query]);

  const addPerson = (clientId, person) => {
    setData({ ...data, directory: [...(data.directory || []), { id: uid(), clientId, ...person }] });
    setAddingFor(null);
  };
  const updatePerson = (id, person) => {
    setData({ ...data, directory: (data.directory || []).map((p) => p.id === id ? { ...p, ...person } : p) });
    setEditingId(null);
  };
  const removePerson = (id) => setData({ ...data, directory: (data.directory || []).filter((p) => p.id !== id) });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <BookUser size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Directory</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "4px 0 14px" }}>
          A reference list of people at each company — not tied to time entries, just names, titles, and contact info everyone can look up.
        </p>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={14} color="var(--ink-3)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <TextInput placeholder="Search by name, title, phone…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
      </Card>

      {data.clients.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--ink-3)" }}>No companies yet — add one on the Companies tab first.</p></Card>
      ) : visibleClients.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--ink-3)" }}>No one matches "{search}".</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {visibleClients.map((client) => {
            const people = (data.directory || []).filter((p) => p.clientId === client.id && matches(p));
            return (
              <Card key={client.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Building2 size={16} color="var(--ink-3)" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)" }}>{client.name}</span>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {people.map((p) => (
                    editingId === p.id ? (
                      <PersonForm key={p.id} initial={{ ...emptyPerson(), ...p, phones: p.phones?.length ? p.phones : [{ id: uid(), label: "", number: "" }] }} onSave={(updated) => updatePerson(p.id, updated)} onCancel={() => setEditingId(null)} />
                    ) : (
                      <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>
                              {p.firstName} {p.lastName}{p.nickname ? ` "${p.nickname}"` : ""}
                            </div>
                            {p.title && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 1 }}>{p.title}</div>}
                          </div>
                          {isAdmin && (
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <IconBtn title="Edit" onClick={() => setEditingId(p.id)}><Pencil size={14} /></IconBtn>
                              <IconBtn danger title="Remove" onClick={() => removePerson(p.id)}><Trash2 size={14} /></IconBtn>
                            </div>
                          )}
                        </div>
                        {p.phones?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                            {p.phones.map((ph) => (
                              <span key={ph.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--ink-2)" }}>
                                <Phone size={12} color="var(--ink-3)" />
                                {ph.label && <span style={{ color: "var(--ink-3)" }}>{ph.label}:</span>} {ph.number}
                              </span>
                            ))}
                          </div>
                        )}
                        {p.address && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>
                            <MapPin size={12} color="var(--ink-3)" style={{ marginTop: 2, flexShrink: 0 }} /> {p.address}
                          </div>
                        )}
                        {p.notes && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>
                            <StickyNote size={12} color="var(--ink-3)" style={{ marginTop: 2, flexShrink: 0 }} /> {p.notes}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                  {people.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No one in the directory at {client.name} yet.</p>}

                  {isAdmin && (
                    addingFor === client.id ? (
                      <PersonForm initial={emptyPerson()} onSave={(person) => addPerson(client.id, person)} onCancel={() => setAddingFor(null)} />
                    ) : (
                      <button onClick={() => setAddingFor(client.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
                        <Plus size={14} /> Add person at {client.name}
                      </button>
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
