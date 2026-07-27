# # Product Requirement Document (PRD): Card Breaking Platform

## Project: Automated Card Breaking Platform

## 1. Project Overview & Architecture

This platform is a dedicated web system for a Card Breaker (Admin) to host group breaks. The system allows the admin to list Breaks and lets users buy specific Player/Team slots with an automated lock mechanism. After the live stream, the admin posts the video recording link. Users view their break results from the video and independently select their preferred delivery option within their account.

### Core Principles

- **Max Automation for Sales:** 100% automated slot purchasing via Stripe with real-time webhook syncing.
- **Zero-Fee Internal Loop:** Streamlined on-site Wallet System to handle cancellations without losing merchant gateway fees.
- **Supreme Operational Flexibility:** The admin maintains total manual override control over withdrawals and shipping data to handle unexpected real-world situations.
- **Production-Grade Security:** Multilayered defensive architecture to block double-spending, race conditions, IDOR, XSS, and privilege escalation.

---

## 2. Core Business Logic & Workflows

### 2.1 Authentication & Gatekeeping (強制登入與帳戶攔截)

- **The Authentication Guard:** Browsing the listed Breaks and available slots is public. However, clicking the "Checkout" button for any player slot requires the user to be fully authenticated.
- **The Interception Flow:** If a guest (unauthenticated user) clicks "Checkout", the system must intercept the action, preserve the intended slot selection context, and redirect them to the Login / Create Account page.
- **Mandatory Fields:** During registration, users must provide a valid Email and a Phone Number (supporting international country codes e.g., +1, +44, +852) to support future SF Express logistics and FPS payouts.
- **Post-Auth Resume:** Once the user successfully logs in or finishes account creation, they are returned to the workflow to initiate the 8-minute countdown lock.

### 2.2 Concurrency & Slot Locking (Standard Checkout)

- **The Lock:** When an authenticated user clicks "Checkout" for a player slot, the slot status changes to `Locked`.
- **The Timer:** A **8-minute countdown** timer begins. The slot is held exclusively for this user.
- **Success Case:** Stripe Webhook sends payment confirmation (`payment_intent.succeeded`) -> slot status updates permanently to `Sold`.
- **Timeout/Abandon Case:** If the timer expires or the user abandons the checkout, the system automatically releases the slot back to `Available`.
- **Security Guard:** Implement database row-level locking (`SELECT FOR UPDATE`) in transactions to ensure two users cannot lock the same slot at the exact same millisecond.

### 2.3 Wallet Credit & Cancellation (流局機制)

- **Payments:** Automated via Stripe (Supports Credit Card, PayMe, FPS, Apple Pay, Google Pay and PayPal for Slot Purchases Only).
- **Cancellation (流局):** If the Admin cancels a Break (e.g., not enough participants), **NO direct Stripe refund is triggered**. Instead, funds are 100% credited into the user's website wallet (`users.store_credit`). This completely avoids merchant fee losses from payment gateways.
- **Spending Credit:** Users can use their accumulated `store_credit` during checkout. If the balance covers the total order, checkout completes instantly with 0% gateway fees.

### 2.4 Manual Secure Cash Out (手動提現流程)

- **Request Entry:** Users with a credit balance can request a Cash Out of their `store_credit` from their account dashboard.
- **Required Fields:** `Amount` (must be <= current balance), `Method` (Dropdown: `FPS`, `PayMe`, or `PayPal` for international users), and `Recipient Details` (e.g., FPS Phone/ID, PayMe mobile/link, or PayPal Email address).
- **Instant Freeze:** Upon submission, the requested amount is instantly frozen and deducted from their active balance into a `Pending` state.
- **Admin Offline Action:** Admin manually logs into their personal mobile banking / PayMe app, copies the payment details from the backend, and transfers the cash to the user.
- **Completion:** Admin clicks **"Complete Withdrawal"** in the backend dashboard -> Request status updates to `Completed` and triggers an automated success email to the user.
- **Rejection:** If details are wrong, Admin clicks **"Reject"** -> Request status updates to `Rejected`, the frozen amount is **automatically refunded** back to the user's `store_credit`, and a notification email is sent.

### 2.5 Post-Break Flexible Shipping Workflow (免付款、售後物流意願提交)

- **No Shipping Fees at Checkout:** Users do NOT select shipping methods or input delivery addresses when purchasing slots.
- **Posting the Video:** After the live stream, the Admin marks the Break as `Completed` and saves the recording URL (`video_url` e.g., YouTube/Instagram Live playback link).
- **User Action (Intent Submission):**
    1. Users log into "My Account" and view their completed breaks.
    2. Next to a completed break, they click **"Select Delivery Option"**.
    3. The system dynamically renders the active shipping methods enabled by the admin.
    4. The user selects an option (e.g., Hold for Next Shipping, SF Express Collect / 順豐到付, In-Person Pickup), types text notes (like SF Box Code or phone number), and clicks **"Confirm"**.
    5. **NO payment gateway is triggered** since options utilize collect-on-delivery (到付) or manual pickup. The request status updates to `Pending`.

---

## 3. Admin Panel & Control Overrides (後台最高管理權限)

### 3.1 Dynamic Shipping Options Toggles

- Admin can dynamically Create, Edit, and Manage shipping methods.
- Admin can **Toggle (ON/OFF)** visibility for each option. Disabled options are hidden from the user's dropdown menu but preserved in historical records.

### 3.2 Override/Edit User Shipping Requests

- If a user changes their mind after submitting their intent (e.g., changing from SF Express to In-Person pickup), the Admin has total override capability.
- Inside the Admin Dashboard, the Admin can click **"Edit Request"** on any user's shipping log to manually alter the `option_name`, edit the `shipping_details` text, add administrative notes, or update the fulfillment status (`Pending` -> `Completed`/`Shipped`).

---

## 4. Developer Implementation & Edge Cases (技術防禦邏輯)

### 4.1 Prevention of Double-Spending Credits (防止餘額雙重佔用)

- When a user applies `store_credit` during the 8-minute checkout lock, the applied credit must be instantly moved into a `temporary_reserved` state.
- If the checkout expires or fails, the reserved credit must be rolled back to the active balance via a strict database transaction. It cannot be used in another tab while locked.

### 4.2 Mixed-Payment Cancellation Rule (混合付款流局處理)

- If an order was split-paid using a mix of Store Credit and Stripe (Credit Card), upon Admin Break Cancellation, the **TOTAL paid amount (100%)** will be refunded into the user's `store_credit`. No partial external Stripe refunds will be performed.

### 4.3 Shipping Request Idempotency (物流狀態鎖定)

- Once a user submits their shipping option for a completed break, the frontend submission button for that break becomes **Disabled (Read-Only)**. The user cannot resubmit or change it from the frontend to prevent data tampering while the admin is packing. Any further updates must go through the Admin override panel.

### 4.4 Soft-Delete / Disable for Shipping Options (物流數據安全)

- Shipping options in the admin panel can only be toggled `is_active = false` (disabled). Hard deleting (`DELETE`) an option from the database is strictly prohibited to maintain database foreign-key integrity with historical customer choices.

### 4.5 Shipping Dashboard Data Aggregation (物流清單自動對賬)

- The `shipping_requests` entry must automatically snapshot and append all `slot_names` purchased by that user within that specific break (e.g., "Slots: Lakers, Celtics"). This allows the admin to pack cards directly from the shipping dashboard without needing to open separate order history tabs.

### 4.6 International User Support (國際用戶兼容)

- **Phone Format:** The website must accept international phone numbers with country codes (e.g., +1, +886) during signup, not strictly limited to 8-digit HK numbers.
- **International Shipping Notes:** The user-entered `shipping_details` field must support long-form English character text to allow international addresses and Postal/Zip codes.

---

## 5. Hacker-Perspective Security Defenses (黑客網絡安全防禦)

### 5.1 IDOR Prevention on User Actions (防範越權漏洞)

- **Rule:** For all user-facing endpoints (e.g., `POST /api/withdrawal/cancel`, `POST /api/shipping/submit`), the backend **MUST NOT** blindly trust or rely solely on user-supplied resource IDs.
- **Enforcement:** The backend code must always validate the session token and strictly append the verified logged-in user ID to the SQL query. (Example: `WHERE id = request_id AND user_id = authenticated_session_user_id`). This completely blocks users from viewing, deleting, or altering other clients' withdrawals or shipping logs.

### 5.2 Server-Side Verification for Shipping Requests (防範前端繞過及重複提交)

- **Rule:** Frontend button disabling (Section 4.3) is for UX only. The server must handle adversarial requests (e.g., automated scripts bypassing the UI).
- **Enforcement:** The backend API endpoint for shipping submission must execute a strict server-side check. If a shipping request already exists for the given `user_id` and `break_id`, it must immediately block the transaction and reject it with an error code (e.g., `400 Bad Request: Shipping already requested`), preventing concurrent "race conditions" from spamming conflicting logistics choices.

### 5.3 Strict Role-Based Access Control (RBAC) (防範權限提升漏洞)

- **Rule:** Any API route under `/api/admin/*` must be strictly fortified. Ordinary users trying to guess admin API endpoints using tools like Postman must be denied immediately.
- **Enforcement:** All administrative endpoints must be guarded by a secure backend server middleware layer. It must explicitly verify that the user's metadata role equals `admin` (e.g., utilizing Supabase RBAC or custom roles). If unauthorized, return `403 Forbidden` instantly.

### 5.4 Backend Content Sanitization (防範惡意腳本注入 Stored XSS)

- **Rule:** Fields filled by users or the admin (`video_url`, `admin_notes`, `shipping_details`) must never evaluate raw executable scripts inside other clients' browsers.
- **Enforcement:** Next.js must treat these string inputs strictly as text nodes or safe URLs. Avoid using risky rendering functions such as `dangerouslySetInnerHTML`. All input vectors must be properly sanitized and escaped on the server side before updating rows in the database.

### 5.5 Global API Rate Limiting (防範自動化爆破與重放攻擊)

- **Rule:** Protect the server from automated script abuse targeting cash out submissions or user profile adjustments.
- **Enforcement:** Implement robust server-side rate-limiting. For instance, restrict users to a maximum of 3 withdrawal submissions per hour and 1 profile change per minute. Any IP or account exceeding this threshold should temporarily trigger an automated `429 Too Many Requests` block to safeguard database resources.

---

## 6. Simplified Database Schema (For AI Reference)

### `users` Table

- `id` (UUID, Primary Key)
- `email` (Text)
- `phone` (Text, Mandatory, supports international country codes e.g., +1, +44)
- `store_credit` (Decimal, default 0.00)

### `breaks` Table

- `id` (BigInt/UUID, Primary Key)
- `title` (Text)
- `description` (Text)
- `image_url` (Text)
- `status` (Enum: `active`, `completed`, `cancelled`)
- `video_url` (Text, Nullable, Mandatory when status becomes `completed`)

### `break_slots` Table

- `id` (BigInt/UUID, Primary Key)
- `break_id` (Foreign Key -> `breaks.id`)
- `name` (Text, e.g., "Lakers", "Celtics")
- `price` (Decimal)
- `status` (Enum: `available`, `locked`, `sold`)
- `user_id` (Foreign Key -> `users.id`, Nullable)
- `locked_at` (Timestamp, Nullable)

### `shipping_options` Table

- `id` (BigInt, Primary Key)
- `name` (Text, e.g., "Hold for Next Shipping", "SF Express Collect")
- `instructions` (Text)
- `is_active` (Boolean, default true)

### `shipping_requests` Table

- `id` (BigInt, Primary Key)
- `user_id` (Foreign Key -> `users.id`)
- `break_id` (Foreign Key -> `breaks.id`)
- `slot_names_snapshot` (Text/Array, e.g., "Lakers, Celtics" for admin visibility)
- `option_name` (Text, snapshots the method chosen)
- `shipping_details` (Text, User-entered box codes or notes)
- `status` (Enum: `pending`, `completed`)
- `admin_notes` (Text, Nullable, for manual overrides)

### `withdrawals` Table

- `id` (BigInt, Primary Key)
- `user_id` (Foreign Key -> `users.id`)
- `amount` (Decimal)
- `method` (Enum: `FPS`, `PayMe`, `PayPal`)
- `details` (Text, account string or phone number)
- `status` (Enum: `pending`, `completed`, `rejected`)

---

## 7. End-to-End User & Admin Story Flow (場景故事流水線)

To help AI visualize the operations, developers must implement the system to fully realize the following four operational narrative branches:

### Story 1: The Standard Purchase & Successful Delivery (正常開箱與到付物流)

1. **[Admin]** Lists a new Break titled "2026 NBA Prizm Hobby Box #01" (`status: active`) with 30 team slots.
2. **[User (Guest)]** Visits the homepage, sees the break, and clicks "Checkout" on the "Lakers" slot.
3. **[System]** Detects the user is a guest. Intercepts action and redirects them to the `Create Account` page.
4. **[User]** Signs up with their email and phone number (`+852 9123 4567`), then is instantly redirected back to the break page.
5. **[System]** Automatically triggers the 8-minute countdown lock (`status: locked`).
6. **[User]** Completes payment via Apple Pay inside the 8-minute window. Stripe Webhook fires, setting the slot to `Sold`.
7. **[Admin]** When all slots sell out, the Admin hosts the live stream, reveals the cards, uploads the playback link (`video_url`), and changes the Break `status` to `completed`.
8. **[User]** Logs into "My Account", watches the playback, clicks "Select Delivery Option", selects **"SF Express Collect (順豐到付)"**, types in their SF Smart Locker code `H852XX`, and hits confirm. The form locks permanently.
9. **[Admin]** Opens the Shipping Dashboard, sees a unified card for the user showcasing **[User Name - SF Express Collect - Details: H852XX - Slots Won: Lakers]**. Admin packs the card, ships it via SF Express, and updates the status to `Completed`.

### Story 2: The Break Cancellation & Wallet Loop (不夠人抽流局退款)

1. **[User]** Logs in, joins an active break, and buys the "Celtics" slot for $300.
2. **[Admin]** After a week, the break fails to fill. Admin clicks "Cancel Break" in the dashboard.
3. **[System]** In a secure database transaction, the Break status updates to `cancelled`, the slot status flips to `refunded`, and the $300 is 100% added directly to the user's `store_credit`. No merchant fees are lost on Stripe.
4. **[User]** Receives an automated email, logs back in, and notices their balance is now $300. They can use this balance instantly on other active breaks with zero checkout friction.

### Story 3: International Customer Delivery (海外客人寄送)

1. **[User (International)]** Registers an account using an international number (`+1 212 555 0199`).
2. **[User]** Purchases a slot using a global credit card via Stripe.
3. **[Admin]** Conducts the live break and completes the event.
4. **[User]** Logs into their dashboard, selects the shipping option **"International Shipping"**, and enters their full English text address: `"123 Card St, New York, NY, 10001, USA"`.
5. **[Admin]** Reviews the aggregated log on the dashboard, prints the international shipping label directly from the text snapshot, and dispatches the package manually.

### Story 4: Wallet Cash Out Request (客戶錢包手動提現)

1. **[User]** Has a $500 balance in their website wallet from a previous cancellation. They go to their profile and click "Request Cash Out".
2. **[User]** Selects **"PayPal"** (or FPS), inputs their email address `collector@email.com`, requests $500, and clicks submit.
3. **[System]** Instantly deducts/freezes the $500 from the user's active `store_credit` balance and creates a `withdrawal` log marked as `pending`.
4. **[Admin]** Reviews the backend pending withdrawals list, copies `collector@email.com`, logs into their personal PayPal business account, and manually sends $500 to the user.
5. **[Admin]** Returns to the platform dashboard and clicks **"Complete Withdrawal"**. The frozen money is permanently written off, and the user receives a confirmation email.
    
    ---
    

## 8. Operational Constraints & State Transitions (狀態變更約束)

To ensure consistency across the platform, developers must strictly adhere to the following product workflow and database state transitions.

### 8.1 Break Product Lifecycle States

A `break_product` record must transition through these explicit statuses:

1. **`active`**: Product is listed; users can view slots. Authenticated users can lock slots.
2. **`sold_out`**: All slots associated with this break are purchased.
3. **`completed`**: Admin has conducted the live stream and uploaded the `video_url`.
4. **`cancelled`**: Admin cancelled the break. This status changes all associated slot states, triggers bulk wallet returns, and updates internal ledgers.

### 8.2 Slot Lifecycle States

An individual `slot` must transition through these statuses:

1. **`available`**: Open for anyone to view. Requires authentication to lock.
2. **`locked`**: Reserved for 8 minutes by a specific authenticated `user_id`. (Handled via Row-Level Locking).
3. **`sold`**: Stripe webhook confirmed payment or store credit deduction successful.
4. **`refunded`**: Automatically triggered only if the parent Break moves to `cancelled`.

### 8.3 Sequential Order of Operations (The Flow Constraints)

Developers must implement the following business rules to guarantee the workflow sequence:

- **Rule 1 (Authentication Enforcement):** The platform must strictly reject any backend API request to mutate a slot status to `locked` if the session lacks a verified user token. Guest users must be forced into the signup/login funnel prior to checkout generation.
- **Rule 2 (No Premature Shipping):** A user CANNOT access or submit the `Select Delivery Option` form for a slot until the parent Break status is strictly updated to `completed`.
- **Rule 3 (One-Time Shipping Submission):** Once a user submits their logistics choice (SF, Hold, International, Pickup) for a completed break, the submission becomes **Read-Only**. The frontend must swap the form for a receipt view to prevent double-submissions or shipping-address tampering.
- **Rule 4 (Internalized Wallet Loop):** Stripe is exclusively used for the initial inbound `slot` purchases. All refunds (`cancelled` break) and custom payouts (`withdrawals`) bypass Stripe entirely and must run through the database internal `store_credit` transactions to protect the vendor from merchant transaction fee loss.
- **Rule 5 (Withdrawal Escrow Locking):** When a user requests a withdrawal, the requested amount must be immediately moved from `store_credit` into a locked/frozen state. If Admin selects `complete`, the frozen credit is permanently deleted. If Admin selects `reject`, the frozen credit instantly rolls back into active `store_credit`.

---