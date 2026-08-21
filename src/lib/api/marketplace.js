import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/** Marketplace catalogue. Public — no session needed to browse. */

export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    per: row.per,
    rating: Number(row.rating),
    reviews: row.reviews,
    badge: row.badge,
    seller: row.seller,
    stock: row.stock,
    gradient: row.gradient,
    description: row.description,
    listingStatus: row.listing_status,
    submitted: row.submitted_on,
    listed: row.listed,
    featured: row.featured,
  }
}

/**
 * The catalogue.
 *
 * `status` defaults to the approved listings, which is what shoppers should
 * see; the admin review queue asks for `'pending'` instead.
 */
export async function fetchProducts({ status = 'live' } = {}) {
  let query = supabase.from('products').select('*').order('id')
  if (status) query = query.eq('listing_status', status)
  const rows = await query.then(unwrap)
  return rows.map(mapProduct)
}

/** Approve or turn down a seller submission. */
export async function setListingStatus(id, listingStatus) {
  const row = await supabase
    .from('products')
    .update({ listing_status: listingStatus })
    .eq('id', id)
    .select('*')
    .single()
    .then(unwrap)
  return mapProduct(row)
}

/** Curation toggles: pull a live product from sale, or promote it. */
export async function setProductFlags(id, { listed, featured }) {
  const row = await supabase
    .from('products')
    .update({
      ...(listed === undefined ? {} : { listed }),
      ...(featured === undefined ? {} : { featured }),
    })
    .eq('id', id)
    .select('*')
    .single()
    .then(unwrap)
  return mapProduct(row)
}

/** Category filter list, with the synthetic "All" entry the UI leads with. */
export async function fetchCategories() {
  const rows = await supabase.from('product_categories').select('name').order('sort_order').then(unwrap)
  return ['All', ...rows.map((r) => r.name)]
}
