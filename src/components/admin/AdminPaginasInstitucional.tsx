import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Globe, BookOpen,
  HelpCircle, FileText, Users, Eye, EyeOff,
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

// ─── Blog ─────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  cover_image: string | null;
  autor: string | null;
  publicado: boolean;
  published_at: string | null;
  meta_description: string | null;
  tags: string[] | null;
}

function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "", slug: "", excerpt: "", content_html: "",
    cover_image: "", autor: "", publicado: false,
    meta_description: "", tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("blog_posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  const startNew = () => {
    setForm({ titulo: "", slug: "", excerpt: "", content_html: "", cover_image: "", autor: "", publicado: false, meta_description: "", tags: [] });
    setTagInput("");
    setEditing(null); setShowForm(true);
  };

  const startEdit = (p: BlogPost) => {
    setForm({ titulo: p.titulo, slug: p.slug, excerpt: p.excerpt || "", content_html: p.content_html || "", cover_image: p.cover_image || "", autor: p.autor || "", publicado: p.publicado, meta_description: p.meta_description || "", tags: p.tags || [] });
    setTagInput("");
    setEditing(p); setShowForm(true);
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/,/g, "");
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const generateSlug = (title: string) =>
    title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

  const save = async () => {
    if (!form.titulo.trim()) { toast.error("Título obrigatório"); return; }
    setSaving(true);
    const slug = form.slug || generateSlug(form.titulo);
    const data = {
      titulo: form.titulo, slug, excerpt: form.excerpt || null,
      content_html: form.content_html || null, cover_image: form.cover_image || null,
      autor: form.autor || null, publicado: form.publicado,
      published_at: form.publicado ? new Date().toISOString() : null,
      meta_description: form.meta_description || null,
      tags: form.tags.length > 0 ? form.tags : null,
    };
    const { error } = editing
      ? await supabase.from("blog_posts").update(data).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(data);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Post atualizado" : "Post criado"); setShowForm(false); load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast.success("Post removido"); load();
  };

  const togglePublish = async (p: BlogPost) => {
    await supabase.from("blog_posts").update({ publicado: !p.publicado, published_at: !p.publicado ? new Date().toISOString() : null }).eq("id", p.id);
    load();
  };

  if (showForm) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
        <h3 className="font-semibold">{editing ? "Editar Post" : "Novo Post"}</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Título</label>
          <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value, slug: generateSlug(e.target.value) })} placeholder="Título do post" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Slug (URL)</label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="meu-post" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Autor</label>
          <Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} placeholder="Nome do autor" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">URL da imagem de capa</label>
          <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Resumo</label>
          <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Breve descrição do post (aparece nos cards)" rows={2} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium mb-1.5 block flex justify-between">
            <span>Meta Description <span className="text-muted-foreground font-normal">(Google)</span></span>
            <span className={`text-xs ${form.meta_description.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{form.meta_description.length}/160</span>
          </label>
          <Textarea
            value={form.meta_description}
            onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
            placeholder="Descreva com palavras-chave: trilha, cachoeira, Alagoas, Maceió..."
            rows={2}
            maxLength={160}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
            onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
            placeholder="Digite uma tag e pressione Enter (ex: cachoeira, trilha, alagoas)"
          />
          <p className="text-xs text-muted-foreground mt-1">Pressione Enter ou vírgula para adicionar</p>
        </div>
        <div className="sm:col-span-2">
          <RichTextEditor label="Conteúdo" value={form.content_html} onChange={(v) => setForm({ ...form, content_html: v })} />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.publicado} onChange={(e) => setForm({ ...form, publicado: e.target.checked })} className="rounded" />
          <span className="text-sm font-medium">Publicar imediatamente</span>
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1.5" />Novo Post</Button>
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : posts.length === 0 ? <p className="text-center text-muted-foreground py-10">Nenhum post ainda.</p>
        : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                {p.cover_image && <img src={p.cover_image} alt={p.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePublish(p)} className={`p-1.5 rounded-lg transition-colors ${p.publicado ? 'text-green-600 hover:bg-green-50' : 'text-muted-foreground hover:bg-muted'}`} title={p.publicado ? 'Publicado — clique para despublicar' : 'Rascunho — clique para publicar'}>
                    {p.publicado ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

interface FaqItem { id: string; pergunta: string; resposta: string; categoria: string | null; display_order: number; }

function FAQManager() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ pergunta: "", resposta: "", categoria: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from("faq_items").select("*").order("display_order");
    if (data) setItems(data);
    setLoading(false);
  };

  const save = async () => {
    if (!form.pergunta.trim() || !form.resposta.trim()) { toast.error("Pergunta e resposta obrigatórias"); return; }
    setSaving(true);
    const payload = { pergunta: form.pergunta, resposta: form.resposta, categoria: form.categoria || null, display_order: editing?.display_order || items.length + 1 };
    const { error } = editing
      ? await supabase.from("faq_items").update(payload).eq("id", editing.id)
      : await supabase.from("faq_items").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Atualizado" : "Criado"); setShowForm(false); load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    await supabase.from("faq_items").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
          <h3 className="font-semibold text-sm">{editing ? "Editar Pergunta" : "Nova Pergunta"}</h3>
          <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Categoria (ex: Reservas)" />
          <Input value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} placeholder="Pergunta" />
          <Textarea value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} placeholder="Resposta" rows={3} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setForm({ pergunta: "", resposta: "", categoria: "" }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Nova Pergunta
          </Button>
        </div>
      )}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : items.length === 0 ? <p className="text-center text-muted-foreground py-10">Nenhuma pergunta ainda.</p>
        : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {item.categoria && <span className="text-xs text-primary font-medium">{item.categoria}</span>}
                    <p className="font-medium text-sm text-foreground mt-0.5">{item.pergunta}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.resposta}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(item); setForm({ pergunta: item.pergunta, resposta: item.resposta, categoria: item.categoria || "" }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Políticas ────────────────────────────────────────────────────────────────

function PoliticasManager() {
  const [tipo, setTipo] = useState("cancelamento");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadContent(); }, [tipo]);

  const loadContent = async () => {
    setLoading(true);
    const { data } = await supabase.from("policies").select("content_html").eq("tipo", tipo).single();
    setContent(data?.content_html || "");
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("policies")
      .upsert({ tipo, content_html: content, updated_at: new Date().toISOString() }, { onConflict: "tipo" });
    if (error) toast.error(error.message);
    else toast.success("Política salva");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["cancelamento", "termos"].map((t) => (
          <button key={t} onClick={() => setTipo(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${tipo === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"}`}>
            {t === "cancelamento" ? "Cancelamento" : "Termos de Uso"}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : (
          <>
            <ReactQuill theme="snow" value={content} onChange={setContent}
              modules={{ toolbar: [['bold','italic','underline'], ['blockquote'], [{ heading: [2,3,false] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
              style={{ minHeight: 300 }}
            />
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                Salvar
              </Button>
            </div>
          </>
        )}
    </div>
  );
}

// ─── Equipe ───────────────────────────────────────────────────────────────────

interface TeamMember { id: string; nome: string; cargo: string; bio: string | null; foto_url: string | null; display_order: number; }

function EquipeManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ nome: "", cargo: "", bio: "", foto_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from("team_members").select("*").order("display_order");
    if (data) setMembers(data);
    setLoading(false);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload = { nome: form.nome, cargo: form.cargo, bio: form.bio || null, foto_url: form.foto_url || null, display_order: editing?.display_order || members.length + 1 };
    const { error } = editing
      ? await supabase.from("team_members").update(payload).eq("id", editing.id)
      : await supabase.from("team_members").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Atualizado" : "Criado"); setShowForm(false); load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover membro?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
          <h3 className="font-semibold text-sm">{editing ? "Editar Membro" : "Novo Membro"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Cargo / Função" />
            <Input className="sm:col-span-2" value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} placeholder="URL da foto" />
            <Textarea className="sm:col-span-2" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Biografia curta" rows={2} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditing(null); setForm({ nome: "", cargo: "", bio: "", foto_url: "" }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Novo Membro
          </Button>
        </div>
      )}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : members.length === 0 ? <p className="text-center text-muted-foreground py-10">Nenhum membro cadastrado.</p>
        : (
          <div className="grid sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                {m.foto_url ? <img src={m.foto_url} alt={m.nome} className="w-12 h-12 rounded-full object-cover shrink-0" /> : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">{m.nome[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{m.nome}</p>
                  <p className="text-xs text-primary">{m.cargo}</p>
                  {m.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.bio}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditing(m); setForm({ nome: m.nome, cargo: m.cargo, bio: m.bio || "", foto_url: m.foto_url || "" }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPaginasInstitucional() {
  return (
    <Tabs defaultValue="blog">
      <TabsList className="mb-6">
        <TabsTrigger value="blog" className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />Blog
        </TabsTrigger>
        <TabsTrigger value="faq" className="flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4" />FAQ
        </TabsTrigger>
        <TabsTrigger value="politicas" className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />Políticas
        </TabsTrigger>
        <TabsTrigger value="equipe" className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />Equipe
        </TabsTrigger>
      </TabsList>
      <TabsContent value="blog"><BlogManager /></TabsContent>
      <TabsContent value="faq"><FAQManager /></TabsContent>
      <TabsContent value="politicas"><PoliticasManager /></TabsContent>
      <TabsContent value="equipe"><EquipeManager /></TabsContent>
    </Tabs>
  );
}
