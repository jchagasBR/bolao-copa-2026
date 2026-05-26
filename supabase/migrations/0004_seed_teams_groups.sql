-- 0004_seed_teams_groups.sql — 48 teams and their group assignments.
--
-- Source: Wikipedia "2026 FIFA World Cup Group A".."Group L" articles, as of
-- the official FIFA draw on 2025-12-05 in Washington, D.C.
--
-- iso_code uses the FIFA 3-letter code (differs from ISO 3166-1 alpha-3 for a
-- handful of teams: GER/DEU, NED/NLD, SUI/CHE, KSA/SAU, ALG/DZA, RSA/ZAF, HAI/HTI).
--
-- Idempotent: ON CONFLICT (iso_code) keeps the existing row's id intact so any
-- match seed that already references a team UUID stays valid.

insert into public.team (name, iso_code, group_code) values
  -- Group A
  ('México',                 'MEX', 'A'),
  ('África do Sul',          'RSA', 'A'),
  ('Coreia do Sul',          'KOR', 'A'),
  ('República Tcheca',       'CZE', 'A'),
  -- Group B
  ('Canadá',                 'CAN', 'B'),
  ('Bósnia e Herzegovina',   'BIH', 'B'),
  ('Catar',                  'QAT', 'B'),
  ('Suíça',                  'SUI', 'B'),
  -- Group C
  ('Brasil',                 'BRA', 'C'),
  ('Marrocos',               'MAR', 'C'),
  ('Haiti',                  'HAI', 'C'),
  ('Escócia',                'SCO', 'C'),
  -- Group D
  ('Estados Unidos',         'USA', 'D'),
  ('Paraguai',               'PAR', 'D'),
  ('Austrália',              'AUS', 'D'),
  ('Turquia',                'TUR', 'D'),
  -- Group E
  ('Alemanha',               'GER', 'E'),
  ('Curaçao',                'CUW', 'E'),
  ('Costa do Marfim',        'CIV', 'E'),
  ('Equador',                'ECU', 'E'),
  -- Group F
  ('Holanda',                'NED', 'F'),
  ('Japão',                  'JPN', 'F'),
  ('Suécia',                 'SWE', 'F'),
  ('Tunísia',                'TUN', 'F'),
  -- Group G
  ('Bélgica',                'BEL', 'G'),
  ('Egito',                  'EGY', 'G'),
  ('Irã',                    'IRN', 'G'),
  ('Nova Zelândia',          'NZL', 'G'),
  -- Group H
  ('Espanha',                'ESP', 'H'),
  ('Cabo Verde',             'CPV', 'H'),
  ('Arábia Saudita',         'KSA', 'H'),
  ('Uruguai',                'URU', 'H'),
  -- Group I
  ('França',                 'FRA', 'I'),
  ('Senegal',                'SEN', 'I'),
  ('Iraque',                 'IRQ', 'I'),
  ('Noruega',                'NOR', 'I'),
  -- Group J
  ('Argentina',              'ARG', 'J'),
  ('Argélia',                'ALG', 'J'),
  ('Áustria',                'AUT', 'J'),
  ('Jordânia',               'JOR', 'J'),
  -- Group K
  ('Portugal',               'POR', 'K'),
  ('RD Congo',               'COD', 'K'),
  ('Uzbequistão',            'UZB', 'K'),
  ('Colômbia',               'COL', 'K'),
  -- Group L
  ('Inglaterra',             'ENG', 'L'),
  ('Croácia',                'CRO', 'L'),
  ('Gana',                   'GHA', 'L'),
  ('Panamá',                 'PAN', 'L')
on conflict (iso_code) do update
  set name       = excluded.name,
      group_code = excluded.group_code;
