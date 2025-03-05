import { initializeFirebase } from './firebaseInit';

const { auth, db } = initializeFirebase();

// Export the initialized instances
export { auth, db };
