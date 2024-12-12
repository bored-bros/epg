create foreign table sites (
  channel text,
  site text,
  site_id text,
  site_name text,
  lang text
)
  server epg_bucket
  options (
    uri 's3://epg-data/guides.jsonl',
    format 'jsonl'
  );

create foreign table programs (
  start timestamptz,
  stop timestamptz,
  channel text,
  date date,
  keywords text[],
  languages text[],
  origLanguages text[],
  length text[],
  urls text[],
  countries text[],
  site text,
  episodeNumbers text[],
  video jsonb,
  audio jsonb,
  previouslyShown text[],
  premiere text[],
  lastChance text[],
  subtitles text[],
  ratings text[],
  starRatings text[],
  reviews text[],
  directors text[],
  actors text[],
  writers text[],
  adapters text[],
  producers text[],
  composers text[],
  editors text[],
  presenters text[],
  commentators text[],
  guests text[],
  images text[],
  icons text[],
  title text,
  epgLang text,
  description text,
  category text
)
  server epg_bucket
  ;