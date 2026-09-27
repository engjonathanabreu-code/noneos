'use client';
import {useEffect} from 'react';

export function MotionFeedback(){
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations=new Set<Animation>();
  const targets=new WeakMap<Element,Animation>();
  function pulse(element:Element){
   if(preference.matches||!element.isConnected||typeof element.animate!=='function')return;
   targets.get(element)?.cancel();
   const animation=element.animate([{boxShadow:'0 0 0 0 rgba(20,148,109,.22)'},{boxShadow:'0 0 0 7px rgba(20,148,109,0)'}],{duration:380,easing:'ease-out'});
   targets.set(element,animation);animations.add(animation);animation.onfinish=()=>animations.delete(animation);animation.oncancel=()=>animations.delete(animation);
  }
  function click(event:MouseEvent){if(!(event.target instanceof Element))return;const button=event.target.closest('button.primary,button.outline,.bs-ai-toggle,.send-button,.bs-composer button');if(button instanceof HTMLButtonElement&&!button.disabled)pulse(button);}
  function change(event:Event){const input=event.target;if(input instanceof HTMLInputElement&&input.type==='checkbox'&&input.checked)pulse(input.closest('label')??input);if(input instanceof HTMLSelectElement&&input.value==='done'){const row=input.closest('.bs-board-row,.bs-action-edit');if(row)pulse(row);}}
  function stop(){if(preference.matches)for(const animation of animations)animation.cancel();}
  document.addEventListener('click',click);document.addEventListener('change',change);preference.addEventListener('change',stop);
  return()=>{document.removeEventListener('click',click);document.removeEventListener('change',change);preference.removeEventListener('change',stop);for(const animation of animations)animation.cancel();};
 },[]);
 return null;
}
