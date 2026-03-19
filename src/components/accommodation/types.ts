export interface Accommodation {
  id: string;
  tour_id: string;
  name: string;
  address?: string;
  phone?: string;
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AccommodationRoom {
  id: string;
  accommodation_id: string;
  name: string;
  room_type: string;
  capacity: number;
  gender_restriction?: string | null;
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface RoomAssignment {
  id: string;
  room_id: string;
  participant_id?: string | null;
  reserva_id?: string | null;
  participant_index: number;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParticipantForRoom {
  id: string; // unique key: `${reserva_id}_${participant_index}`
  reserva_id: string;
  participant_id?: string;
  participant_index: number;
  nome_completo: string;
  cpf?: string;
  gender?: string; // inferred from name or stored
  whatsapp?: string;
  observacoes?: string; // observations for accommodation reference
  isTitular: boolean;
  pricing_option_name?: string; // tipo de pacote comprado
}

export interface RoomWithOccupancy extends AccommodationRoom {
  assignments: RoomAssignment[];
  occupancy: number;
  participants: ParticipantForRoom[];
}

export interface AccommodationWithRooms extends Accommodation {
  rooms: RoomWithOccupancy[];
}

export const ROOM_TYPES = [
  { value: 'casal', label: 'Casal' },
  { value: 'duplo_solteiro', label: 'Duplo Solteiro' },
  { value: 'triplo', label: 'Triplo' },
  { value: 'quadruplo', label: 'Quádruplo' },
  { value: 'quintuplo', label: 'Quíntuplo' },
  { value: 'sextuplo', label: 'Sêxtuplo' },
  { value: 'suite', label: 'Suíte' },
  { value: 'dormitorio', label: 'Dormitório' },
];

export const GENDER_RESTRICTIONS = [
  { value: 'none', label: 'Sem restrição' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'misto', label: 'Misto (definido)' },
];
