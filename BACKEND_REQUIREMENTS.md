# Petals Paradise Backend Requirements

## 1. Purpose and scope

This document defines the backend needed to support the existing Petals Paradise
React storefront. It is based on the current frontend in `src/App.tsx`,
`src/shop.tsx`, and `src/api.ts`; it is not a description of a
backend that already exists.

The backend must provide a secure system of record for the product catalogue,
customer accounts, orders, payments, delivery configuration, and customer
inquiries. The browser must not be trusted to calculate prices, determine
availability, authenticate users, or confirm payments.

## 2. Current codebase evaluation

### Architecture

- The project is a Vite/React/TypeScript single-page application. There are no
  backend source files, API client, server routes, database migrations, or
  backend tests in the tracked project.
- The storefront fetches its product catalogue from `GET /products` using the
  configured `VITE_API_BASE_URL`. It renders a loading list while the API
  responds, then displays the returned products in `src/shop.tsx`.
- Cart contents, accounts, session identity, and orders are stored in browser
  `localStorage` in `src/shop.tsx`. This storage is not shared across devices
  and can be altered by the customer.

### Important gaps and risks

| Priority | Finding | Backend implication |
|---|---|---|
| Critical | The current order API does not initiate or verify M-Pesa payments. | Add a server-side Daraja STK Push flow and verified callback/status handling before claiming a payment prompt was sent or showing an order as paid. |
| Critical | The browser displays an estimated total based on API prices and delivery fees. | Recalculate all prices, delivery fees, totals, and order references on the server from current database records. |
| High | Passwords are SHA-256 hashed in browser storage, while session identity is just a local user ID. | Implement server-side password hashing and secure server-managed sessions; do not migrate or trust local hashes or local session IDs. |
| High | Catalogue prices and availability are displayed from the products API but may change before checkout. | Store authoritative availability and variant prices server-side and revalidate them during order placement to prevent stale pricing and overselling. |
| High | Orders and profile data exist only in the current browser. | Persist them server-side, associate each order with its customer, and expose an authenticated order history. |
| High | The homepage inquiry form prevents submission without sending or storing the inquiry. | Add an inquiry endpoint and connect the form to it with validation and clear success/error feedback. |
| Medium | Delivery areas and fees depend on the delivery-options API having active configuration. | Configure and maintain valid delivery zones, fees, and service availability on the server. |
| Medium | Google and Apple sign-in buttons are placeholders. | Treat social sign-in as a later optional feature unless product owners require it for launch. |
| Medium | Checkout requires account sign-in, even though the cart is browser-local. | Preserve this behavior for the initial backend unless guest checkout is explicitly approved; safely merge a guest cart after sign-in. |

### Existing user-facing capabilities to preserve

- Product browse, category filtering, text search, and price sorting.
- Product variants with multiple price tiers and presentation options.
- Cart line quantities, removal, and checkout.
- Customer sign-up/sign-in using phone or email, profile editing, and order
  history.
- Checkout with recipient details, Nairobi delivery area, delivery date/time
  slot, an optional card message, and M-Pesa payment.
- A general inquiry form for flower delivery, weddings, event décor, flower
  maintenance, and funeral/sympathy flowers.

## 3. Roles and authorization

1. **Visitor**: browse active products and delivery information; submit an
   inquiry; cannot access customer-specific account or order data.
2. **Customer**: manage their own profile, create orders, initiate payment,
   and view only their own orders and payment status.
3. **Staff/admin**: manage catalogue, pricing, availability, delivery settings,
   inquiries, and order fulfilment. Staff permissions must be separated from
   customer permissions and recorded for sensitive changes.

The first production release needs a documented, secure way to create and
manage staff accounts. Public sign-up must never grant staff privileges.

## 4. Functional requirements

### 4.1 Catalogue and availability

- Provide a public API for active catalogue products, with category, name,
  description, ingredients, palette, occasion tags, seasonal availability,
  image/alt text, price tiers, presentation choices, and availability.
- Support the existing `Flowers` and `Fruit & gifts` categories. The product
  schema must allow future categories without requiring a frontend rewrite.
- Represent each selectable price tier as a server-owned variant. Define the
  meaning and customer-facing label for each tier; the current UI displays
  generic “Size 1”, “Size 2”, etc.
- Validate the selected presentation against the product's permitted
  presentations. A presentation may affect price only when configured by
  staff.
- Make stock/availability authoritative. If inventory is not tracked
  individually, provide an explicit made-to-order/available status rather
  than presenting a fabricated stock count.
- Support filtering/search and stable pagination if the catalogue grows.
  Search and sorting may be performed by the client after downloading a small
  catalogue, but the API must return consistent, complete product data.
- Provide protected staff operations to create, edit, publish/unpublish, and
  retire products; edit variants/prices, availability, and media metadata.

#### Product catalogue API contract

The shop requests `GET /products?ordering=name&page=1` from
`VITE_API_BASE_URL`, follows same-API pagination links, and uses the returned
products as the only catalogue source. Return either a product array or a
paginated object with `count`, `next`, `previous`, and `results`.

Each product should provide:

- `id` (or `slug`), `name`, `categoryName`, and `description`.
- `image` and `imageAlt`; the shop displays the supplied image URL and
  alternate text.
- `startingPriceKes` for the listing price.
- `variants` with numeric `id`, `label`, `priceKes`, and `availability`.
- `presentations` with the presentation IDs and optional labels used by
  checkout.
- Optional `isSeasonal`, `seasonNote`, `ingredients`, `palette`, `occasions`,
  and `stock`.

The shop keeps its existing search, category, sort, product options, and cart
layout, and maps the API fields into that view model. Displayed prices and
availability are informational; checkout still sends product/variant/
presentation IDs and the backend must use its own current prices and
availability when creating an order.

### 4.2 Customer identity, authentication, and profile

- Support registration with name, Kenyan phone number, optional email, and
  password. Phone number is required and unique after normalization; a supplied
  email must be valid and unique.
- Enforce the frontend password policy on the server for password-based
  registration: at least 8 characters, including an uppercase letter, a
  lowercase letter, a number, and a special character. The frontend shows
  these requirements as each one is met, and requires the password to be
  entered twice before submitting.
- Support sign-in using phone number or email and password.
- Store passwords only as a salted, adaptive password hash (for example
  Argon2id or bcrypt with production-appropriate work factors). Do not use
  SHA-256 for password storage.
- Use HTTPS and secure, `HttpOnly`, `SameSite` session cookies. Apply CSRF
  protection to state-changing requests when using cookie authentication.
  Provide login throttling, generic credential errors, logout, session
  expiry, and session revocation.
- Provide authenticated read/update operations for customer name, phone,
  optional email, and default delivery area/address. Validate uniqueness and
  normalize Kenyan phone numbers on the server.
- Keep authorization ownership checks on every profile/order request.
- Password reset and email/phone verification policies must be decided before
  public launch; the system must not silently imply verification that was not
  completed.
- Google sign-in is available from the account form. Apple sign-in is not
  offered there; Apple account linking may remain available in account
  settings. Configure provider client IDs and allowed callback/origin settings
  before enabling the corresponding frontend controls.
- The account form no longer asks for a phone number during Google sign-in.
  The backend must allow a new Google-linked account without a phone number
  (or define a separate follow-up phone verification flow); otherwise its
  `PHONE_REQUIRED` response will prevent new social accounts from signing in.
  Password-based registration still requires a phone number.

### 4.3 Cart, pricing, and checkout

- The browser may keep a temporary cart locally, but the server must treat
  submitted product IDs, variants, quantities, and prices as untrusted.
- On checkout, validate each active product/variant, quantity, availability,
  and current price. Return a clear conflict if the catalogue or stock changed.
- Compute item totals, delivery fees, and the final total on the server using
  integer Kenyan shillings (KES); never accept a client-calculated amount as
  authoritative.
- Validate recipient name and phone, delivery address, allowed area, delivery
  date, time slot, optional card message, and the customer's M-Pesa phone.
- Reject past dates and dates/times that are unavailable. Use
  `Africa/Nairobi` for business rules and display; avoid relying on the
  browser's UTC date as the local delivery date.
- Define and expose delivery options/fees through the API. Current area names
  and fees in `src/shop.tsx` are placeholders and must be confirmed by the
  business before they are configured as production data.
- Require an idempotency key when creating an order/payment attempt so that
  duplicate clicks, retries, or network timeouts do not create duplicate
  orders or charges.
- Preserve the current sign-in-required checkout unless guest checkout is
  explicitly approved. After sign-in, the customer's pre-existing cart must be
  retained safely.

### 4.4 Orders and fulfilment

- Create an order with a unique, server-generated, human-readable reference.
- Save an immutable snapshot of each item: product/variant identity, name,
  selected presentation, quantity, unit price, and line total at purchase.
- Save customer and recipient details, delivery address/area, date/time slot,
  optional card message, subtotal, delivery charge, total, currency, and
  creation timestamp.
- Use explicit order and payment states. At minimum:
  - Order: `pending_payment`, `confirmed`, `preparing`, `ready`,
    `out_for_delivery`, `delivered`, `cancelled`.
  - Payment: `pending`, `paid`, `failed`, `cancelled`, `refunded`.
- Payment and order state transitions must be validated on the server.
  A customer must not be able to set their own order to paid or delivered.
- Provide customer order-history/detail endpoints scoped to the signed-in
  customer.
- Provide staff order lookup and fulfilment/status updates, with timestamps
  and an audit trail.
- Define cancellation, payment timeout, stock release, refund, and partial
  fulfilment policies before launch.

### 4.5 Payment status and M-Pesa

- The currently supplied API contract does **not** expose an STK Push or other
  payment-initiation endpoint. `POST /orders` creates an order in
  `pending_payment`, and staff confirm it using the admin order-status
  endpoint. The frontend must not claim a payment prompt was sent or show an
  order as paid while this contract remains in place.
- The frontend collects `mpesaPhone` and includes it with `POST /orders`, but
  the backend must add support for this field before deploying that frontend
  change. To initiate payment, add an authenticated endpoint such as
  `POST /orders/{id}/payments/mpesa` that validates the order owner and uses
  the stored/validated phone to request an STK Push. Return a pending payment
  state; only verified, idempotently processed provider callbacks may mark the
  order paid. Do not make the order-creation response imply that payment was
  initiated.
- Confirm with the business whether customers pay through an M-Pesa till and
  staff reconcile payments manually, or whether a future Daraja STK Push
  endpoint is required. Do not send Daraja credentials or payment PINs through
  the browser.
- If STK Push is added later, initiate it only on the backend, reconcile
  callbacks idempotently, verify provider success, and expose an authenticated
  order/payment-status endpoint. Only verified provider success may mark an
  order paid.

### 4.6 Customer inquiries

- Add a public endpoint for the homepage inquiry form with:
  customer name, Kenyan contact phone, email address, occasion, preferred contact
  method, optional details, and server-generated submission time/status. Require
  a valid email address for the acknowledgement.
- Accept the API occasion values `flower_delivery`, `wedding`, `event_decor`,
  `flower_maintenance`, and `funeral`. Allow future additions.
- Validate and length-limit every field; apply rate limits and anti-spam
  controls appropriate to a public form.
- Return a durable inquiry ID and a success response only after the record has
  been accepted for storage.
- Provide staff access to list, inspect, assign, and update inquiry status
  (for example `new`, `contacted`, `quoted`, `closed`).
- Send the inquiry acknowledgement by email using the configured transactional
  email provider. Delivery failure must not discard the inquiry.

### 4.7 Notifications

- Send payment/order confirmation only after verified payment success.
- Send the order-received message after order creation and a payment-confirmed
  message only after payment confirmation.
- Send inquiry acknowledgements to the required email address. Preferred
  phone/WhatsApp/SMS methods are for staff follow-up; automated customer
  notifications use email.
- Log email delivery failures without logging message secrets or unnecessary
  personal data; notification failure must not roll back an order or inquiry.

## 5. Supplied API contract

Configure the frontend base URL as `VITE_API_BASE_URL`, with a value such as
`https://<your-service>.onrender.com/api/v1` and no trailing slash. Requests
must use `credentials: "include"`. JSON requests must set
`Content-Type: application/json`. Call `GET /auth/csrf` first and include its
`csrfToken` as `X-CSRFToken` on protected `POST` and `PATCH` requests.
`POST /inquiries` is public and does not require the CSRF header.

| Method and path (relative to base URL) | Access | Purpose |
|---|---|---|
| `GET /healthz` (service root, not API base) | Public | Health check returning `{"status":"ok"}`. |
| `GET /products` | Public | List products and variants; optional category, search, ordering, and page query parameters. Product IDs used in orders are slugs. |
| `GET /products/{slug}` | Public | Return one product. |
| `GET /delivery-options` | Public | Return delivery area IDs, fees, slots, lead times, and booking horizon. |
| `GET /auth/csrf` | Public | Return the CSRF token and establish any corresponding cookie. |
| `POST /auth/signup` | Public | Register with `{name, phone, email?, password}`. |
| `POST /auth/login` | Public | Sign in with `{identifier, password}`. |
| `POST /auth/social/google` | Public | Sign in with `{idToken, phone?, nonce?}`. |
| `POST /auth/social/apple` | Public | Sign in with `{idToken, name?, phone?}`. |
| `POST /auth/social/{google\|apple}/link` | Authenticated | Link a provider with `{idToken}`. |
| `POST /auth/logout` | Authenticated | Revoke the current session; no request body. |
| `GET /me` | Authenticated | Read customer profile and `socialProviders`. |
| `PATCH /me` | Authenticated | Update any of `name`, `phone`, `email`, `default_delivery_area`, `default_address`. |
| `POST /orders` | Authenticated | Create a server-priced pending order. Requires a UUID `Idempotency-Key`; accepts the M-Pesa phone number as `mpesaPhone`. |
| `GET /orders/{id}` | Order owner/staff | Read the caller-owned order; other customers receive 404. |
| `POST /orders/{id}/cancel` | Order owner | Cancel only while status is `pending_payment`; no body. |
| `GET /me/orders` | Authenticated | Read the current customer's order history. |
| `POST /inquiries` | Public | Persist a customer inquiry; no CSRF header and no `website` field. |
| `/admin/` | Staff | Django admin for catalogue, delivery areas, prices, fees, orders, and inquiries. |
| `GET /admin/orders`, `GET /admin/orders/{id}` | Staff | Search/list orders and inspect order event history. |
| `POST /admin/orders/{id}/status` | Staff | Update order status with `{status, note}`. |
| `GET /admin/inquiries`, `PATCH /admin/inquiries/{id}` | Staff | List and update inquiry status/assignment. |

The checkout keeps the delivery area, address, date, and time-slot selectors in
the frontend. `GET /delivery-options` must return available areas with an
`id`, `name`, `fee`, date limits, and `timeSlots` (or `time_slots`/`slots`)
containing numeric slot IDs and display labels. The frontend submits the
selected delivery details with the order; it does not submit a trusted fee.

The live endpoint currently returns global delivery slots and booking rules,
but an empty `areas` array. The frontend maps the global `slots` list onto each
area returned by the endpoint, but cannot offer delivery until at least one
area is configured. Seed active delivery areas with IDs, names, and fees in
the backend; the frontend must not invent IDs, fees, or areas the order API
cannot validate. The response-level `maxDaysAhead` is used when an area does
not override its own booking horizon. The backend remains authoritative for
the exact `minLeadHours` rule and blocked dates at order creation.

The order request contains `items` with `productId` (slug), numeric
`variantId`, `presentationId`, and `quantity`, plus `recipientName`,
`recipientPhone`, `deliveryAddress`, `deliveryArea` (selected area ID),
numeric `deliverySlot` (selected slot ID), `deliveryDate`, `cardMessage`, and
`mpesaPhone`. The account name/email shown in checkout come from the
authenticated session and are not resent as customer identity fields. Validate
and normalize `mpesaPhone`, and store it with the order/payment attempt for
payment use.
The backend must confirm that the area exists, the slot belongs to that area
and is available on the requested date, and that the date meets the area's
lead-time and booking-window rules. Resolve the delivery fee from the selected
area in the database and calculate the final total server-side; never trust a
fee or total from the browser. Preserve the selected area/date/slot in the
created order response and order history. Orders remain `pending_payment`
until staff confirms payment. There is no client-facing payment-initiation
endpoint in this API contract.

Inquiry requests contain `name`, `phone`, `email`, `occasion`, and optional
`preferredContact` and `details`. Email is required and receives an inquiry
acknowledgement; the preferred contact method is for staff follow-up. Occasion values are `flower_delivery`,
`event_decor`, `flower_maintenance`, or `funeral`. Preferred contact values
are `phone`, `whatsapp`, `sms`, or `email`. Do not send the hidden anti-spam
`website` field.

Errors use `{"error":{"code","message","fields"}}`. Validation fields should
be presented beside the relevant form controls where possible. `PHONE_REQUIRED`
indicates a new social account needs a phone number; HTTP 409 indicates a
conflict, including duplicate or unusable idempotency keys.

All endpoints must use a consistent error envelope, such as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please review the highlighted fields.",
    "fields": { "phone": "Enter a valid Kenyan phone number." }
  }
}
```

Use appropriate HTTP status codes. Do not return success-shaped fallback
responses when a database, payment, or notification operation fails.

## 6. Core data model

The database technology is not prescribed. A relational database is
recommended because orders, line items, payments, and state transitions need
transactional consistency.

- **Customer**: ID, name, normalized unique phone, optional unique normalized
  email, password hash, default delivery area/address, timestamps, account
  state.
- **Session**: customer ID, hashed/revocable session identifier, expiry,
  creation and last-use timestamps.
- **Product**: stable ID, category, display fields, active/seasonal state,
  media metadata, availability/stock policy, timestamps.
- **ProductVariant**: product ID, tier/size label, price in KES minor units or
  integer KES, presentation options, availability.
- **DeliveryOption**: area identifier/name, fee, active state, date/slot
  availability and any applicable constraints.
- **Order**: customer ID, unique reference, order state, recipient and delivery
  snapshot, card message, amount breakdown, currency, timestamps.
- **OrderItem**: order ID, product/variant references plus immutable purchase
  snapshots and quantity/price totals.
- **Payment**: order ID, provider, amount, currency, phone, provider request
  IDs, receipt, status, idempotency key, callback metadata, timestamps.
- **Inquiry**: contact details, occasion, preferred channel, details, status,
  assignment, timestamps.
- **StaffUser / AuditEvent**: staff roles and an append-only record of
  sensitive administrative/state changes.
- **Notification** (recommended): related order/inquiry, channel, provider
  message ID, delivery status, retry metadata, timestamps.

Sensitive provider payloads should be minimized and retained only as long as
necessary for reconciliation and legal/business requirements.

## 7. Security, privacy, and reliability requirements

- Enforce TLS, secure secret management, input validation, parameterized
  database access, output encoding, least privilege, and a restrictive CORS
  policy.
- Never store payment PINs, card details, Daraja credentials in the client, or
  raw passwords. M-Pesa PIN entry remains inside Safaricom's flow.
- Apply rate limits to login, registration, password reset, inquiry
  submission, order creation, and payment initiation.
- Protect against cross-site request forgery, account enumeration, brute force,
  injection, insecure direct object references, and replayed payment callbacks.
- Collect only personal data needed for fulfilment and support. Publish a
  privacy/retention policy and provide a process for customer data access,
  correction, and deletion subject to applicable Kenyan law.
- Use transactions for order creation, price/availability validation, payment
  transitions, and inventory reservations where stock is tracked.
- Add structured logs, request correlation IDs, monitoring for failed payments
  and callback processing, backup/restore procedures, and documented incident
  response. Exclude passwords, tokens, and unnecessary personal/payment data
  from logs.
- Define data retention and backup recovery objectives before launch and test
  database restoration.

## 8. Acceptance criteria

The backend is ready for production integration only when:

1. Products, variants, prices, stock/availability, and delivery fees are read
   from the backend and editable by authorized staff.
2. Customer sign-up, login, logout, profile update, and order history work
   across browsers/devices using server-side identity and secure sessions.
3. Checkout totals are recalculated by the backend, and client changes to
   submitted price, delivery fee, total, order ID, or customer ID cannot alter
   the persisted order/payment.
4. Duplicate order/payment submissions and duplicate M-Pesa callbacks do not
   create duplicate orders, charges, receipts, or state transitions.
5. A pending/failed payment is never presented as paid; an order is marked paid
   only after verified Daraja success.
6. Orders and inquiries remain available after clearing browser storage or
   using another device.
7. The contact form persists inquiries and presents explicit success/error
   feedback.
8. Customers cannot access another customer's profile/order, and public
   accounts cannot access staff operations.
9. Automated tests cover validation, authorization, price calculation, order
   lifecycle, payment idempotency/callback handling, and inquiry creation.
10. Production secrets are configured outside source control, sandbox and
    production payment settings are separated, and backups/monitoring are
    operational.

## 9. Delivery plan

### Phase 0 — Business and provider decisions

- Confirm product variant/tier labels and whether prices differ by
  presentation.
- Confirm actual delivery zones/fees, lead times, unavailable dates, time
  slots, stock or made-to-order policy, cancellation/refund rules, and guest
  checkout policy.
- Register/configure Safaricom Daraja credentials and callback URLs; choose
  SMS/WhatsApp/email providers and confirm message content/consent.
- Decide hosting, database, staff roles, privacy/retention policy, and account
  verification/password reset requirements.

### Phase 1 — Production ordering foundation

- Database and migrations; catalogue/delivery APIs and staff maintenance.
- Authentication/profile endpoints with secure sessions.
- Server-validated order creation and customer order history.
- Daraja sandbox integration with idempotent callbacks, status reconciliation,
  and automated tests.
- Inquiry intake, basic staff inquiry/order views, monitoring, and backups.

### Phase 2 — Operational completion

- Production Daraja rollout after sandbox and reconciliation sign-off.
- Staff fulfilment workflows, configurable notifications, and retry handling.
- Inventory reservations and richer availability rules if confirmed as needed.
- Guest checkout only if approved. Social login/link endpoints are part of the
  supplied contract and require configured Google/Apple provider credentials.

## 10. Assumptions and decisions required

- Currency is KES and the initial service area is Nairobi, as implied by the
  current UI.
- Checkout remains account-required until the business decides otherwise.
- M-Pesa is the initial online payment method.
- Product catalog and delivery prices shown today are frontend seed data, not
  verified production values.
- A staff/admin interface is required to operate orders and inquiries, though
  its visual design is not specified here.
- Guest checkout, refunds, and multi-currency support are not assumed for the
  initial release.
