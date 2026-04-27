import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useAuthStore} from '@/store/authStore';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed in React Native
    }
  }
);

// Wrap test code in an async function to avoid top-level await errors in Metro/Hermes
const secureAuth = async () => {
  const res = await supabase.auth.signInWithPassword({
    email: 'nasimautopoint.ltd@gmail.com',
    password: '123',
  });

  if (res.data) {
    const email = res.data.user?.email
    console.info('Successfully signed in as: ', email);
  }
};

secureAuth();
