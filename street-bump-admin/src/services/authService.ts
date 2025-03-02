import { auth } from '@/config/firebase';
import { signInWithPopup, GoogleAuthProvider, UserCredential, onAuthStateChanged, User } from 'firebase/auth';

export type AuthStateCallback = (user: User | null) => void;

export const authService = {

  /**
   * Sign in with Google using Firebase Authentication
   */
  async signIn(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    return auth.signOut();
  },

  /**
   * Subscribe to authentication state changes
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: AuthStateCallback): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};