import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://192.168.5.67:8000'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MTg5OTQ2LCJleHAiOjE5MzE4Njk5NDZ9.58u_Kz8cEhg7mJXTNca4z1VVQuGzhGgGhAEZkDZd_RQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)