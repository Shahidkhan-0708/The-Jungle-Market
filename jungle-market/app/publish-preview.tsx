"use client";
import {useEffect,useState} from 'react';
import PublishFlow from './publish-flow';
import {request,SavedCraft} from '@/lib/workflow';
import Link from 'next/link';

export default function PublishPreview({authToken="",view="step-1",go}:{authToken?:string;view?:string;go:(role:"artisan",view:string)=>void}) {
  const [restoring,setRestoring]=useState(true),[craft,setCraft]=useState<SavedCraft|undefined>();
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    const id=new URLSearchParams(location.search).get('draft');
    if(!authToken||(!id&&view==='step-1')){setRestoring(false);return;}
    setRestoring(true);setError('');
    request<{data:SavedCraft[]}>('/v1/products',authToken).then(result=>{
      if(!active)return;
      const saved=id?result.data.find(item=>item.id===id):result.data.find(item=>item.status==='DRAFT');
      if(id&&!saved)throw new Error('This draft is unavailable in your account. Open Saved crafts & orders.');
      if(saved){setCraft(saved);const url=new URL(location.href);url.searchParams.set('draft',saved.id);history.replaceState(null,'',url);}
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Could not restore the draft.');})
      .finally(()=>{if(active)setRestoring(false);});
    return()=>{active=false;};
    // Restore once on entry, not on every Next/Back navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[authToken]);
  if(restoring)return <p role="status">Restoring your saved craft…</p>;
  if(error)return <div role="alert">{error} <Link href="/?workspace=1&browse=1">Saved crafts &amp; orders</Link></div>;
  return <PublishFlow token={authToken} craft={craft} step={Number(view.split('-')[1])||1}
    onSaved={saved=>{const url=new URL(location.href);url.searchParams.set('draft',saved.id);history.replaceState(null,'',url);}}
    onStep={step=>go('artisan','step-'+step)}/>;
}
