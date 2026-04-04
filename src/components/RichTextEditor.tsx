import React, { useRef, useCallback } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Register custom font sizes with Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
Quill.register(Size, true);

// Register custom line-height with Quill
const Parchment = Quill.import('parchment');
const LineHeightStyle = new Parchment.Attributor.Style('lineHeight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3']
});
Quill.register(LineHeightStyle, true);

async function uploadImageToStorage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('blog-images').upload(path, file, { upsert: false });
  if (error) { toast.error('Erro ao fazer upload da imagem'); return null; }
  const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
  return data.publicUrl;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label,
  placeholder,
  error
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Single image ──────────────────────────────────────────────────────────
  const handleImageClick = useCallback(() => {
    imgInputRef.current?.click();
  }, []);

  const handleImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = await uploadImageToStorage(file);
    if (!url) return;
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    editor.insertEmbed(range.index, 'image', url);
    editor.setSelection(range.index + 1, 0);
  }, []);

  // ── Gallery / Slider ──────────────────────────────────────────────────────
  const handleGalleryClick = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleGalleryFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const toastId = toast.loading(`Enviando ${files.length} imagem(ns)...`);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImageToStorage(file);
      if (url) urls.push(url);
    }
    toast.dismiss(toastId);

    if (!urls.length) return;
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);

    // Insert gallery HTML block
    const imgs = urls.map(u => `<img src="${u}" alt="" />`).join('');
    const html = `<div class="blog-gallery" data-gallery="true">${imgs}</div><p><br></p>`;
    editor.clipboard.dangerouslyPasteHTML(range.index, html);
    toast.success(`${urls.length} imagem(ns) adicionada(s) como galeria`);
  }, []);

  // ── Video ─────────────────────────────────────────────────────────────────
  const handleVideoClick = useCallback(() => {
    const url = prompt('Cole o link do YouTube ou Vimeo:');
    if (!url) return;

    // Convert to embed URL
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    const html = `<div class="blog-video-wrapper"><iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div><p><br></p>`;
    editor.clipboard.dangerouslyPasteHTML(range.index, html);
  }, []);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'] }],
        [{ 'lineHeight': ['1', '1.15', '1.5', '2', '2.5', '3'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        ['link'],
        [{ 'custom-image': 'Foto' }, { 'custom-gallery': 'Galeria' }, { 'custom-video': 'Vídeo' }],
        ['clean']
      ],
      handlers: {
        'custom-image': handleImageClick,
        'custom-gallery': handleGalleryClick,
        'custom-video': handleVideoClick,
      }
    },
  };

  const formats = [
    'header', 'size', 'lineHeight',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align',
    'list', 'bullet', 'indent',
    'blockquote', 'code-block',
    'link', 'image',
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}

      {/* Hidden file inputs */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryFiles} />

      <style>{`
        .ql-custom-image::after { content: '📷 Foto'; font-size: 11px; }
        .ql-custom-gallery::after { content: '🖼 Galeria'; font-size: 11px; }
        .ql-custom-video::after { content: '▶ Vídeo'; font-size: 11px; }
        .ql-custom-image, .ql-custom-gallery, .ql-custom-video {
          width: auto !important;
          padding: 0 6px !important;
        }
      `}</style>

      <div className="rich-text-editor-container border border-input rounded-md">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ height: '320px', marginBottom: '42px' }}
        />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
};

export default RichTextEditor;
