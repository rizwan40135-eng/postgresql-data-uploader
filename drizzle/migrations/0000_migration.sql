CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  city text,
  plan text NOT NULL DEFAULT 'Basic',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (char_length(name) BETWEEN 1 AND 100 AND char_length(email) BETWEEN 3 AND 255);
CREATE POLICY "Public delete" ON public.customers FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.customers (name, email, city, plan, metadata) VALUES
('Aarav Sharma','aarav@example.com','Mumbai','Pro','{"source":"web","tags":["vip"]}'),
('Priya Patel','priya@example.com','Ahmedabad','Basic','{"source":"referral"}'),
('Rohan Mehta','rohan@example.com','Pune','Enterprise','{"seats":25}'),
('Ananya Iyer','ananya@example.com','Chennai','Pro','{"source":"ads"}'),
('Vikram Singh','vikram@example.com','Delhi','Basic','{}'),
('Sneha Reddy','sneha@example.com','Hyderabad','Pro','{"tags":["beta"]}'),
('Karan Gupta','karan@example.com','Bengaluru','Enterprise','{"seats":120}'),
('Fatima Khan','fatima@example.com','Lucknow','Basic','{"source":"web"}'),
('Arjun Nair','arjun@example.com','Kochi','Pro','{}'),
('Meera Joshi','meera@example.com','Jaipur','Basic','{"source":"event"}');