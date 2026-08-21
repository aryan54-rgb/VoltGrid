-- Supabase Schema for VoltGrid
-- Note: Enable Automatic RLS is assumed to be checked.

-- 1. Custom Enums
CREATE TYPE user_role AS ENUM ('driver', 'fleet', 'operator', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE station_status AS ENUM ('online', 'offline', 'in-use', 'maintenance');
CREATE TYPE connector_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'FAULTED');
CREATE TYPE reservation_status AS ENUM ('RESERVED', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled', 'failed');

-- 2. Profiles Table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'driver',
  status user_status NOT NULL DEFAULT 'active',
  sessions INT DEFAULT 0,
  joined TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  spend DECIMAL DEFAULT 0,
  company TEXT,
  vehicle TEXT,
  plan TEXT,
  points INT DEFAULT 0
);

-- 3. Stations Table
CREATE TABLE stations (
  id TEXT PRIMARY KEY, -- 'st-01'
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  distance DECIMAL,
  rating DECIMAL,
  reviews INT DEFAULT 0,
  price_per_kwh DECIMAL NOT NULL,
  status station_status DEFAULT 'online',
  x INT,
  y INT,
  amenities TEXT[],
  hours TEXT,
  operator TEXT,
  utilization INT DEFAULT 0
);

-- 4. Connectors Table
CREATE TABLE connectors (
  id TEXT PRIMARY KEY, -- 'st-01-c11'
  station_id TEXT REFERENCES stations(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  power_kw INT NOT NULL,
  status connector_status DEFAULT 'AVAILABLE',
  energy_today_kwh DECIMAL DEFAULT 0,
  uptime_pct DECIMAL DEFAULT 100,
  last_serviced DATE
);

-- 5. Sessions (Charging History & Active)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id TEXT REFERENCES stations(id),
  connector_id TEXT REFERENCES connectors(id),
  status session_status DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  duration INTERVAL,
  energy_kwh DECIMAL DEFAULT 0,
  cost DECIMAL DEFAULT 0,
  start_soc INT,
  target_soc INT
);

-- 6. Reservations
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  station_id TEXT REFERENCES stations(id) NOT NULL,
  connector_id TEXT REFERENCES connectors(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status reservation_status DEFAULT 'RESERVED'
);

-- 7. Waitlist
CREATE TABLE waitlists (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  station_id TEXT REFERENCES stations(id) NOT NULL,
  date DATE NOT NULL,
  time_window TEXT NOT NULL,
  position INT NOT NULL,
  ahead_of INT DEFAULT 0,
  notify_on_free BOOLEAN DEFAULT true
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Examples to get started)

-- Profiles: Users can read their own profile. Admins can read all.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Stations: Anyone can view stations.
CREATE POLICY "Anyone can view stations" ON stations FOR SELECT USING (true);

-- Connectors: Anyone can view connectors.
CREATE POLICY "Anyone can view connectors" ON connectors FOR SELECT USING (true);

-- Sessions: Users can view their own sessions.
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);

-- Reservations: Users can view and manage their own reservations.
CREATE POLICY "Users can view own reservations" ON reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reservations" ON reservations FOR UPDATE USING (auth.uid() = user_id);

-- Waitlists: Users can view and manage their own waitlists.
CREATE POLICY "Users can view own waitlist" ON waitlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own waitlist" ON waitlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own waitlist" ON waitlists FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), new.email, 'driver');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on sign-up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
