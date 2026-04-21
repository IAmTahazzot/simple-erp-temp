import * as SecureStore from 'expo-secure-store';
import {create} from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (user, token) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userInfo', JSON.stringify(user));
    set({user, isLoggedIn: true});
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userInfo');
    set({user: null, isLoggedIn: false});
  },

  checkAuth: async () => {
    try {
      // using demo user for now @TODO: remove this
      // const demoUser: User = {
      //   email: 'lyra@gmail.com', id: '01', name: 'Lyra'
      // }
      //
      // set({
      //   user: demoUser,
      //   isLoggedIn: true,
      //   isLoading: false,
      // })
      const token = await SecureStore.getItemAsync('userToken');
      const userInfoStr = await SecureStore.getItemAsync('userInfo');
      if (token && userInfoStr) {
        set({user: JSON.parse(userInfoStr), isLoggedIn: true, isLoading: false});
      } else {
        set({user: null, isLoggedIn: false, isLoading: false});
      }
    } catch (e) {
      set({user: null, isLoggedIn: false, isLoading: false});
    }
  },
}));
