import type {MetadataRoute} from 'next';

// Installable on the phone ("Adicionar à Tela de Início"): opens full screen, without the browser bars.
export default function manifest():MetadataRoute.Manifest{
  return {
    name:'none · Seu espaço de decisão', short_name:'none', start_url:'/', scope:'/', display:'standalone',
    orientation:'portrait', background_color:'#f6f7f4', theme_color:'#064f42', lang:'pt-BR',
    icons:[{src:'/apple-icon.png',sizes:'180x180',type:'image/png'},{src:'/icon.svg',sizes:'any',type:'image/svg+xml'}]
  };
}
