import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Charger tous les clients d'une boutique
export async function loadShopClients(shopId) {
  const { data, error } = await supabase
    .from('shop-points')
    .select('*, profiles(name, email)')
    .eq('shop_id', shopId)
    .order('points', { ascending: false })
  if (error) { console.error(error); return []; }
  return data;
}

// Charger les transactions d'une boutique
export async function loadShopTransactions(shopId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles(name, email)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) { console.error(error); return []; }
  return data;
}

// Ajouter des points à un client
export async function addPointsToClient(userId, shopId, points, amount, totalSpent, totalVisits, ticketNumber) {
  const { data: existing } = await supabase
    .from('shop-points')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .single()

  if (existing) {
    await supabase
      .from('shop-points')
      .update({
        points: existing.points + points,
        total_spent: totalSpent,
        total_visits: totalVisits
      })
      .eq('user_id', userId)
      .eq('shop_id', shopId)
  } else {
    await supabase
      .from('shop-points')
      .insert({ user_id: userId, shop_id: shopId, points, total_spent: amount, total_visits: 1 })
  }

  await supabase
    .from('transactions')
    .insert({ user_id: userId, shop_id: shopId, amount, points_earned: points, ticket_number: ticketNumber })
}

// Chercher un client par QR code
export async function findClientByQR(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { console.error(error); return null; }

  const { data: points } = await supabase
    .from('shop-points')
    .select('*')
    .eq('user_id', userId)

  return { ...data, shopPoints: points || [] }
}

// Stats d'une boutique
export async function loadShopStats(shopId) {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, points_earned, created_at')
    .eq('shop_id', shopId)

  const { data: clients } = await supabase
    .from('shop-points')
    .select('user_id')
    .eq('shop_id', shopId)

  const totalRevenue = transactions?.reduce((a, t) => a + t.amount, 0) || 0
  const totalPoints = transactions?.reduce((a, t) => a + t.points_earned, 0) || 0

  return {
    totalClients: clients?.length || 0,
    totalTransactions: transactions?.length || 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalPoints
  }
}

// Sauvegarder les paramètres d'une boutique
export async function saveShopSettings(shopId, settings) {
  const { error } = await supabase
    .from('shops')
    .update(settings)
    .eq('id', shopId)
  if (error) { console.error(error); return false; }
  return true;
}

// Sauvegarder les récompenses
export async function saveShopRewards(shopId, rewards) {
  const { error } = await supabase
    .from('shops')
    .update({ rewards })
    .eq('id', shopId)
  if (error) { console.error(error); return false; }
  return true;
}