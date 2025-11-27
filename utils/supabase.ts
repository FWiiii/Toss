import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://wranonbewlhabgmofnwn.supabase.co'
const supabaseKey = 'sb_publishable_MVGbBkRRTZ1abxHKsxwWoA_ylzpUFV5'
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
