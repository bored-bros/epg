create extension if not exists wrappers with schema extensions;

create foreign data wrapper epg_bucket
  handler s3_fdw_handler
  validator s3_fdw_validator;

create server epg_bucket
  foreign data wrapper epg_bucket
  options (
    vault_access_key_id '642227ea-9f00-4146-9c68-447ef642b20b',
    vault_secret_access_key '642227ea-9f00-4146-9c68-447ef642b20b',
    aws_region 'eu-west-3',
    endpoint_url 'https://oboyvbpfsemflqoiqpnr.supabase.co/storage/v1/s3',
    path_style_url 'true'
  );