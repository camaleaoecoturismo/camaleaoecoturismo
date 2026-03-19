import React, { useState } from 'react';
import { useProcessMaps } from '@/hooks/useProcessMaps';
import { ProcessMap } from './types';
import ProcessMapsList from './ProcessMapsList';
import ProcessMapEditor from './ProcessMapEditor';

const ProcessMapsModule: React.FC = () => {
  const { maps, loading, createMap, updateMap, deleteMap } = useProcessMaps();
  const [selectedMap, setSelectedMap] = useState<ProcessMap | null>(null);

  if (selectedMap) {
    return (
      <ProcessMapEditor
        map={selectedMap}
        onSave={async (updates) => {
          const success = await updateMap(selectedMap.id, updates);
          if (success) {
            setSelectedMap(prev => prev ? { ...prev, ...updates } : null);
          }
          return success;
        }}
        onBack={() => setSelectedMap(null)}
      />
    );
  }

  return (
    <ProcessMapsList
      maps={maps}
      loading={loading}
      onCreateMap={createMap}
      onSelectMap={setSelectedMap}
      onDeleteMap={deleteMap}
    />
  );
};

export default ProcessMapsModule;
