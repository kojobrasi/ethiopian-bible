import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SearchHistoryItem = {
  id: string;
  query: string;
  result_count: number;
  created_at: string;
};

export type QuizScore = {
  id: string;
  category: string;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  devotional_index?: number | null;
  devotional_month?: string | null;
  devotional_day?: number | null;
  devotional_slot?: string | null;
  read: boolean;
  created_at: string;
};
