import React from 'react';
import { cn } from '@/lib/utils';
import { User, Lock, Shield, UserCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Seat {
  id: string;
  seat_label: string;
  seat_type: 'standard' | 'preferential' | 'crew' | 'blocked';
  row_number: number;
  seat_letter: string;
  position_x: number;
  position_y: number;
  is_occupied?: boolean;
  occupant_name?: string;
  is_selected?: boolean;
}

interface SeatMapProps {
  seats: Seat[];
  rows: number;
  seatsPerRow: number;
  aislePosition: number;
  onSeatClick?: (seat: Seat) => void;
  selectedSeats?: string[];
  maxSelectable?: number;
  showOccupantNames?: boolean;
  editable?: boolean;
  compact?: boolean;
}

const getSeatColor = (seat: Seat, isSelected: boolean) => {
  if (isSelected) return 'bg-primary text-primary-foreground border-primary';
  if (seat.is_occupied) return 'bg-gray-400 text-white cursor-not-allowed';
  
  switch (seat.seat_type) {
    case 'blocked':
      return 'bg-gray-600 text-white cursor-not-allowed';
    case 'crew':
      return 'bg-amber-500 text-white cursor-not-allowed';
    case 'preferential':
      return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200';
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200';
  }
};

const getSeatIcon = (seat: Seat) => {
  if (seat.is_occupied) return <UserCheck className="h-3 w-3" />;
  switch (seat.seat_type) {
    case 'blocked':
      return <Lock className="h-3 w-3" />;
    case 'crew':
      return <Shield className="h-3 w-3" />;
    default:
      return null;
  }
};

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  rows,
  seatsPerRow,
  aislePosition,
  onSeatClick,
  selectedSeats = [],
  maxSelectable = 1,
  showOccupantNames = false,
  editable = true,
  compact = false
}) => {
  const handleClick = (seat: Seat) => {
    if (!editable) return;
    if (seat.is_occupied && seat.seat_type !== 'standard') return;
    if (seat.seat_type === 'blocked' || seat.seat_type === 'crew') return;
    
    onSeatClick?.(seat);
  };

  // Group seats by row
  const seatsByRow: Record<number, Seat[]> = {};
  seats.forEach(seat => {
    if (!seatsByRow[seat.row_number]) {
      seatsByRow[seat.row_number] = [];
    }
    seatsByRow[seat.row_number].push(seat);
  });

  // Sort seats within each row by position
  Object.keys(seatsByRow).forEach(row => {
    seatsByRow[parseInt(row)].sort((a, b) => a.position_x - b.position_x);
  });

  const seatSize = compact ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm';
  const gapSize = compact ? 'gap-1' : 'gap-2';

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center space-y-1">
        {/* Front indicator */}
        <div className="w-full max-w-xs bg-gray-200 rounded-t-full h-6 flex items-center justify-center text-xs text-gray-600 font-medium mb-2">
          FRENTE
        </div>

        {/* Seat rows */}
        <div className={cn("flex flex-col", gapSize)}>
          {Array.from({ length: rows }, (_, rowIndex) => {
            const rowNum = rowIndex + 1;
            const rowSeats = seatsByRow[rowNum] || [];
            
            return (
              <div key={rowNum} className={cn("flex items-center justify-center", gapSize)}>
                {/* Left side seats */}
                <div className={cn("flex", gapSize)}>
                  {rowSeats.slice(0, aislePosition).map(seat => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const canSelect = editable && !seat.is_occupied && seat.seat_type === 'standard';
                    
                    return (
                      <Tooltip key={seat.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleClick(seat)}
                            disabled={!canSelect && !editable}
                            className={cn(
                              seatSize,
                              "rounded-lg border-2 font-bold transition-all flex flex-col items-center justify-center",
                              getSeatColor(seat, isSelected),
                              canSelect && "cursor-pointer hover:scale-105",
                              !canSelect && !editable && "cursor-default"
                            )}
                          >
                            {getSeatIcon(seat) || seat.seat_label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-bold">{seat.seat_label}</p>
                            {seat.is_occupied && seat.occupant_name && (
                              <p className="text-xs">{seat.occupant_name}</p>
                            )}
                            {seat.seat_type === 'crew' && <p className="text-xs">Equipe</p>}
                            {seat.seat_type === 'blocked' && <p className="text-xs">Bloqueado</p>}
                            {seat.seat_type === 'preferential' && <p className="text-xs">Preferencial</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Aisle */}
                <div className={cn(compact ? "w-4" : "w-8")} />

                {/* Right side seats */}
                <div className={cn("flex", gapSize)}>
                  {rowSeats.slice(aislePosition).map(seat => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const canSelect = editable && !seat.is_occupied && seat.seat_type === 'standard';
                    
                    return (
                      <Tooltip key={seat.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleClick(seat)}
                            disabled={!canSelect && !editable}
                            className={cn(
                              seatSize,
                              "rounded-lg border-2 font-bold transition-all flex flex-col items-center justify-center",
                              getSeatColor(seat, isSelected),
                              canSelect && "cursor-pointer hover:scale-105",
                              !canSelect && !editable && "cursor-default"
                            )}
                          >
                            {getSeatIcon(seat) || seat.seat_label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-bold">{seat.seat_label}</p>
                            {seat.is_occupied && seat.occupant_name && (
                              <p className="text-xs">{seat.occupant_name}</p>
                            )}
                            {seat.seat_type === 'crew' && <p className="text-xs">Equipe</p>}
                            {seat.seat_type === 'blocked' && <p className="text-xs">Bloqueado</p>}
                            {seat.seat_type === 'preferential' && <p className="text-xs">Preferencial</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-100 border-2 border-emerald-300" />
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-primary" />
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gray-400" />
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span>Equipe</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gray-600" />
            <span>Bloqueado</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SeatMap;
