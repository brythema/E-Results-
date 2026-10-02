// Runtime configuration flags.
//
// DEMO_MODE gates everything that is not safe for a real deployment:
//   - the demo quick-sign-in buttons and role switcher
//   - the passwordless fallback login against seeded demo accounts
//   - seeding demo data into Firestore on initialize
//
// It must never be enabled in a deployed environment. Enable it only for
// local previews: set VITE_DEMO_MODE=true in .env.local.
export const DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE === 'true';
