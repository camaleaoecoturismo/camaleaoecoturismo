import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  MessageSquare, FolderPlus, Plus, Copy, Edit, Trash2, ChevronRight,
  Check, Search, FolderOpen, Layers
} from 'lucide-react';
import { useAtendimentoMessages, AtendimentoCategory, AtendimentoFolder, AtendimentoMessage } from '@/hooks/useAtendimentoMessages';
import { toast } from 'sonner';

const AtendimentoMessagesModule: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AtendimentoCategory | null>(null);
  const [catName, setCatName] = useState('');

  // Folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AtendimentoFolder | null>(null);
  const [folderName, setFolderName] = useState('');

  // Message dialog
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AtendimentoMessage | null>(null);
  const [msgFolderId, setMsgFolderId] = useState<string | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');

  // Edit-and-copy mode
  const [editCopyOpen, setEditCopyOpen] = useState(false);
  const [editCopyBody, setEditCopyBody] = useState('');

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    categories, folders, messages, loading,
    createCategory, updateCategory, deleteCategory,
    createFolder, updateFolder, deleteFolder,
    createMessage, updateMessage, deleteMessage,
  } = useAtendimentoMessages(selectedCategoryId);

  // Filter messages by search
  const filteredMessages = React.useMemo(() => {
    if (!searchTerm.trim()) return messages;
    const term = searchTerm.toLowerCase();
    return messages.filter(m =>
      m.title.toLowerCase().includes(term) || m.body.toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const getMessagesForFolder = (folderId: string) =>
    filteredMessages.filter(m => m.folder_id === folderId);

  const toggleFolder = (id: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Texto copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Erro ao copiar'); }
  };

  // Category save
  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, catName.trim());
      toast.success('Categoria atualizada');
    } else {
      await createCategory(catName.trim());
      toast.success('Categoria criada');
    }
    setCatDialogOpen(false);
    setEditingCategory(null);
    setCatName('');
  };

  // Folder save
  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    if (editingFolder) {
      await updateFolder(editingFolder.id, folderName.trim());
      toast.success('Pasta atualizada');
    } else {
      await createFolder(folderName.trim());
      toast.success('Pasta criada');
    }
    setFolderDialogOpen(false);
    setEditingFolder(null);
    setFolderName('');
  };

  // Message save
  const handleSaveMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) return;
    if (editingMessage) {
      await updateMessage(editingMessage.id, msgTitle.trim(), msgBody.trim());
      toast.success('Mensagem atualizada');
    } else if (msgFolderId) {
      await createMessage(msgFolderId, msgTitle.trim(), msgBody.trim());
      toast.success('Mensagem criada');
    }
    setMsgDialogOpen(false);
    setEditingMessage(null);
    setMsgTitle('');
    setMsgBody('');
    setMsgFolderId(null);
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mensagens de Atendimento</h2>
          <p className="text-sm text-muted-foreground">Banco interno de mensagens para WhatsApp</p>
        </div>
      </div>

      {/* Categories list */}
      {!selectedCategoryId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Categorias</h3>
            <Button onClick={() => { setEditingCategory(null); setCatName(''); setCatDialogOpen(true); }} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma categoria criada ainda.</p>
                <Button onClick={() => { setCatName(''); setCatDialogOpen(true); }} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Criar primeira categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(cat => (
                <Card key={cat.id} className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => { setSelectedCategoryId(cat.id); setOpenFolders(new Set()); setSearchTerm(''); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Layers className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(cat); setCatName(cat.name); setCatDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                            <AlertDialogDescription>Todas as pastas e mensagens dentro serão excluídas.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { deleteCategory(cat.id); toast.success('Categoria excluída'); }}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Selected category - show folders & messages */
        <div className="space-y-4">
          {/* Breadcrumb + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategoryId(null)} className="gap-1 self-start">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Voltar
            </Button>
            <h3 className="text-base font-semibold text-foreground">{selectedCategory?.name}</h3>
            <div className="flex-1" />
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar mensagem..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => { setEditingFolder(null); setFolderName(''); setFolderDialogOpen(true); }} variant="outline" size="sm" className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Nova Pasta
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : folders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma pasta criada ainda.</p>
                <Button onClick={() => { setFolderName(''); setFolderDialogOpen(true); }} variant="outline" className="mt-4 gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Criar primeira pasta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {folders.map(folder => {
                const folderMsgs = getMessagesForFolder(folder.id);
                const isOpen = openFolders.has(folder.id);
                return (
                  <Card key={folder.id} className="overflow-hidden">
                    <Collapsible open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex items-center gap-3">
                            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            <FolderOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{folder.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {messages.filter(m => m.folder_id === folder.id).length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingFolder(folder); setFolderName(folder.name); setFolderDialogOpen(true); }} title="Renomear">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingMessage(null); setMsgFolderId(folder.id); setMsgTitle(''); setMsgBody(''); setMsgDialogOpen(true); }} title="Nova mensagem">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title="Excluir pasta">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
                                  <AlertDialogDescription>Todas as mensagens dentro desta pasta serão excluídas permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => { deleteFolder(folder.id); toast.success('Pasta excluída'); }}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t px-4 pb-4 pt-2 space-y-2">
                          {folderMsgs.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-3 text-center">
                              {searchTerm ? 'Nenhuma mensagem encontrada.' : 'Nenhuma mensagem nesta pasta.'}
                            </p>
                          ) : (
                            folderMsgs.map(msg => (
                              <div key={msg.id} className="border rounded-lg p-3 bg-background hover:bg-muted/30 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-medium text-sm text-foreground">{msg.title}</h4>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button size="sm" variant="ghost" onClick={() => handleCopy(msg.body, msg.id)} title="Copiar texto" className="h-7 w-7 p-0">
                                      {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditCopyBody(msg.body); setEditCopyOpen(true); }} title="Editar e copiar" className="h-7 w-7 p-0">
                                      <Edit className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setEditingMessage(msg); setMsgFolderId(msg.folder_id); setMsgTitle(msg.title); setMsgBody(msg.body); setMsgDialogOpen(true); }} title="Editar mensagem" className="h-7 w-7 p-0">
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Excluir">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => { deleteMessage(msg.id); toast.success('Mensagem excluída'); }}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{msg.body}</pre>
                              </div>
                            ))
                          )}
                          <Button onClick={() => { setEditingMessage(null); setMsgFolderId(folder.id); setMsgTitle(''); setMsgBody(''); setMsgDialogOpen(true); }} variant="ghost" size="sm" className="w-full mt-1 gap-2 text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar mensagem
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Renomear Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Nome da categoria (ex: Chapada Diamantina)" value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveCategory()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={!catName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Renomear Pasta' : 'Nova Pasta'}</DialogTitle>
          </DialogHeader>
          <Input placeholder="Nome da pasta (ex: Informações gerais)" value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveFolder()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título interno da mensagem" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} />
            <Textarea placeholder="Corpo do texto (pensado para WhatsApp)..." value={msgBody} onChange={e => setMsgBody(e.target.value)} rows={8} className="resize-y" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMessage} disabled={!msgTitle.trim() || !msgBody.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Copy Dialog */}
      <Dialog open={editCopyOpen} onOpenChange={setEditCopyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar e Copiar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Edite o texto abaixo antes de copiar. As alterações não serão salvas.</p>
          <Textarea value={editCopyBody} onChange={e => setEditCopyBody(e.target.value)} rows={8} className="resize-y" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCopyOpen(false)}>Cancelar</Button>
            <Button onClick={() => { navigator.clipboard.writeText(editCopyBody); toast.success('Texto copiado!'); setEditCopyOpen(false); }} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtendimentoMessagesModule;
