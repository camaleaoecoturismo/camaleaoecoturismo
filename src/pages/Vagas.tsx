import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TopMenu } from '@/components/TopMenu';
import Footer from '@/components/Footer';
import VagasForm from '@/components/VagasForm';
import { Briefcase, Headphones, ChevronRight, Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JobOpening {
  id: string;
  title: string;
  type: 'guia' | 'atendimento';
  short_description: string | null;
  full_description: string | null;
  requirements: string[] | null;
  is_active: boolean;
  display_order: number;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  guia: <Briefcase className="h-6 w-6" />,
  atendimento: <Headphones className="h-6 w-6" />,
};

const TYPE_TAG: Record<string, string> = {
  guia: 'Presencial · Piranhas/AL',
  atendimento: 'Presencial ou Remoto · Piranhas/AL',
};

export default function Vagas() {
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('job_openings' as any)
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (data) setOpenings(data as JobOpening[]);
        setLoading(false);
      });
  }, []);

  function handleApply(job: JobOpening) {
    setSelectedJob(job);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function handleBack() {
    setSelectedJob(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  return (
    <div className="min-h-screen bg-white">
      <TopMenu />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0f2e1e] via-[#174226] to-[#1a5230] pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20">
            <Users className="h-3.5 w-3.5" />
            Estamos contratando
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Faça parte do time<br className="hidden sm:block" /> Camaleão
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed">
            Trabalhamos com o que a natureza tem de mais bonito em Alagoas. Se você ama o que fazemos, venha construir isso com a gente.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-white/50 text-sm">
            <MapPin className="h-4 w-4" />
            Piranhas, Alagoas · Cânions do São Francisco
          </div>
        </div>
      </section>

      {/* Vagas abertas */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-foreground mb-2">Vagas abertas</h2>
        <p className="text-muted-foreground mb-8">Confira as oportunidades disponíveis e candidate-se.</p>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando vagas...</span>
          </div>
        ) : openings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-1">Nenhuma vaga aberta no momento</p>
            <p className="text-sm">Volte em breve — novas oportunidades podem surgir!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {openings.map(job => (
              <div
                key={job.id}
                className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col ${
                  selectedJob?.id === job.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {TYPE_ICON[job.type]}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-tight">{job.title}</h3>
                      <span className="text-xs text-muted-foreground">{TYPE_TAG[job.type]}</span>
                    </div>
                  </div>

                  {job.short_description && (
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{job.short_description}</p>
                  )}

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.requirements.map(req => (
                        <span key={req} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                          {req}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6">
                  <Button
                    onClick={() => handleApply(job)}
                    className="w-full gap-2"
                    variant={selectedJob?.id === job.id ? 'outline' : 'default'}
                  >
                    {selectedJob?.id === job.id ? 'Candidatura em andamento' : 'Candidatar-se'}
                    {selectedJob?.id !== job.id && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formulário de candidatura */}
      {selectedJob && (
        <section ref={formRef} className="bg-muted/30 border-t border-border scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full mb-3">
                {TYPE_ICON[selectedJob.type]}
                {selectedJob.title}
              </div>
              <h2 className="text-2xl font-bold text-foreground">Formulário de candidatura</h2>
              <p className="text-muted-foreground text-sm mt-1">Preencha com atenção — quanto mais detalhes, melhor.</p>
            </div>
            <VagasForm job={selectedJob} onBack={handleBack} />
          </div>
        </section>
      )}

      {/* Por que trabalhar na Camaleão */}
      <section className="max-w-4xl mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-8 text-center">Por que trabalhar na Camaleão?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { emoji: '🌿', title: 'Natureza como escritório', desc: 'Trabalhe em um dos cenários mais bonitos de Alagoas, com o Rio São Francisco ao fundo.' },
            { emoji: '🤝', title: 'Time unido', desc: 'Somos uma equipe pequena e próxima. Cada pessoa faz diferença no nosso dia a dia.' },
            { emoji: '🦎', title: 'Missão real', desc: 'Transformamos viagens em experiências que as pessoas nunca esquecem. Isso é o que fazemos.' },
          ].map(item => (
            <div key={item.title} className="text-center p-6 rounded-2xl bg-muted/30 border border-border">
              <div className="text-3xl mb-3">{item.emoji}</div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
