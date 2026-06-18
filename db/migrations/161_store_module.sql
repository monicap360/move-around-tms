-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 161: MoveAround Merch Store module
-- Tables: store_products, store_settings
-- ─────────────────────────────────────────────────────────────────────────────

-- ── store_products ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_products (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL,
  title                text NOT NULL,
  category             text NOT NULL DEFAULT 'Hoodie / Company Merch',
  description          text,
  price                numeric(10,2),
  compare_at_price     numeric(10,2),
  sizes                text[] DEFAULT '{}',
  colors               text[] DEFAULT '{}',
  sku                  text,
  image_url            text,
  image_alt            text,
  shopify_product_url  text,
  shopify_product_id   text,
  buy_button_embed     text,
  is_active            boolean NOT NULL DEFAULT true,
  inventory_status     text NOT NULL DEFAULT 'in_stock',
  inventory_count      integer,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── store_settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL UNIQUE,
  store_name          text DEFAULT 'MoveAround Merch Store',
  store_enabled       boolean NOT NULL DEFAULT true,
  shopify_store_url   text,
  shopify_embed_code  text,
  embed_mode          text NOT NULL DEFAULT 'link',
  shopify_shop_domain text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_products_org
  ON public.store_products (organization_id);

CREATE INDEX IF NOT EXISTS idx_store_products_org_active
  ON public.store_products (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_products_sort
  ON public.store_products (organization_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_store_settings_org
  ON public.store_settings (organization_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_store()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_products_updated_at ON public.store_products;
CREATE TRIGGER trg_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_store();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_store();

-- ── Seed: MoveAround Hoodie ───────────────────────────────────────────────────
INSERT INTO public.store_products (
  organization_id,
  title,
  category,
  description,
  price,
  sizes,
  colors,
  sku,
  image_url,
  is_active,
  inventory_status,
  sort_order
)
SELECT
  o.id,
  'MoveAround TMS "Seen Many Come and Go" Hoodie',
  'Hoodie / Company Merch',
  'Premium heavyweight hoodie featuring the MoveAround TMS "Seen Many Come and Go" graphic. Built for the office and the road. Representing Igotta Technologies.',
  65.00,
  ARRAY['S','M','L','XL','2XL','3XL'],
  ARRAY['Black','Navy'],
  'MAT-HOODIE-001',
  '/merch/movearound-hoodie.jpg',
  true,
  'in_stock',
  0
FROM public.organizations o
LIMIT 1
ON CONFLICT DO NOTHING;
