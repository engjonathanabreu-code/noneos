'use client';

import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {EditorContent,useEditor,type JSONContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {AlignCenter,AlignLeft,AlignRight,Bold,Code,Highlighter,Italic,Link,List,ListChecks,ListOrdered,Minus,Quote,Redo2,RemoveFormatting,Strikethrough,Underline,Undo2,X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export type NoteContent={body:string;bodyHtml:string};
export type NoteEditorHandle={appendText:(text:string)=>NoteContent|undefined;checklist:()=>void};
function plainDocument(text:string):JSONContent{return {type:'doc',content:text.split('\n').map(line=>({type:'paragraph',...(line?{content:[{type:'text',text:line}]}:{})}))};}
type Props={text:string;html?:string;readOnly:boolean;onChange:(value:NoteContent)=>void};

export const NoteEditor=forwardRef<NoteEditorHandle,Props>(function NoteEditor({text,html,readOnly,onChange},ref){
 const change=useRef(onChange);change.current=onChange;
 const [linkOpen,setLinkOpen]=useState(false);const [link,setLink]=useState('');const [linkError,setLinkError]=useState('');const selection=useRef({from:0,to:0});
 const editor=useEditor({
  immediatelyRender:false,shouldRerenderOnTransaction:true,
  extensions:[StarterKit.configure({heading:{levels:[1,2,3]},link:{openOnClick:false,autolink:true,protocols:['http','https','mailto'],HTMLAttributes:{rel:'noopener noreferrer',target:'_blank'}}}),Highlight.configure({multicolor:true}),TextAlign.configure({types:['heading','paragraph']}),TaskList,TaskItem.configure({nested:true,a11y:{checkboxLabel:node=>'Concluir: '+(node.textContent||'item sem texto')}})],
  content:html??plainDocument(text),editable:!readOnly,
  editorProps:{attributes:{class:'bs-rich-document',role:'textbox','aria-label':'Conteúdo da nota','aria-multiline':'true','data-placeholder':'Comece com uma ideia…'},handleClick:(_view,_pos,event)=>{if((event.target as HTMLElement).closest('a')){event.preventDefault();return true;}return false;}},
  onUpdate:({editor:e})=>change.current({body:e.getText({blockSeparator:'\n'}),bodyHtml:e.getHTML()}),
 });
 useEffect(()=>{editor?.setEditable(!readOnly,false);},[editor,readOnly]);
 useImperativeHandle(ref,()=>({
  appendText(value){if(!editor||readOnly)return;editor.commands.insertContentAt(editor.state.doc.content.size,plainDocument(value).content!,{updateSelection:false});return {body:editor.getText({blockSeparator:'\n'}),bodyHtml:editor.getHTML()};},
  checklist(){if(!readOnly)editor?.chain().focus().toggleTaskList().run();},
 }),[editor,readOnly]);
 if(!editor)return <div className="bs-rich-loading" role="status">Abrindo editor…</div>;
 function tool(label:string,Icon:LucideIcon,run:()=>void,active=false,disabled=false){return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled||readOnly} onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={16}/></button>;}
 function editLink(){if(!editor)return;selection.current={from:editor.state.selection.from,to:editor.state.selection.to};setLink(editor.getAttributes('link').href??'');setLinkError('');setLinkOpen(true);}
 function saveLink(){if(!editor)return;const href=link.trim();if(!/^(https?:\/\/|mailto:)[^\s]+$/i.test(href)){setLinkError('Use um endereço começando com https://, http:// ou mailto:.');return;}try{const parsed=new URL(href);if(!['https:','http:','mailto:'].includes(parsed.protocol))throw Error();}catch{setLinkError('Confira o endereço do link.');return;}const chain=editor.chain().focus().setTextSelection(selection.current);if(selection.current.from===selection.current.to&&!editor.isActive('link'))chain.insertContent({type:'text',text:href,marks:[{type:'link',attrs:{href}}]}).run();else chain.extendMarkRange('link').setLink({href}).run();setLinkOpen(false);}
 return <div className="bs-rich-editor">
  {!readOnly&&<div className="bs-format-toolbar" role="group" aria-label="Formatação da nota">
   <select aria-label="Estilo do parágrafo" value={editor.isActive('heading',{level:1})?'1':editor.isActive('heading',{level:2})?'2':editor.isActive('heading',{level:3})?'3':'0'} onChange={e=>{const level=Number(e.target.value);if(level)editor.chain().focus().toggleHeading({level:level as 1|2|3}).run();else editor.chain().focus().setParagraph().run();}}><option value="0">Texto</option><option value="1">Título</option><option value="2">Subtítulo</option><option value="3">Seção</option></select>
   {tool('Negrito (Ctrl+B)',Bold,()=>editor.chain().focus().toggleBold().run(),editor.isActive('bold'))}
   {tool('Itálico (Ctrl+I)',Italic,()=>editor.chain().focus().toggleItalic().run(),editor.isActive('italic'))}
   {tool('Sublinhado (Ctrl+U)',Underline,()=>editor.chain().focus().toggleUnderline().run(),editor.isActive('underline'))}
   {tool('Tachado',Strikethrough,()=>editor.chain().focus().toggleStrike().run(),editor.isActive('strike'))}
   {tool('Destacar texto',Highlighter,()=>editor.chain().focus().toggleHighlight({color:'#f9e8a0'}).run(),editor.isActive('highlight'))}
   <select aria-label="Cor do destaque" value={editor.getAttributes('highlight').color??'none'} onChange={e=>{if(e.target.value==='none')editor.chain().focus().unsetHighlight().run();else editor.chain().focus().setHighlight({color:e.target.value}).run();}}><option value="#f9e8a0">Amarelo</option><option value="#c9e9d7">Verde</option><option value="#d7e7fc">Azul</option><option value="#f5d7e5">Rosa</option><option value="none">Sem destaque</option></select>
   <span className="bs-format-separator"/>
   {tool('Lista com marcadores',List,()=>editor.chain().focus().toggleBulletList().run(),editor.isActive('bulletList'))}
   {tool('Lista numerada',ListOrdered,()=>editor.chain().focus().toggleOrderedList().run(),editor.isActive('orderedList'))}
   {tool('Checklist clicável',ListChecks,()=>editor.chain().focus().toggleTaskList().run(),editor.isActive('taskList'))}
   {tool('Citação',Quote,()=>editor.chain().focus().toggleBlockquote().run(),editor.isActive('blockquote'))}
   {tool('Código',Code,()=>editor.chain().focus().toggleCodeBlock().run(),editor.isActive('codeBlock'))}
   {tool('Separador',Minus,()=>editor.chain().focus().setHorizontalRule().run())}
   {tool('Alinhar à esquerda',AlignLeft,()=>editor.chain().focus().setTextAlign('left').run(),editor.isActive({textAlign:'left'}))}
   {tool('Centralizar',AlignCenter,()=>editor.chain().focus().setTextAlign('center').run(),editor.isActive({textAlign:'center'}))}
   {tool('Alinhar à direita',AlignRight,()=>editor.chain().focus().setTextAlign('right').run(),editor.isActive({textAlign:'right'}))}
   {tool('Inserir ou editar link',Link,editLink,editor.isActive('link'))}
   {tool('Limpar formatação',RemoveFormatting,()=>editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run())}
   {tool('Desfazer',Undo2,()=>editor.chain().focus().undo().run(),false,!editor.can().undo())}
   {tool('Refazer',Redo2,()=>editor.chain().focus().redo().run(),false,!editor.can().redo())}
  </div>}
  {linkOpen&&!readOnly&&<form className="bs-link-form" onSubmit={e=>{e.preventDefault();saveLink();}}><label>Endereço do link<input aria-label="Endereço do link" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://…" autoFocus/></label><div><button type="submit">Aplicar link</button><button type="button" onClick={()=>{editor.chain().focus().setTextSelection(selection.current).extendMarkRange('link').unsetLink().run();setLinkOpen(false);}}>Remover link</button><button type="button" aria-label="Cancelar link" onClick={()=>setLinkOpen(false)}><X size={15}/></button></div>{linkError&&<p role="alert">{linkError}</p>}</form>}
  <EditorContent editor={editor} className="bs-rich-scroll"/>
 </div>;
});
