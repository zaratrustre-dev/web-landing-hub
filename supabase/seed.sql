-- Catálogo inicial de skills (basado en categorías de Upwork, PDR §10).
-- Ampliable desde el panel admin (Fase 2) sin necesidad de migración.
insert into public.skills (name) values
  ('JavaScript'), ('TypeScript'), ('Python'), ('React'), ('Node.js'),
  ('Java'), ('PHP'), ('Ruby on Rails'), ('Swift'), ('Kotlin'),
  ('UI Design'), ('UX Research'), ('Figma'), ('Adobe Photoshop'), ('Adobe Illustrator'),
  ('Branding'), ('Product Management'), ('Project Management'), ('Agile / Scrum'),
  ('Business Development'), ('Sales'), ('Fundraising'), ('Pitch Decks'), ('Startup Strategy'),
  ('Digital Marketing'), ('SEO'), ('SEM'), ('Social Media Marketing'), ('Content Marketing'),
  ('Copywriting'), ('Email Marketing'), ('Growth Marketing'),
  ('Business Consulting'), ('Financial Modeling'), ('Legal Consulting'), ('Tax Advisory'),
  ('Venture Capital'), ('Private Equity'), ('Investment Analysis'), ('Lending'),
  ('Supply Chain Management'), ('Logistics Planning'), ('Procurement'), ('Industrial Automation'),
  ('Talent Acquisition'), ('Technical Recruiting'), ('HR Consulting'),
  ('Public Relations'), ('Influencer Marketing'), ('Video Production'), ('Photography'),
  ('Data Analysis'), ('Machine Learning'), ('Artificial Intelligence'), ('Cloud Architecture'),
  ('DevOps'), ('Cybersecurity'), ('Blockchain'), ('E-commerce')
on conflict (name) do nothing;
