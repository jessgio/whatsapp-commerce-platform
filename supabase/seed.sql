-- Seed for scale testing: 15,000 customers, their addresses, a product catalog,
-- and ~30k orders with items + conversations/messages.
-- Run after migrations:  psql "$DATABASE_URL" -f supabase/seed.sql

-- ---------- Products ----------
insert into products (sku, name, category, image_color, retail_price, discount_percent, stock, reorder_point, units_30d, units_prev_30d)
select
  'MC-' || (1000 + g),
  (array['Merlot Silk Scarf','Charm Leather Tote','Cream Linen Shirt','Taupe Wool Cardigan','Beige Canvas Sneakers','Brown Suede Loafers','Velvet Hair Claw','Merlot Lip Tint'])[1 + (g % 8)] || ' ' || g,
  (array['Accessories','Bags','Apparel','Footwear','Beauty','Home','Jewelry'])[1 + (g % 7)],
  (array['#6f2c3f','#b49e8e','#5f5448','#d8c9b5','#8a3a4f'])[1 + (g % 5)],
  (50000 + (g % 20) * 25000),
  (array[0,0,10,15,0])[1 + (g % 5)],
  (g % 400),
  40,
  20 + (g % 200),
  20 + (g % 150)
from generate_series(1, 60) g
on conflict (sku) do nothing;

-- ---------- Customers (15,000) ----------
insert into customers (wa_id, name, phone, city, consent_status, consent_channel, segments, lifetime_value, order_count, first_seen_at, last_order_at)
select
  '628' || lpad(g::text, 10, '0'),
  (array['Adinda','Bayu','Citra','Dimas','Eka','Fitri','Gilang','Hana','Indra','Joya'])[1 + (g % 10)]
    || ' ' ||
  (array['Santoso','Wijaya','Halim','Saputra','Hidayat','Permata','Kusuma','Salim'])[1 + (g % 8)],
  '+628' || lpad(g::text, 10, '0'),
  (array['Jakarta Selatan','Bandung','Surabaya','Medan','Semarang','Tangerang','Bekasi','Yogyakarta'])[1 + (g % 8)],
  (array['opted_in','opted_in','opted_in','pending','opted_out'])[1 + (g % 5)]::consent_status,
  (array['click_to_chat','web_form','ad','import'])[1 + (g % 4)],
  case when g % 7 = 0 then array['VIP','Repeat'] when g % 3 = 0 then array['Repeat'] else array['New'] end,
  (g % 9) * 180000,
  (g % 9),
  now() - ((g % 60) || ' days')::interval,
  case when g % 9 > 0 then now() - ((g % 40) || ' days')::interval else null end
from generate_series(1, 15000) g
on conflict (wa_id) do nothing;

-- ---------- Default address per customer ----------
insert into addresses (customer_id, label, recipient_name, recipient_phone, line1, district, city, province, postal_code, is_default)
select
  c.id, 'Rumah', c.name, c.phone,
  'Jl. Merlot No. ' || (1 + (random()*200)::int),
  'Kec. ' || (array['Kebayoran','Cilandak','Menteng','Coblong','Gubeng'])[1 + (floor(random()*5))::int],
  c.city,
  (array['DKI Jakarta','Jawa Barat','Jawa Timur','Sumatera Utara','Jawa Tengah'])[1 + (floor(random()*5))::int],
  lpad((10000 + (random()*89999)::int)::text, 5, '0'),
  true
from customers c
on conflict do nothing;

-- ---------- Conversations (one per customer that has chatted: ~5,000) ----------
insert into conversations (customer_id, status, last_message_preview, last_message_at, last_inbound_at, first_response_seconds, topic)
select
  c.id,
  (array['open','pending','resolved'])[1 + (row_number() over () % 3)]::conversation_status,
  'Halo kak, mau tanya produk',
  now() - ((random()*48) || ' hours')::interval,
  now() - ((random()*48) || ' hours')::interval,
  60 + (random()*500)::int,
  (array['Product question','Promo inquiry','Order status','Return request'])[1 + (floor(random()*4))::int]
from customers c
where (c.wa_id::bigint % 3) = 0
on conflict (customer_id) do nothing;

-- ---------- Orders (~for buyers) ----------
insert into orders (code, customer_id, status, payment_status, channel, subtotal, shipping_cost, total, created_at)
select
  'WA-' || (100000 + row_number() over ()),
  c.id,
  (array['paid','delivered','shipped','packed','new'])[1 + (floor(random()*5))::int]::order_status,
  'paid'::payment_status,
  'whatsapp_cart',
  s.amt, 18000, s.amt + 18000,
  now() - ((random()*45) || ' days')::interval
from customers c
cross join lateral (select (100000 + (random()*900000)::int) as amt) s
where c.order_count > 0
on conflict (code) do nothing;

refresh materialized view daily_sales;
