"use client";
import { useEffect, useState } from "react";
import { API_URL } from "./api";

export type CostItem={label:string;category:"materials"|"labour"|"equipment"|"packaging"|"other";amount:number|null;units:number|null;quote:string};

export type Draft = {
  title: string; description: string; category: string; materials: string; region: string;
  length_cm: number | null; width_cm: number | null; height_cm: number | null;
  price: number; stock: number; image_id: string | null; audio_id: string | null;
  transcript: string; translation: string; language: string; translation_approved: boolean;
  processing_consent: boolean; image_public_consent: boolean; audio_public_consent: boolean; version: number;
  cost_items:CostItem[];cost_notes:string;cost_markup_percent:number;
};
export const blankDraft: Draft = {title:"",description:"",category:"",materials:"",region:"",
  length_cm:null,width_cm:null,height_cm:null,price:0,stock:1,image_id:null,audio_id:null,
  transcript:"",translation:"",language:"hi",translation_approved:false,processing_consent:false,
  image_public_consent:false,audio_public_consent:false,version:0,cost_items:[],cost_notes:"",cost_markup_percent:20};
export type SavedCraft = {id:string;title:string;status:string;price:number;stock:number;draft:Draft;ai_assessment?:{score:number;reasons:string[];version:number};last_review?:{decision:string;notes:string;version:number};updated_at:string};
export type Craft = {id:string;title:string;description:string;category:string;materials:string;region:string;verification_state?:string;
  artisan:string;artisan_id:string;price:number;stock:number;maker_share:number;image_uri:string|null;audio_uri:string|null;
  transcript:string;translation:string;language:string;dimensions:Record<string,number>;dimension_source:string;
  provenance_url:string;evidence?:{checked_at:string;notes:string;checks:string[]}[]};
export type Asset = {id:string;content_type:string;url:string;transcript?:string;translation?:string};
export async function request<T>(path:string, token?:string, init:RequestInit = {}):Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", "Bearer " + token);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type","application/json");
  let response:Response;
  try {response=await fetch(API_URL+path,{...init,headers});}
  catch {throw new Error("Could not reach the local API. Your draft stays on this device.");}
  const data = await response.json().catch(()=>null) as {detail?:unknown}|null;
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail==="string"?detail:Array.isArray(detail)?detail.map(x=>x.msg).join("; "):"Request failed ("+response.status+").");
  }
  return data as T;
}
export const send = <T,>(path:string,token:string,body:unknown={},method="POST") =>
  request<T>(path,token,{method,body:JSON.stringify(body)});
export async function uploadMedia(file:File,kind:"image"|"audio",token:string):Promise<Asset>{
  const upload=await send<{mode:string;id?:string;upload_url?:string}>("/v1/media/upload-url",token,
    {kind,content_type:file.type,size:file.size,processing_consent:true});
  if(upload.mode==='supabase'&&upload.upload_url&&upload.id){
    const response=await fetch(upload.upload_url,{method:'PUT',headers:{'Content-Type':file.type},body:file});
    if(!response.ok)throw new Error('The upload failed. Your selected file is still available; retry.');
    return send<Asset>('/v1/media/'+upload.id+'/complete-upload',token);
  }
  const body=new FormData();body.append('file',file);body.append('processing_consent','true');
  return request<Asset>('/v1/media/'+kind,token,{method:'POST',body});
}
export function usePrivateMedia(id:string|null|undefined,token:string) {
  const [media,setMedia]=useState({id:"",token:"",url:""});
  useEffect(()=>{
    if(!id||!token)return;
    let active=true, objectUrl="";
    const controller=new AbortController();
    fetch(API_URL+"/v1/media/"+id,{headers:{Authorization:"Bearer "+token},signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error("Media unavailable");return r.blob();})
      .then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setMedia({id,token,url:objectUrl});}}).catch(()=>{});
    return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id,token]);
  return media.id===id&&media.token===token?media.url:"";
}

