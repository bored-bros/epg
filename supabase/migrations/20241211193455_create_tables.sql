create table programs (
  site text,
  channel text,
  start timestamptz,
  stop timestamptz,
  date date,
  lang text,
  title text,
  description text,
  category text,
  primary key (channel, start, lang)
);

create index programs_date_idx on programs(date);

create or replace function insert_programs()
returns trigger security definer as $$
declare
  table_name text;
  file_uri text;
begin
  -- Construct S3 URI from storage object path
  file_uri := 's3://' || NEW.bucket_id || '/' || NEW.name;

  -- Generate unique table name from file path
  table_name := regexp_replace(NEW.name, '[^a-zA-Z0-9]', '_', 'g');

  -- Create temporary foreign table pointing to the S3 file
  execute format('
    create foreign table %I (
      start text,
      stop text,
      date text,
      channel text,
      site text,
      title text,
      lang text,
      description text,
      category text
    )
    server epg_bucket
    options (
      uri %L,
      format ''jsonl''
    )', table_name, file_uri);

  -- Copy data from temporary table to programs table
  execute format('
    insert into public.programs (
      start, 
      stop, 
      date, 
      channel, 
      site, 
      title, 
      lang, 
      description, 
      category
    )
    select 
      cast(start as timestamptz) as start, 
      cast(stop as timestamptz) as stop, 
      cast(date as date) as date, 
      channel, 
      site, 
      title, 
      lang, 
      description, 
      category 
    from %I 
    on conflict (channel, start, lang) do update 
    set date = excluded.date,
      start = excluded.start,
      stop = excluded.stop,
      site = excluded.site,
      title = excluded.title,
      description = excluded.description,
      category = excluded.category', table_name);

  -- Clean up temporary table
  execute format('drop foreign table %I', table_name);

  return NEW;
end;
$$ language plpgsql;

-- Create trigger on storage.objects table
create or replace trigger insert_programs_trigger
  after insert or update on storage.objects
  for each row
  when (NEW.bucket_id = 'epg-data' and NEW.name ~ 'programs\.jsonl$' and NEW.metadata is not null)
  execute function public.insert_programs();
