import React, { useMemo, useState } from "react";
import { BookUser, Building2, Plus, Check, X, Trash2, Pencil, Phone, Mail, MapPin, StickyNote } from "lucide-react";
import { Card, Select, TextInput, Button, IconBtn } from "./ui";
import { uid, formatPhone } from "../lib/utils";

const emptyPerson = () => ({ firstName: "", lastName: "", nickname: "", title: "", email: "", address: "", city: "", state: "", zip: "", notes: "", phones: [{ id: uid(), label: "", number: "" }] });

const cityStateZip = (p) => [p.city, [p.state, p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

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
      email: person.email.trim(),
      address: person.address.trim(),
      city: person.city.trim(),
      state: person.state.trim(),
      zip: person.zip.trim(),
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
      <TextInput type="email" placeholder="Email (optional)" value={person.email} onChange={(e) => set("email", e.target.value)} />
      <TextInput placeholder="Street address (optional)" value={person.address} onChange={(e) => set("address", e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
        <TextInput placeholder="City (optional)" value={person.city} onChange={(e) => set("city", e.target.value)} />
        <TextInput placeholder="State (optional)" value={person.state} onChange={(e) => set("state", e.target.value)} />
        <TextInput placeholder="Zip (optional)" value={person.zip} onChange={(e) => set("zip", e.target.value)} />
      </div>

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
  const [clientFilter, setClientFilter] = useState("all");
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const has = (value, filter) => !filter || value === filter;
  const matches = (p) => has(p.firstName, firstNameFilter) && has(p.lastName, lastNameFilter) && has(p.title, titleFilter) && has(p.city, cityFilter);

  // dropdown options only reflect people at the currently selected company,
  // so picking a company first narrows the rest to values that actually exist there
  const directoryInScope = clientFilter === "all" ? (data.directory || []) : (data.directory || []).filter((p) => p.clientId === clientFilter);
  const uniqueValues = (key) => [...new Set(directoryInScope.map((p) => (p[key] || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const firstNameOptions = useMemo(() => uniqueValues("firstName"), [directoryInScope]);
  const lastNameOptions = useMemo(() => uniqueValues("lastName"), [directoryInScope]);
  const titleOptions = useMemo(() => uniqueValues("title"), [directoryInScope]);
  const cityOptions = useMemo(() => uniqueValues("city"), [directoryInScope]);

  const selectClient = (id) => {
    setClientFilter(id);
    setFirstNameFilter(""); setLastNameFilter(""); setTitleFilter(""); setCityFilter("");
  };

  const visibleClients = useMemo(() => {
    const clients = clientFilter === "all" ? data.clients : data.clients.filter((c) => c.id === clientFilter);
    return clients.filter((c) => (data.directory || []).some((p) => p.clientId === c.id && matches(p)));
  }, [data.clients, data.directory, clientFilter, firstNameFilter, lastNameFilter, titleFilter, cityFilter]);

  const anyFilterActive = clientFilter !== "all" || firstNameFilter || lastNameFilter || titleFilter || cityFilter;

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Company</div>
            <Select value={clientFilter} onChange={(e) => selectClient(e.target.value)} style={{ minWidth: 160 }}>
              <option value="all">All companies</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>First name</div>
            <Select value={firstNameFilter} onChange={(e) => setFirstNameFilter(e.target.value)} style={{ minWidth: 130 }}>
              <option value="">All</option>
              {firstNameOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Last name</div>
            <Select value={lastNameFilter} onChange={(e) => setLastNameFilter(e.target.value)} style={{ minWidth: 130 }}>
              <option value="">All</option>
              {lastNameOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Title</div>
            <Select value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} style={{ minWidth: 130 }}>
              <option value="">All</option>
              {titleOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>City</div>
            <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ minWidth: 130 }}>
              <option value="">All</option>
              {cityOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
          {anyFilterActive && (
            <Button variant="ghost" onClick={() => { setClientFilter("all"); setFirstNameFilter(""); setLastNameFilter(""); setTitleFilter(""); setCityFilter(""); }}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {data.clients.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--ink-3)" }}>No companies yet — add one on the Companies tab first.</p></Card>
      ) : visibleClients.length === 0 ? (
        <Card><p style={{ fontSize: 13, color: "var(--ink-3)" }}>No one matches these filters.</p></Card>
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
                        {p.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>
                            <Mail size={12} color="var(--ink-3)" /> {p.email}
                          </div>
                        )}
                        {(p.address || p.city || p.state || p.zip) && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>
                            <MapPin size={12} color="var(--ink-3)" style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                              {p.address && <div>{p.address}</div>}
                              {cityStateZip(p) && <div>{cityStateZip(p)}</div>}
                            </div>
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
