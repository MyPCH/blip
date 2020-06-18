export function updatePrescription(state, payload) {
  return {
    ...state,
    prescription: {
      ...state.prescription,
      ...payload,
    },
  };
};

