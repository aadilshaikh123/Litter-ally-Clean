import { useEffect, useMemo, useState } from "react";
import { allProfiles, updateProfile, listWards } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Alert, Badge, Button, Card, CardBody, EmptyState, Field, Input, Select, Spinner,
} from "../components/ui";

const ROLES = ["citizen", "worker", "muqaddam", "si", "dsi", "csi", "admin"];
const STATUSES = ["pending", "active", "suspended"];

// Mirrors the profiles_staff_attrs_ck constraint, so the form asks for what
// the database will insist on rather than failing on save.
const NEEDS_WARD = ["si", "dsi", "csi", "muqaddam"];
const NEEDS_IDENTIFIER = ["si", "dsi", "csi"];
const NEEDS_SI_IDENTIFIER = ["muqaddam"];

/**
 * User administration. This is the only way to grant a staff role - there is
 * deliberately no self-service path, which is what the old public
 * /api/govEmployees/register2 endpoint provided to anyone on the internet.
 *
 * Bootstrap the first admin manually once, after signing in:
 *   update public.profiles set role = 'admin' where email = 'you@example.com';
 */
export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    Promise.all([allProfiles(), listWards()])
      .then(([p, w]) => {
        if (p.error) setError(p.error.message);
        else setRows(p.data ?? []);
        setWards(w.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.email, r.full_name, r.role, r.identifier].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  const draftFor = (r) => ({
    role: r.role,
    status: r.status,
    ward_id: r.ward_id,
    identifier: r.identifier,
    si_identifier: r.si_identifier,
    ...drafts[r.id],
  });

  const setDraft = (id, patch) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = async (r) => {
    const d = draftFor(r);
    setSaving((s) => ({ ...s, [r.id]: true }));
    setError(null);

    const { data, error: err } = await updateProfile(r.id, {
      role: d.role,
      status: d.status,
      // Clear attributes that no longer apply to the chosen role, otherwise a
      // demoted supervisor keeps a stale ward.
      ward_id: NEEDS_WARD.includes(d.role) ? d.ward_id || null : null,
      identifier: NEEDS_IDENTIFIER.includes(d.role) ? d.identifier || null : null,
      si_identifier: NEEDS_SI_IDENTIFIER.includes(d.role) ? d.si_identifier || null : null,
    });

    setSaving((s) => ({ ...s, [r.id]: false }));

    if (err) {
      setError(`${r.email}: ${err.message}`);
      return;
    }
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, ...data } : x)));
    setDrafts((dd) => ({ ...dd, [r.id]: undefined }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading users" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-content">Users</h1>
        <p className="mt-1 text-sm text-content-muted">
          Assign roles and wards. Staff sign in with Google first, then appear here as
          pending citizens.
        </p>
      </div>

      {error && <Alert title="Could not save">{error}</Alert>}

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by name, email, role or identifier"
        aria-label="Search users"
      />

      {visible.length === 0 ? (
        <EmptyState title="No matching users" />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const d = draftFor(r);
            const dirty = !!drafts[r.id];
            // Changing your own role would revoke access to this very screen,
            // so the database refuses it. Reflect that here rather than letting
            // the save fail.
            const isSelf = r.id === user?.id;

            return (
              <Card key={r.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-content">
                      {r.full_name || "(no name)"}
                    </span>
                    <span className="text-sm text-content-muted">{r.email}</span>
                    {isSelf && <Badge tone="info">you</Badge>}
                    <Badge
                      tone={
                        r.status === "active" ? "brand"
                          : r.status === "pending" ? "warn" : "danger"
                      }
                      className="ml-auto"
                    >
                      {r.status}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Role" hint={isSelf ? "You cannot change your own role" : undefined}>
                      {(p) => (
                        <Select {...p} value={d.role} disabled={isSelf}
                                onChange={(e) => setDraft(r.id, { role: e.target.value })}>
                          {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
                        </Select>
                      )}
                    </Field>

                    <Field label="Status" hint={isSelf ? "You cannot change your own status" : undefined}>
                      {(p) => (
                        <Select {...p} value={d.status} disabled={isSelf}
                                onChange={(e) => setDraft(r.id, { status: e.target.value })}>
                          {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                        </Select>
                      )}
                    </Field>

                    {NEEDS_WARD.includes(d.role) && (
                      <Field label="Ward">
                        {(p) => (
                          <Select {...p} value={d.ward_id ?? ""}
                                  onChange={(e) => setDraft(r.id, {
                                    ward_id: e.target.value ? Number(e.target.value) : null,
                                  })}>
                            <option value="">Select a ward</option>
                            {wards.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.ward_no} - {w.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    )}

                    {NEEDS_IDENTIFIER.includes(d.role) && (
                      <Field label="Identifier" hint="e.g. SI1">
                        {(p) => (
                          <Input {...p} value={d.identifier ?? ""}
                                 onChange={(e) => setDraft(r.id, { identifier: e.target.value })} />
                        )}
                      </Field>
                    )}

                    {NEEDS_SI_IDENTIFIER.includes(d.role) && (
                      <Field label="Reports to (SI)" hint="e.g. SI1">
                        {(p) => (
                          <Input {...p} value={d.si_identifier ?? ""}
                                 onChange={(e) => setDraft(r.id, { si_identifier: e.target.value })} />
                        )}
                      </Field>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" disabled={!dirty} loading={saving[r.id]}
                            onClick={() => save(r)}>
                      Save changes
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
