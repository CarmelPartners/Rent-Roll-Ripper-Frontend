# RentRoll frontend (React scaffold)

A React + TypeScript + Vite + Tailwind + shadcn/Radix SPA, structured the same way as
`YardiReceivableInvoiceExport/frontend`: `src/components/ui/*` for primitives, `src/lib/api.ts`
for the typed fetch client, `src/lib/auth.tsx` + `src/components/AuthGate.tsx` for the sign-in
gate, `src/types.ts` for DTOs shared with the backend.

This first pass ports one vertical slice — the **Property list + Add Property dialog**
(`PropertyList.razor` / `PropertyAdd.razor` and their controllers) — end to end, talking to the
new `../backend` Python Function App rather than the old ASP.NET one, so the pattern can be
reviewed before the remaining 15 Blazor pages are ported the same way.

## Running it

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:7071` (`func start` in `../backend`, see
`backend/README.md`). `.env.local` sets `VITE_LOCAL_DEV_BYPASS_AUTH=true` to match the backend's
`LOCAL_DEV_BYPASS_AUTH`, so both sides skip real Okta/SAML for local dev.

## Auth model (updated for the Python backend)

The old ASP.NET backend used a server-side session cookie; the Python backend
(`../backend/shared/auth.py`) issues a stateless bearer JWT instead. `src/lib/auth.tsx` stores it
in `sessionStorage` and `src/lib/api.ts` sends it as `Authorization: Bearer <token>` — the same
pattern `YardiReceivableInvoiceExport/frontend` uses. `signIn`/`signOut` no longer need to be
same-origin with the backend the way cookie auth did.

## Backend gaps this resolved vs. what's still open

Switching to the Python backend resolved the two structural gaps flagged when this scaffold
still pointed at the old ASP.NET backend: CORS is no longer a same-origin workaround (no cookies
in flight), and auth is a portable bearer token instead of a cookie tied to the proxy. See
`../backend/README.md` for what's still open on that side (no Okta app registered yet for this
SP, assumed SAML attribute names, etc.) and `../backend/shared/properties.py` for the one
intentional response-shape change (`{created, propertyID, message}` instead of the legacy DAL's
ambiguous string return).

## Pages

| Legacy page | Component |
| --- | --- |
| PropertyStageList / PropertyList | `PropertyList.tsx` (+ row delete) |
| PropertyAdd | `AddPropertyDialog.tsx` |
| PropertyHistoryList | `PropertyHistory.tsx` |
| ClassMapping | `ClassMapping.tsx` |
| Upload | `UploadRentRollDialog.tsx` |
| ChargeCodeList | `ChargeCodeList.tsx` |
| ModifierList | `ModifierList.tsx` |
| CarmelStandardClass | `StandardClassList.tsx` |
| RentRollUniqueList | `RentRollUniqueList.tsx` |
| RentRollDetailsList ("Review RR") | `RentRollDetails.tsx` |
| Rentrolldetailslist_Preview ("Export") | `ExportPreview.tsx` |

Reference-data pages (charge codes, modifiers, standard classes) are reachable from the top
nav; the per-batch pages (Review RR, Export, Class Mapping, RR Unique) are reached from a batch
row on Property History, which is how the legacy app linked them.

`App.tsx` still uses a union-typed `View` state rather than a router. That's fine at this size
but is the obvious next refactor now that there are nine views — deep links and browser
back/forward don't work today.

Not ported: the "One Site" upload format and class mapping's "apply to detail" (both blocked in
the backend — see `../backend/README.md`). Several of these pages had no working legacy original
to copy; that README lists which and why.
