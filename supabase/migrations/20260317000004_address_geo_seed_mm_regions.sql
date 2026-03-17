-- Seed Myanmar regions/states and townships(cities)
-- Region => states table
-- Township => cities table

WITH mm AS (
  SELECT id FROM countries WHERE code = 'MM' LIMIT 1
)
INSERT INTO states (country_id, code, name, is_active)
SELECT mm.id, 'MM-YGN', 'Yangon Region', true
FROM mm
WHERE NOT EXISTS (
  SELECT 1 FROM states s WHERE s.country_id = mm.id AND s.name = 'Yangon Region'
);

WITH mm AS (
  SELECT id FROM countries WHERE code = 'MM' LIMIT 1
)
INSERT INTO states (country_id, code, name, is_active)
SELECT mm.id, 'MM-MDY', 'Mandalay Region', true
FROM mm
WHERE NOT EXISTS (
  SELECT 1 FROM states s WHERE s.country_id = mm.id AND s.name = 'Mandalay Region'
);

WITH ygn AS (
  SELECT s.id, s.country_id
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE c.code = 'MM' AND s.name = 'Yangon Region'
  LIMIT 1
),
townships(name) AS (
  VALUES
    ('Ahlone'),
    ('Bahan'),
    ('Botahtaung'),
    ('Cocokyun'),
    ('Dagon'),
    ('Dagon Myothit (East)'),
    ('Dagon Myothit (North)'),
    ('Dagon Myothit (Seikkan)'),
    ('Dagon Myothit (South)'),
    ('Dala'),
    ('Dawbon'),
    ('Hlaing'),
    ('Hlaingthaya'),
    ('Hlegu'),
    ('Hmawbi'),
    ('Htantabin'),
    ('Insein'),
    ('Kamayut'),
    ('Kawhmu'),
    ('Khayan'),
    ('Kungyangon'),
    ('Kyauktan'),
    ('Kyauktada'),
    ('Kyeemyindaing'),
    ('Lanmadaw'),
    ('Latha'),
    ('Mayangon'),
    ('Mingala Taungnyunt'),
    ('Mingaladon'),
    ('North Okkalapa'),
    ('Pabedan'),
    ('Pazundaung'),
    ('Sanchaung'),
    ('Seikkan'),
    ('Seikkyi Kanaungto'),
    ('Shwepyitha'),
    ('South Okkalapa'),
    ('Taikkyi'),
    ('Tamwe'),
    ('Thanlyin'),
    ('Thingangyun'),
    ('Thongwa'),
    ('Twante'),
    ('Yankin')
)
INSERT INTO cities (country_id, state_id, name, is_active)
SELECT ygn.country_id, ygn.id, t.name, true
FROM ygn
CROSS JOIN townships t
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.state_id = ygn.id AND c.name = t.name
);

WITH mdy AS (
  SELECT s.id, s.country_id
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE c.code = 'MM' AND s.name = 'Mandalay Region'
  LIMIT 1
),
townships(name) AS (
  VALUES
    ('Aungmyaythazan'),
    ('Amarapura'),
    ('Chanayethazan'),
    ('Chanmyathazi'),
    ('Kyaukpadaung'),
    ('Kyaukse'),
    ('Madaya'),
    ('Mahaaungmye'),
    ('Mahlaing'),
    ('Meiktila'),
    ('Mogok'),
    ('Myingyan'),
    ('Myittha'),
    ('Natogyi'),
    ('Ngazun'),
    ('Nyaung-U'),
    ('Patheingyi'),
    ('Pyawbwe'),
    ('Pyigyidagun'),
    ('Pyin Oo Lwin'),
    ('Singu'),
    ('Sintgaing'),
    ('Tada-U'),
    ('Taungtha'),
    ('Thabeikkyin'),
    ('Thazi'),
    ('Wundwin'),
    ('Yamethin')
)
INSERT INTO cities (country_id, state_id, name, is_active)
SELECT mdy.country_id, mdy.id, t.name, true
FROM mdy
CROSS JOIN townships t
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.state_id = mdy.id AND c.name = t.name
);
