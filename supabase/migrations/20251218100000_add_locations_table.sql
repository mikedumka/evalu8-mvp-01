-- Enable moddatetime extension
create extension if not exists moddatetime schema extensions;

-- Create locations table
create table public.locations (
    id uuid not null default gen_random_uuid(),
    association_id uuid not null references public.associations(id) on delete cascade,
    name text not null,
    city text not null,
    address text not null,
    postal_code text not null,
    google_maps_link text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id)
);

-- Enable RLS
alter table public.locations enable row level security;

-- Create policies
create policy "Users can view locations for their association"
    on public.locations for select
    using (
        exists (
            select 1 from public.association_users au
            where au.association_id = locations.association_id
            and au.user_id = auth.uid()
        )
    );

create policy "Admins can insert locations for their association"
    on public.locations for insert
    with check (
        exists (
            select 1 from public.association_users au
            where au.association_id = locations.association_id
            and au.user_id = auth.uid()
            and (au.roles @> '{"admin"}' or au.roles @> '{"owner"}')
        )
    );

create policy "Admins can update locations for their association"
    on public.locations for update
    using (
        exists (
            select 1 from public.association_users au
            where au.association_id = locations.association_id
            and au.user_id = auth.uid()
            and (au.roles @> '{"admin"}' or au.roles @> '{"owner"}')
        )
    );

create policy "Admins can delete locations for their association"
    on public.locations for delete
    using (
        exists (
            select 1 from public.association_users au
            where au.association_id = locations.association_id
            and au.user_id = auth.uid()
            and (au.roles @> '{"admin"}' or au.roles @> '{"owner"}')
        )
    );

-- Create trigger for updated_at
create trigger handle_updated_at before update on public.locations
    for each row execute procedure extensions.moddatetime (updated_at);
