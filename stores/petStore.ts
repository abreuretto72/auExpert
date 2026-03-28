import { create } from 'zustand';

interface PetUIState {
  selectedPetId: string | null;
  selectPet: (id: string | null) => void;
}

export const usePetStore = create<PetUIState>((set) => ({
  selectedPetId: null,
  selectPet: (id) => set({ selectedPetId: id }),
}));
