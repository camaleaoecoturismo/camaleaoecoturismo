import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, ExternalLink, Link as LinkIcon, ChevronRight, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  url: string;
  order_index: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  parent_id: string | null;
  children?: MenuItem[];
}

export const MenuManagement = () => {
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    open_in_new_tab: false,
    parent_id: '' as string | null
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('order_index');

      if (error) throw error;
      
      const items = data || [];
      setAllItems(items);
      
      // Organize items into hierarchy
      const rootItems = items.filter(item => !item.parent_id);
      const organizedItems = rootItems.map(parent => ({
        ...parent,
        children: items.filter(child => child.parent_id === parent.id)
          .sort((a, b) => a.order_index - b.order_index)
      }));
      
      setMenuItems(organizedItems);
    } catch (error) {
      console.error('Erro ao buscar itens do menu:', error);
      toast.error('Erro ao carregar itens do menu');
    } finally {
      setLoading(false);
    }
  };

  // Get available parent items (excluding the item being edited and its children)
  const getAvailableParents = () => {
    if (!editingItem) {
      // When creating new item, any root item can be a parent
      return allItems.filter(item => !item.parent_id);
    }
    
    // When editing, exclude self and any items that are children of the editing item
    return allItems.filter(item => 
      !item.parent_id && // Only root items can be parents
      item.id !== editingItem.id // Can't be parent of itself
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      const parentId = formData.parent_id === '' || formData.parent_id === 'none' ? null : formData.parent_id;
      const urlValue = formData.url.trim() || '#';
      
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: formData.name.trim(),
            url: urlValue,
            open_in_new_tab: formData.open_in_new_tab,
            parent_id: parentId,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item do menu atualizado!');
      } else {
        // Get next order_index based on parent
        const siblingItems = parentId 
          ? allItems.filter(item => item.parent_id === parentId)
          : allItems.filter(item => !item.parent_id);
        
        const nextOrderIndex = siblingItems.length > 0 
          ? Math.max(...siblingItems.map(item => item.order_index)) + 1 
          : 1;
        
        const { error } = await supabase
          .from('menu_items')
          .insert({
            name: formData.name.trim(),
            url: urlValue,
            open_in_new_tab: formData.open_in_new_tab,
            order_index: nextOrderIndex,
            parent_id: parentId,
          });

        if (error) throw error;
        toast.success('Item do menu adicionado!');
      }

      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error('Erro ao salvar item do menu:', error);
      toast.error('Erro ao salvar item do menu');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', open_in_new_tab: false, parent_id: '' });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      url: item.url === '#' ? '' : item.url,
      open_in_new_tab: item.open_in_new_tab,
      parent_id: item.parent_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if item has children
    const item = menuItems.find(i => i.id === id);
    if (item?.children && item.children.length > 0) {
      toast.error('Remova os subitens primeiro ou mova-os para outro menu');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item excluído!');
      fetchMenuItems();
    } catch (error) {
      console.error('Erro ao excluir item do menu:', error);
      toast.error('Erro ao excluir item do menu');
    }
  };

  const handleDeleteChild = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este subitem?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subitem excluído!');
      fetchMenuItems();
    } catch (error) {
      console.error('Erro ao excluir subitem:', error);
      toast.error('Erro ao excluir subitem');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Item ${isActive ? 'ativado' : 'desativado'}!`);
      fetchMenuItems();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const moveItem = async (itemId: string, direction: 'up' | 'down', parentId: string | null = null) => {
    let itemsToReorder: MenuItem[];
    if (parentId) {
      const parent = menuItems.find(item => item.id === parentId);
      itemsToReorder = parent?.children || [];
    } else {
      itemsToReorder = menuItems;
    }
    
    const currentIndex = itemsToReorder.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= itemsToReorder.length) return;

    const updatedItems = [...itemsToReorder];
    const [movedItem] = updatedItems.splice(currentIndex, 1);
    updatedItems.splice(newIndex, 0, movedItem);

    try {
      for (let i = 0; i < updatedItems.length; i++) {
        const { error } = await supabase
          .from('menu_items')
          .update({ order_index: i + 1 })
          .eq('id', updatedItems[i].id);

        if (error) throw error;
      }

      toast.success('Ordem atualizada!');
      fetchMenuItems();
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      toast.error('Erro ao reordenar');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  const availableParents = getAvailableParents();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Menu</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edite um item e selecione "Menu Pai" para transformá-lo em subitem
          </p>
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setFormData({ name: '', url: '', open_in_new_tab: false, parent_id: '' });
          setIsDialogOpen(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Item
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : 'Novo Item do Menu'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome (Label)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Início, Blog, Contato..."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="parent">Menu Pai (para criar submenu)</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (item principal)" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">Nenhum (item principal)</SelectItem>
                  {availableParents.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      ↳ {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um menu pai para transformar este item em subitem (dropdown)
              </p>
            </div>
            
            <div>
              <Label htmlFor="url">URL (Href)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://exemplo.com ou /pagina"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para menus com subitens (será apenas um dropdown)
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="open_in_new_tab">Abrir em nova aba</Label>
              <Switch
                id="open_in_new_tab"
                checked={formData.open_in_new_tab}
                onCheckedChange={(checked) => setFormData({ ...formData, open_in_new_tab: checked })}
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingItem ? 'Atualizar' : 'Adicionar'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {menuItems.map((item, index) => (
          <Card key={item.id} className={`border ${!item.is_active ? 'opacity-50' : ''}`}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-normal">
                    #{index + 1}
                  </span>
                  {item.children && item.children.length > 0 && (
                    <FolderOpen className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-semibold">{item.name}</span>
                  {item.open_in_new_tab && (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                  {item.children && item.children.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {item.children.length} subiten{item.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => handleToggleActive(item.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LinkIcon className="h-3 w-3" />
                  <span className="break-all">{item.url === '#' ? '(sem link - apenas dropdown)' : item.url}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={index === menuItems.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    ↓
                  </Button>
                </div>
              </div>
              
              {/* Subitems */}
              {item.children && item.children.length > 0 && (
                <div className="mt-3 ml-4 border-l-2 border-primary/20 pl-4 space-y-2">
                  {item.children.map((child, childIndex) => (
                    <div 
                      key={child.id} 
                      className={`flex items-center justify-between p-2 rounded-lg bg-muted/50 ${!child.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{child.name}</span>
                        {child.open_in_new_tab && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          ({child.url})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(child.id, 'up', item.id)}
                          disabled={childIndex === 0}
                          className="h-6 w-6 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(child.id, 'down', item.id)}
                          disabled={childIndex === item.children!.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          ↓
                        </Button>
                        <Switch
                          checked={child.is_active}
                          onCheckedChange={(checked) => handleToggleActive(child.id, checked)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(child)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteChild(child.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {menuItems.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum item no menu. Clique em "Adicionar Item" para começar.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
