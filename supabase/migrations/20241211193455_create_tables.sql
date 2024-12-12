create table programs (
  start timestamptz,
  stop timestamptz,
  channel text,
  date date,
  site text,
  title text,
  lang text,
  description text,
  category text,
  primary key (channel, date, lang)
);

create or replace function insert_programs()
returns trigger as $$
declare
  table_name text;
  file_uri text;
begin
  -- Only process files in epg-data bucket that match our pattern
  if NEW.bucket_id = 'epg-data' and NEW.name ~ 'programs\.jsonl$' then

    -- Construct S3 URI from storage object path
    file_uri := 's3://' || NEW.bucket_id || '/' || NEW.name;
    
    -- Generate unique table name from file path
    table_name := regexp_replace(NEW.name, '[^a-zA-Z0-9]', '_', 'g');

    -- Create temporary foreign table pointing to the S3 file
    execute format('
      create foreign table %I (
        start timestamptz,
        stop timestamptz,
        channel text,
        date date,
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
      insert into programs 
      select * from %I', table_name);

    -- Clean up temporary table
    execute format('drop foreign table %I', table_name);

  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger on storage.objects table
create trigger insert_programs_trigger
  after insert on storage.objects
  for each row
  execute function insert_programs();
