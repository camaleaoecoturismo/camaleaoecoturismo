import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import VagasForm from '@/components/VagasForm';
import { Loader2 } from 'lucide-react';

interface JobOpening {
  id: string;
  title: string;
  type: 'guia' | 'atendimento';
  short_description: string | null;
  requirements: string[] | null;
  is_active: boolean;
  display_order: number;
}

export default function Vagas() {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('job_openings' as any)
      .select('id, title, type, short_description, requirements, is_active, display_order')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (data) setOpenings(data as JobOpening[]);
        setLoading(false);
      });
  }, []);

  function handleApply(job: JobOpening) {
    setSelectedJob(job);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function handleBack() {
    setSelectedJob(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Seleção de vaga */}
        {!selectedJob && (
          <>
            <h1 className="text-xl font-semibold text-foreground mb-1">Candidatura</h1>
            <p className="text-sm text-muted-foreground mb-8">Selecione a vaga para a qual deseja se candidatar.</p>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : openings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma vaga aberta no momento.</p>
            ) : (
              <div className="space-y-3">
                {openings.map(job => (
                  <button
                    key={job.id}
                    onClick={() => handleApply(job)}
                    className="w-full text-left border border-border rounded-xl px-5 py-4 hover:border-foreground/30 hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-medium text-foreground text-sm">{job.title}</p>
                    {job.short_description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{job.short_description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Formulário */}
        {selectedJob && (
          <div ref={formRef}>
            <p className="text-xs text-muted-foreground mb-1">Candidatura para</p>
            <h1 className="text-lg font-semibold text-foreground mb-8">{selectedJob.title}</h1>
            <VagasForm job={selectedJob} onBack={handleBack} />
          </div>
        )}

      </div>
    </div>
  );
}
