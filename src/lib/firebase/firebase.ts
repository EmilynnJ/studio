// Minimal firebase stub
export const db = {
  collection: () => ({
    doc: () => ({
      get: async () => ({}),
      set: async () => ({}),
    }),
  }),
};