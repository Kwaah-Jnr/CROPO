-- Cropo: reference data required in every environment (not sample data).
-- Admins can rename, reorder or deactivate categories later.

insert into public.crop_categories (name, slug, sort_order) values
  ('Vegetables',       'vegetables',       10),
  ('Fruits',           'fruits',           20),
  ('Roots & Tubers',   'roots-tubers',     30),
  ('Plantain & Banana','plantain-banana',  40),
  ('Grains & Cereals', 'grains-cereals',   50),
  ('Legumes & Nuts',   'legumes-nuts',     60),
  ('Spices & Herbs',   'spices-herbs',     70)
on conflict (slug) do nothing;
