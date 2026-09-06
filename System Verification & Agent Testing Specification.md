⚡ VoltGrid: Cloud Supabase Automated QA Specification

    Target Environment: Live Supabase Cloud Project (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local)
    Target App Host: http://localhost:5173 (Vite Dev Server linked to Cloud Supabase)

1. Authentication, Authorization & Role-Based Access (RLS)
Test Suite 1.1: Multi-Role Cloud Account Provisioning

    Goal: Verify that a user can register for each role via Supabase Auth and that their profile metadata is correctly written to public.profiles in your cloud database.

    Execution Steps:

        Generate 4 dynamic test accounts using unique timestamps (e.g., driver_1725620000@voltgrid.test).

        Perform user registration via the UI at / or directly via supabase.auth.signUp().

    Assertions:

        [ ] Query public.profiles using the Supabase client: Confirm rows exist with role set to 'driver', 'operator', 'fleet_manager', and 'admin'.

        [ ] Signing in as driver@... returns session access tokens valid for protected routes.

Test Suite 1.2: Row-Level Security (RLS) Enforcement

    Goal: Confirm that cloud Postgres RLS policies strictly isolate user data at the database layer.

    Execution Steps:

        Authenticate supabase-js client as Driver A.

        Attempt a raw SQL query/Supabase call to select records from public.reservations where driver_id = 'Driver_B_UUID'.

        Attempt to insert a row into public.notifications directly from the client.

    Assertions:

        [ ] Direct query for Driver B's reservations returns [] (0 records returned due to RLS USING (auth.uid() = driver_id) policy).

        [ ] Direct client insert to public.notifications fails/raises a permission error (verifying that notifications is read-only for clients and writable only via system triggers).

2. Core Driver & Booking Workflow (Cross-Role)
Test Suite 2.1: Cloud Geolocation & Haversine Distance

    Goal: Validate browser geolocation calculation with real station coordinates stored in cloud Postgres (20260821200000_station_coordinates.sql).

    Execution Steps:

        Mock browser Geolocation API coordinates to Pune, MH (Lat: 18.5204, Long: 73.8567).

        Load /driver/stations.

    Assertions:

        [ ] Station records are pulled from cloud Supabase public.stations.

        [ ] Distances are calculated dynamically in kilometers, sorted nearest-first.

Test Suite 2.2: Booking Creation, Trigger Broadcast & Operator Approval

This verifies the end-to-end cloud database trigger 20260821220000_booking_approval.sql.

[ Driver Booking on Web App ]
            │
            ▼
 [ Supabase DB: Insert into `public.reservations` (status = PENDING) ]
            │
            ▼
 [ PostgreSQL Trigger (`AFTER INSERT`) runs with SECURITY DEFINER ]
            │
            ▼
 [ Inserts Notification record targeted to `role = operator` ]
            │
            ▼
 [ Operator logs into `/operator/reservations` & approves ]
            │
            ▼
 [ Supabase DB: Status updates to `RESERVED` ]

    Execution Steps:

        Driver Action: Sign in as driver@voltgrid.test, navigate to /driver/stations, pick an available connector, and submit a reservation.

        DB Verification: Query cloud table public.reservations.

        Trigger Broadcast Check: Query cloud table public.notifications where role = 'operator'.

        Operator Action: Sign in as operator@voltgrid.test, navigate to /operator/reservations, and click Approve.

        Status Verification: Re-query public.reservations for that id.

    Assertions:

        [ ] Reservation status initially created as 'PENDING'.

        [ ] A row automatically appears in public.notifications created by the DB trigger, without client application code writing to it directly.

        [ ] After operator approval, status in cloud Postgres changes to 'RESERVED'.

3. Wallet Ledger & Financial Engine
Test Suite 3.1: Wallet Balance & Transaction Ledger

    Goal: Ensure top-ups and charging session deductions update public.wallets and public.transactions atomically.

    Execution Steps:

        Navigate to /driver/wallet as driver@voltgrid.test.

        Trigger a top-up of ₹500.

        Simulate session completion on /driver/active-session costing ₹150.

    Assertions:

        [ ] public.wallets.balance matches (Previous Balance + 500 - 150).

        [ ] Two ledger entries are recorded in public.transactions with type TOP_UP (+500) and CHARGING_DEDUCTION (-150).

4. Maintenance Queue & Fault Reporting
Test Suite 4.1: Driver Fault Report to Operator View

    Goal: Verify that a fault logged by a driver appears in the station operator's queue.

    Execution Steps:

        As driver@voltgrid.test, submit a fault report at /driver/report-fault.

        As operator@voltgrid.test, open /operator/fault-queue.

    Assertions:

        [ ] A new row exists in cloud table public.fault_reports with status 'OPEN'.

        [ ] The fault is visible on the operator workspace /operator/fault-queue.