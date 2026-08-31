# Bin There, Done That 🚮

Civic litter reporting for Pune. Citizens photograph rubbish; an image model
confirms it is actually litter; the report is routed to the ward team
responsible; and the cleanup is verified on site before it is marked done.

Runs entirely on free infrastructure.

---

## Architecture

```
React (Vite)  ──auth / read / storage──>  Supabase
     │                                    (Postgres + PostGIS, Auth, Storage, RLS)
     │                                            ▲
     └── submit report ──> Edge Function ─────────┘
                                │
                                └──> Hugging Face Space (Docker): CLIP /predict
```

| Component | Lives in | Hosted on | Free tier |
|---|---|---|---|
| Web client | `client/` | Vercel | 100 GB bandwidth/mo |
| Database, auth, storage, functions | `supabase/` | Supabase | 500 MB DB, 1 GB storage, 50k MAU |
| CLIP inference | `clip-service/` | HF Spaces (Gradio SDK) | 2 vCPU / 16 GB RAM |

Two free-tier behaviours to know about:

- The **Supabase project pauses after 7 days** of zero activity. Unpause it from
  the dashboard.
- The **HF Space sleeps after 48 h idle**. Waking it re-downloads the ~605 MB
  of CLIP weights, so the first request after a sleep can take ~90 s. The report
  screen shows a "classifier is waking up" message rather than a hung spinner.
  Docker Spaces (which could bake the weights into the image) require a paid
  plan, hence the Gradio SDK.

There is no Node/Express service. Supabase provides auth, the database, storage
and row-level authorization directly, so the only custom server-side code is the
two Edge Functions that enforce the classifier thresholds.

---

## How a report flows

1. The client uploads the photo straight to Supabase Storage, under a path
   prefixed with the user's own id — the only prefix storage RLS lets them write.
2. It calls the `submit-report` Edge Function with that path plus GPS coordinates.
3. The function checks the path belongs to the caller, downloads the image, and
   sends it to the CLIP Space.
4. If `garbage_probability` is below 50 %, the report is rejected and the orphaned
   upload is deleted.
5. Otherwise PostGIS resolves the ward and zone from the coordinates, and the
   complaint row is inserted with the service role.

**No client role has an INSERT policy on `complaints`**, so step 4 cannot be
skipped by talking to the database directly.

Cleanup runs the same way through `verify-cleanup`, with two gates: the photo
must look clean (< 30 % garbage) *and* have been taken within 30 m of the
original report.

---

## Roles

Everyone signs in with Google. New accounts are `citizen` / `active`; municipal
staff sign in the same way and then have their role and ward assigned by an
admin at `/admin/users`. There is deliberately no self-service path to a staff
role.

| Role | Can |
|---|---|
| `citizen` | File reports, see their own |
| `si` / `dsi` / `csi` | See and triage complaints in **their ward only**, forward to a muqaddam |
| `muqaddam` | See complaints assigned to them, assign workers, submit cleanup proof |
| `worker` | See locations assigned to them |
| `admin` | Everything, plus user administration |

Bootstrap the first admin once, after signing in, from the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

This works because the privilege guard exempts direct database connections.
PostgREST connects as the `authenticator` role, so anything with a different
`session_user` is a direct connection and is already superuser-level; gating it
behind an app trigger would leave no way to create the first admin at all.

---

## Map data

Ward boundaries come from the Pune Municipal Corporation via
[OpenCity](https://data.opencity.in/dataset/pune-wards-info) (Public Domain),
converted from the published KML by `supabase/seed/kml_to_geojson.py`.

Both delimitations are loaded; `app_settings.active_ward_year` decides which is
live.

| Year | Wards | Names |
|---|---|---|
| **2022** (default) | 58 | Yes — e.g. "Sukhsagarnagar - Rajiv Gandhinagar" |
| 2025 | 41 | No — the published file carries numbers only |

> **Muqaddam zones are synthetic.** Real sanitation beats are internal PMC
> assignments and are not published. Every ward is tiled with a generated hex
> grid so the routing chain works end to end, and every generated row is flagged
> `is_synthetic` and labelled "(auto)" in the UI. Load surveyed polygons for a
> ward with `select public.load_real_zones(<geojson>::jsonb, <ward_no>)`, which
> replaces that ward's generated tiling.

---

## Deployment status

The database is provisioned on project `chjwumixiaazupjznggc` and verified live:

| | |
|---|---|
| Migrations applied | 12 |
| Wards | 99 (58 named for 2022, 41 numbered for 2025) |
| Zones | 1,583 synthetic hex beats, all flagged |
| Storage buckets | `reports`, `cleanup-proofs` (both private) |
| Geo assertions | pass |
| Security assertions | 14/14 pass |

### Accepted linter warnings

`supabase get_advisors` reports six warnings that are expected:

- **`current_profile_role` / `current_profile_ward` / `is_active` /
  `active_ward_year` are SECURITY DEFINER and executable by `authenticated`.**
  This is required: RLS policy expressions are evaluated as the *invoking*
  role, so those helpers must be callable by the very users they gate. Each
  returns only the caller's own row, keyed on `auth.uid()`, so there is nothing
  to leak. Every other function has had `EXECUTE` revoked from `PUBLIC`.
- **`rls_auto_enable`** is created and owned by Supabase, not this project. It
  is the platform's own trigger that auto-enables RLS on new tables. Left
  untouched deliberately.

---

## Local setup

```bash
# 1. Database
supabase link --project-ref chjwumixiaazupjznggc
supabase db push                       # schema + ward seed

# 2. Secrets for the Edge Functions
supabase secrets set CLIP_SERVICE_URL=https://<user>-<space>.hf.space
supabase secrets set CLIP_SERVICE_SECRET=<shared-secret>
supabase functions deploy submit-report verify-cleanup

# 3. Client
cd client
cp .env.example .env.local             # fill in VITE_SUPABASE_ANON_KEY
npm install && npm run dev             # http://localhost:5173

# 4. CLIP service (optional locally; downloads ~605 MB on first run)
cd clip-service
pip install -r requirements.txt && python app.py
```

Enable the Google provider in the Supabase dashboard (Authentication →
Providers), using a Google Cloud OAuth client whose redirect URI is your
project's Supabase callback URL.

---

## Tests

```bash
cd clip-service && pytest tests -q            # classifier behaviour
psql "$DATABASE_URL" -f supabase/tests/01_geo_lookup.sql
psql "$DATABASE_URL" -f supabase/tests/02_security.sql
```

`01_geo_lookup.sql` pins the ward lookup to the two coordinates hardcoded in
the old Flask code, which resolve to "Sukhsagarnagar - Rajiv Gandhinagar" and
"Upper Super Indiranagar" respectively.

`02_security.sql` is the regression test for the authorization model: a citizen
cannot read another citizen's complaint, cannot insert a complaint directly,
and cannot promote themselves to staff; an SI can triage but cannot rewrite the
classifier's output, move the coordinates, forge a completion, or route work to
a muqaddam in another ward.

---

## Layout

```
client/         React + Vite frontend
clip-service/   FastAPI + CLIP, deployed as a Gradio Space
supabase/
  migrations/   Schema, RLS, ward seed
  functions/    submit-report, verify-cleanup
  seed/         Ward GeoJSON + the KML converter
  tests/        SQL assertions
```

## Licence

MIT.
