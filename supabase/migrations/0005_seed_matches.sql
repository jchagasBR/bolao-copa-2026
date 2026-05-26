-- 0005_seed_matches.sql — 104 WC 2026 fixtures with UTC kickoffs.
--
-- Source: Wikipedia "2026 FIFA World Cup Group A".."Group L" plus
-- "2026 FIFA World Cup knockout stage". All kickoffs converted to UTC from the
-- venue's local June/July 2026 offset:
--   • EDT     UTC-4 (East Rutherford, Foxborough, Philadelphia, Miami Gardens, Atlanta, Toronto)
--   • CDT     UTC-5 (Houston, Arlington, Kansas City)
--   • PDT     UTC-7 (Inglewood, Santa Clara, Seattle, Vancouver)
--   • MX  (no DST since 2022) UTC-6 (Mexico City, Zapopan, Guadalupe)
--
-- The admin (any pool admin) can adjust kickoff_at via /admin/jogos/[matchId]
-- if FIFA postpones a fixture.
--
-- Knockout fixtures (73-104) have NULL home_team_id and away_team_id — the
-- admin fills them in once the group stage finishes / each round closes.
-- external_id is the FIFA match number (1..104).
--
-- Idempotent: ON CONFLICT (external_id) DO UPDATE.

-- ─── Group stage (72 matches) ───────────────────────────────────────────────
insert into public.match (external_id, stage, group_code, home_team_id, away_team_id, kickoff_at)
select
  v.ext_id,
  'group'::public.match_stage,
  v.group_code,
  (select id from public.team where iso_code = v.home),
  (select id from public.team where iso_code = v.away),
  v.kickoff
from (values
  -- Group A
  (1,  'A'::char(1), 'MEX', 'RSA', '2026-06-11 19:00:00+00'::timestamptz),
  (2,  'A'::char(1), 'KOR', 'CZE', '2026-06-12 02:00:00+00'::timestamptz),
  (3,  'A'::char(1), 'CZE', 'RSA', '2026-06-18 16:00:00+00'::timestamptz),
  (4,  'A'::char(1), 'MEX', 'KOR', '2026-06-19 01:00:00+00'::timestamptz),
  (5,  'A'::char(1), 'CZE', 'MEX', '2026-06-25 01:00:00+00'::timestamptz),
  (6,  'A'::char(1), 'RSA', 'KOR', '2026-06-25 01:00:00+00'::timestamptz),
  -- Group B
  (7,  'B'::char(1), 'CAN', 'BIH', '2026-06-12 19:00:00+00'::timestamptz),
  (8,  'B'::char(1), 'QAT', 'SUI', '2026-06-13 19:00:00+00'::timestamptz),
  (9,  'B'::char(1), 'SUI', 'BIH', '2026-06-18 19:00:00+00'::timestamptz),
  (10, 'B'::char(1), 'CAN', 'QAT', '2026-06-18 22:00:00+00'::timestamptz),
  (11, 'B'::char(1), 'SUI', 'CAN', '2026-06-24 19:00:00+00'::timestamptz),
  (12, 'B'::char(1), 'BIH', 'QAT', '2026-06-24 19:00:00+00'::timestamptz),
  -- Group C
  (13, 'C'::char(1), 'BRA', 'MAR', '2026-06-13 22:00:00+00'::timestamptz),
  (14, 'C'::char(1), 'HAI', 'SCO', '2026-06-14 01:00:00+00'::timestamptz),
  (15, 'C'::char(1), 'SCO', 'MAR', '2026-06-19 22:00:00+00'::timestamptz),
  (16, 'C'::char(1), 'BRA', 'HAI', '2026-06-20 00:30:00+00'::timestamptz),
  (17, 'C'::char(1), 'SCO', 'BRA', '2026-06-24 22:00:00+00'::timestamptz),
  (18, 'C'::char(1), 'MAR', 'HAI', '2026-06-24 22:00:00+00'::timestamptz),
  -- Group D
  (19, 'D'::char(1), 'USA', 'PAR', '2026-06-13 01:00:00+00'::timestamptz),
  (20, 'D'::char(1), 'AUS', 'TUR', '2026-06-14 04:00:00+00'::timestamptz),
  (21, 'D'::char(1), 'USA', 'AUS', '2026-06-19 19:00:00+00'::timestamptz),
  (22, 'D'::char(1), 'TUR', 'PAR', '2026-06-20 03:00:00+00'::timestamptz),
  (23, 'D'::char(1), 'TUR', 'USA', '2026-06-26 02:00:00+00'::timestamptz),
  (24, 'D'::char(1), 'PAR', 'AUS', '2026-06-26 02:00:00+00'::timestamptz),
  -- Group E
  (25, 'E'::char(1), 'GER', 'CUW', '2026-06-14 17:00:00+00'::timestamptz),
  (26, 'E'::char(1), 'CIV', 'ECU', '2026-06-14 23:00:00+00'::timestamptz),
  (27, 'E'::char(1), 'GER', 'CIV', '2026-06-20 20:00:00+00'::timestamptz),
  (28, 'E'::char(1), 'ECU', 'CUW', '2026-06-21 00:00:00+00'::timestamptz),
  (29, 'E'::char(1), 'CUW', 'CIV', '2026-06-25 20:00:00+00'::timestamptz),
  (30, 'E'::char(1), 'ECU', 'GER', '2026-06-25 20:00:00+00'::timestamptz),
  -- Group F
  (31, 'F'::char(1), 'NED', 'JPN', '2026-06-14 20:00:00+00'::timestamptz),
  (32, 'F'::char(1), 'SWE', 'TUN', '2026-06-15 02:00:00+00'::timestamptz),
  (33, 'F'::char(1), 'NED', 'SWE', '2026-06-20 17:00:00+00'::timestamptz),
  (34, 'F'::char(1), 'TUN', 'JPN', '2026-06-21 04:00:00+00'::timestamptz),
  (35, 'F'::char(1), 'JPN', 'SWE', '2026-06-25 23:00:00+00'::timestamptz),
  (36, 'F'::char(1), 'TUN', 'NED', '2026-06-25 23:00:00+00'::timestamptz),
  -- Group G
  (37, 'G'::char(1), 'BEL', 'EGY', '2026-06-15 19:00:00+00'::timestamptz),
  (38, 'G'::char(1), 'IRN', 'NZL', '2026-06-16 01:00:00+00'::timestamptz),
  (39, 'G'::char(1), 'BEL', 'IRN', '2026-06-21 19:00:00+00'::timestamptz),
  (40, 'G'::char(1), 'NZL', 'EGY', '2026-06-22 01:00:00+00'::timestamptz),
  (41, 'G'::char(1), 'EGY', 'IRN', '2026-06-27 03:00:00+00'::timestamptz),
  (42, 'G'::char(1), 'NZL', 'BEL', '2026-06-27 03:00:00+00'::timestamptz),
  -- Group H
  (43, 'H'::char(1), 'ESP', 'CPV', '2026-06-15 16:00:00+00'::timestamptz),
  (44, 'H'::char(1), 'KSA', 'URU', '2026-06-15 22:00:00+00'::timestamptz),
  (45, 'H'::char(1), 'ESP', 'KSA', '2026-06-21 16:00:00+00'::timestamptz),
  (46, 'H'::char(1), 'URU', 'CPV', '2026-06-21 22:00:00+00'::timestamptz),
  (47, 'H'::char(1), 'CPV', 'KSA', '2026-06-27 00:00:00+00'::timestamptz),
  (48, 'H'::char(1), 'URU', 'ESP', '2026-06-27 00:00:00+00'::timestamptz),
  -- Group I
  (49, 'I'::char(1), 'FRA', 'SEN', '2026-06-16 19:00:00+00'::timestamptz),
  (50, 'I'::char(1), 'IRQ', 'NOR', '2026-06-16 22:00:00+00'::timestamptz),
  (51, 'I'::char(1), 'FRA', 'IRQ', '2026-06-22 21:00:00+00'::timestamptz),
  (52, 'I'::char(1), 'NOR', 'SEN', '2026-06-23 00:00:00+00'::timestamptz),
  (53, 'I'::char(1), 'NOR', 'FRA', '2026-06-26 19:00:00+00'::timestamptz),
  (54, 'I'::char(1), 'SEN', 'IRQ', '2026-06-26 19:00:00+00'::timestamptz),
  -- Group J
  (55, 'J'::char(1), 'ARG', 'ALG', '2026-06-17 01:00:00+00'::timestamptz),
  (56, 'J'::char(1), 'AUT', 'JOR', '2026-06-17 04:00:00+00'::timestamptz),
  (57, 'J'::char(1), 'ARG', 'AUT', '2026-06-22 17:00:00+00'::timestamptz),
  (58, 'J'::char(1), 'JOR', 'ALG', '2026-06-23 03:00:00+00'::timestamptz),
  (59, 'J'::char(1), 'ALG', 'AUT', '2026-06-28 02:00:00+00'::timestamptz),
  (60, 'J'::char(1), 'JOR', 'ARG', '2026-06-28 02:00:00+00'::timestamptz),
  -- Group K
  (61, 'K'::char(1), 'POR', 'COD', '2026-06-17 17:00:00+00'::timestamptz),
  (62, 'K'::char(1), 'UZB', 'COL', '2026-06-18 02:00:00+00'::timestamptz),
  (63, 'K'::char(1), 'POR', 'UZB', '2026-06-23 17:00:00+00'::timestamptz),
  (64, 'K'::char(1), 'COL', 'COD', '2026-06-24 02:00:00+00'::timestamptz),
  (65, 'K'::char(1), 'COL', 'POR', '2026-06-27 23:30:00+00'::timestamptz),
  (66, 'K'::char(1), 'COD', 'UZB', '2026-06-27 23:30:00+00'::timestamptz),
  -- Group L
  (67, 'L'::char(1), 'ENG', 'CRO', '2026-06-17 20:00:00+00'::timestamptz),
  (68, 'L'::char(1), 'GHA', 'PAN', '2026-06-17 23:00:00+00'::timestamptz),
  (69, 'L'::char(1), 'ENG', 'GHA', '2026-06-23 20:00:00+00'::timestamptz),
  (70, 'L'::char(1), 'PAN', 'CRO', '2026-06-23 23:00:00+00'::timestamptz),
  (71, 'L'::char(1), 'PAN', 'ENG', '2026-06-27 21:00:00+00'::timestamptz),
  (72, 'L'::char(1), 'CRO', 'GHA', '2026-06-27 21:00:00+00'::timestamptz)
) v(ext_id, group_code, home, away, kickoff)
on conflict (external_id) do update
  set stage        = excluded.stage,
      group_code   = excluded.group_code,
      home_team_id = excluded.home_team_id,
      away_team_id = excluded.away_team_id,
      kickoff_at   = excluded.kickoff_at;

-- ─── Knockout stage (32 matches, teams assigned later by admin) ─────────────
insert into public.match (external_id, stage, kickoff_at)
values
  -- Round of 32 (16 matches)
  (73, 'r32',   '2026-06-28 19:00:00+00'),
  (74, 'r32',   '2026-06-29 20:30:00+00'),
  (75, 'r32',   '2026-06-30 01:00:00+00'),
  (76, 'r32',   '2026-06-29 17:00:00+00'),
  (77, 'r32',   '2026-06-30 21:00:00+00'),
  (78, 'r32',   '2026-06-30 17:00:00+00'),
  (79, 'r32',   '2026-07-01 01:00:00+00'),
  (80, 'r32',   '2026-07-01 16:00:00+00'),
  (81, 'r32',   '2026-07-02 00:00:00+00'),
  (82, 'r32',   '2026-07-01 20:00:00+00'),
  (83, 'r32',   '2026-07-02 23:00:00+00'),
  (84, 'r32',   '2026-07-02 19:00:00+00'),
  (85, 'r32',   '2026-07-03 03:00:00+00'),
  (86, 'r32',   '2026-07-03 22:00:00+00'),
  (87, 'r32',   '2026-07-04 01:30:00+00'),
  (88, 'r32',   '2026-07-03 18:00:00+00'),
  -- Round of 16 (8 matches)
  (89, 'r16',   '2026-07-04 21:00:00+00'),
  (90, 'r16',   '2026-07-04 17:00:00+00'),
  (91, 'r16',   '2026-07-05 20:00:00+00'),
  (92, 'r16',   '2026-07-06 00:00:00+00'),
  (93, 'r16',   '2026-07-06 19:00:00+00'),
  (94, 'r16',   '2026-07-07 00:00:00+00'),
  (95, 'r16',   '2026-07-07 16:00:00+00'),
  (96, 'r16',   '2026-07-07 20:00:00+00'),
  -- Quarter-finals (4 matches)
  (97,  'qf',   '2026-07-09 20:00:00+00'),
  (98,  'qf',   '2026-07-10 19:00:00+00'),
  (99,  'qf',   '2026-07-11 21:00:00+00'),
  (100, 'qf',   '2026-07-12 01:00:00+00'),
  -- Semi-finals (2 matches)
  (101, 'sf',   '2026-07-14 19:00:00+00'),
  (102, 'sf',   '2026-07-15 19:00:00+00'),
  -- Third-place playoff
  (103, 'third','2026-07-18 21:00:00+00'),
  -- Final
  (104, 'final','2026-07-19 19:00:00+00')
on conflict (external_id) do update
  set stage      = excluded.stage,
      kickoff_at = excluded.kickoff_at;
