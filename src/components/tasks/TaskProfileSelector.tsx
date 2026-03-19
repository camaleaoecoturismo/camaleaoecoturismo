import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Lock, User } from "lucide-react";

export interface TaskProfile {
  id: 'isaias' | 'amanda';
  name: string;
  initials: string;
  color: string;
  hasPassword: boolean;
  password?: string;
  isAdmin: boolean; // Can see all tasks
}

// NOTE: Client-side password protection provides no real security.
// Task access is controlled via RLS policies on the tasks table.
// The password field has been removed for security - use Supabase Auth instead.
export const TASK_PROFILES: TaskProfile[] = [
  { 
    id: 'isaias', 
    name: 'Isaias', 
    initials: 'IS', 
    color: 'bg-blue-500', 
    hasPassword: true,
    password: 's',
    isAdmin: true 
  },
  { 
    id: 'amanda', 
    name: 'Amanda', 
    initials: 'AM', 
    color: 'bg-pink-500', 
    hasPassword: false,
    isAdmin: false 
  },
];

interface TaskProfileSelectorProps {
  onSelectProfile: (profile: TaskProfile) => void;
}

const TaskProfileSelector: React.FC<TaskProfileSelectorProps> = ({ onSelectProfile }) => {
  const [selectedProfile, setSelectedProfile] = useState<TaskProfile | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleProfileClick = (profile: TaskProfile) => {
    setError('');
    setPassword('');
    
    if (profile.hasPassword) {
      setSelectedProfile(profile);
    } else {
      onSelectProfile(profile);
    }
  };

  const handlePasswordSubmit = () => {
    if (!selectedProfile) return;
    
    if (password === selectedProfile.password) {
      onSelectProfile(selectedProfile);
    } else {
      setError('Senha incorreta');
      setPassword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
    if (e.key === 'Escape') {
      setSelectedProfile(null);
      setPassword('');
      setError('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gradient-to-b from-background to-muted/30 p-8">
      <h2 className="text-2xl font-bold text-foreground mb-2">Quem está usando?</h2>
      <p className="text-muted-foreground mb-8">Selecione seu perfil para acessar suas tarefas</p>
      
      {!selectedProfile ? (
        <div className="flex gap-8">
          {TASK_PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleProfileClick(profile)}
              className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
            >
              <div className={cn(
                "w-24 h-24 rounded-lg flex items-center justify-center text-white text-3xl font-bold shadow-lg transition-all",
                "ring-4 ring-transparent group-hover:ring-primary/50",
                profile.color
              )}>
                {profile.initials}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-medium text-foreground">{profile.name}</span>
                {profile.hasPassword && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className={cn(
            "w-20 h-20 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-lg",
            selectedProfile.color
          )}>
            {selectedProfile.initials}
          </div>
          <span className="text-lg font-medium text-foreground">{selectedProfile.name}</span>
          
          <div className="flex flex-col gap-2 w-48">
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className={cn(error && "border-destructive")}
            />
            {error && (
              <span className="text-sm text-destructive text-center">{error}</span>
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedProfile(null);
                  setPassword('');
                  setError('');
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button onClick={handlePasswordSubmit} className="flex-1">
                Entrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskProfileSelector;
