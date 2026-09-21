"use client";
import Link from "next/link";
import {FormEvent,useEffect,useState,useRef} from "react";
import {Leaf,ArrowLeft,Plus,RefreshCw,LogOut,ShieldCheck,Download,Copy} from "lucide-react";
import {Toaster,toast} from "sonner";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {AuthSession} from "@/lib/auth";
import {API_URL} from "@/lib/api";
import {blankDraft,Craft,SavedCraft,request,send,usePrivateMedia} from "@/lib/workflow";
import {createPaymentOrder,PaymentOrder,PaymentResult,verifyPayment,OndcOrder} from "@/lib/payments";
import {Btn,Panel,Field,Badge,Payout,money} from "./jungle-market";
import PublishFlow from "./publish-flow";
import {MockPaymentGateway} from "./mock-payment-gateway";
import Craft3DViewer from "@/components/craft-3d-viewer";

type Order=OndcOrder&{is_seller:boolean;shipping_address:string;maker_amount:number;items:{title:string;quantity:number;price:number}[]};
type RecordRow={id:string;owner_id:string;recipient_id:string;product_id?:string;title?:string;body?:string;sender?:string;
  dimensions?:string;quantity?:number;finish?:string;artisan?:string;village?:string;date?:string;time?:string;purpose?:string;status?:string;created_at:string};
function ProtectedMedia({craft,token}:{craft:SavedCraft;token:string}) {
  const image=usePrivateMedia(craft.draft.image_id,token),audio=usePrivateMedia(craft.draft.audio_id,token);
  return <div className="stack">{image&&<img src={image} alt={craft.title} style={{maxHeight:280,objectFit:"contain",width:"100%"}}/>}{audio&&<audio controls src={audio} style={{width:"100%"}}/>}<p>{craft.draft.transcript}</p>{craft.draft.translation&&<p>Translation for review: {craft.draft.translation}</p>}</div>;
}

export default function LiveMarket({session,onSignOut,embedded=false,initialView="discover",onViewChange}:{session:AuthSession|null;onSignOut:()=>void;embedded?:boolean;initialView?:string;onViewChange?:(view:string)=>void}) {
  const token=session?.access_token||"",role=session?.user.role||"BUYER";
  const [view,setView]=useState(initialView),[crafts,setCrafts]=useState<Craft[]>([]),[mine,setMine]=useState<SavedCraft[]>([]);
  const [queue,setQueue]=useState<SavedCraft[]>([]),[orders,setOrders]=useState<Order[]>([]),[messages,setMessages]=useState<RecordRow[]>([]);
  const [custom,setCustom]=useState<RecordRow[]>([]),[visits,setVisits]=useState<RecordRow[]>([]),[report,setReport]=useState<Record<string,string|number>|null>(null);
  const [selected,setSelected]=useState<Craft|null>(null),[editor,setEditor]=useState<SavedCraft|null>(null);
  const [query,setQuery]=useState(""),[maxPrice,setMaxPrice]=useState(""),[category,setCategory]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const [quantity,setQuantity]=useState(1),[address,setAddress]=useState(""),[payment,setPayment]=useState<PaymentOrder|null>(null);
  const [deletion,setDeletion]=useState("");
  const [show3D, setShow3D] = useState(false);
  const checkoutAttempt=useRef({cart:"",id:""});
  async function load(){
    setLoading(true);setError("");
    try {
      if(view==="discover"){const params=new URLSearchParams({q:query});if(maxPrice)params.set("max_price",maxPrice);if(category)params.set("category",category);
        setCrafts((await request<{data:Craft[]}>("/v1/catalog/search?"+params)).data);}
      if(view==="my-crafts")setMine((await request<{data:SavedCraft[]}>("/v1/products",token)).data);
      if(view==="review")setQueue((await request<{queue:SavedCraft[]}>("/v1/ambassador/queue",token)).queue);
      if(view==="orders")setOrders((await request<{data:Order[]}>("/v1/orders",token)).data);
      if(view==="messages"){
        const [m,c]=await Promise.all([request<{data:RecordRow[]}>("/v1/messages",token),request<{data:RecordRow[]}>("/v1/custom-orders",token)]);
        setMessages(m.data);setCustom(c.data);
      }
      if(view==="visits")setVisits((await request<{data:RecordRow[]}>("/v1/ambassador/visits",token)).data);
      if(view==="reports")setReport(await request<Record<string,string|number>>("/v1/reports/impact"));
    }catch(e){setError(e instanceof Error?e.message:"Could not load records.");}
    finally{setLoading(false);}
  }
  // Fetch the selected server view on navigation; search remains an explicit submit.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(()=>{void load();},[view,token]); // Search runs on submit, not on every keystroke.
  useEffect(()=>{onViewChange?.(view);},[view,onViewChange]);
  useEffect(()=>{const id=new URLSearchParams(location.search).get("craft");if(id)void openCraft(id);},[]);
  async function action(operation:()=>Promise<void>){
    setBusy(true);setError("");try{await operation();}catch(e){setError(e instanceof Error?e.message:"The action failed. Nothing was confirmed.");}finally{setBusy(false);}
  }
  function navigate(next:string){setEditor(null);setSelected(null);setView(next);setError("");}
  async function openCraft(id:string){
    await action(async()=>{const craft=await request<Craft>("/v1/catalog/product/"+id);setSelected(craft);setView("product");setQuantity(1);});
  }
  async function createDraft(){
    await action(async()=>{const value=await send<SavedCraft>("/v1/products",token,blankDraft);setEditor(value);setView("edit");});
  }
  async function finishPayment(result:PaymentResult){
    if(!payment)return;
    await verifyPayment(payment.order_id,result,token);
    checkoutAttempt.current={cart:"",id:""};setPayment(null);setSelected(null);setView("orders");toast.success("Mock payment verified. No real money was moved.");await loadOrders();
  }
  async function loadOrders(){setOrders((await request<{data:Order[]}>("/v1/orders",token)).data);}
  async function review(event:FormEvent<HTMLFormElement>,craft:SavedCraft){
    event.preventDefault();const data=new FormData(event.currentTarget);
    await action(async()=>{await send("/v1/ambassador/review",token,{product_id:craft.id,action:data.get("decision"),notes:data.get("notes"),checks:data.getAll("checks"),version:craft.draft.version});toast.success("Review saved.");await load();});
  }
  async function reply(event:FormEvent<HTMLFormElement>,row:RecordRow){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await action(async()=>{await send("/v1/messages",token,{product_id:row.product_id,recipient_id:row.owner_id,body:data.get("body")});form.reset();await load();});
  }
  const nav=[["discover","Discover"],...(role==="ARTISAN"?[["my-crafts","My crafts"]]:[]),
    ...(role==="AMBASSADOR"?[["review","Field review"]]:[]),
    ...(session?[["orders","Orders"],["messages","Conversations"],["reports","Impact"],["account","Account"]]:[])];
  return <div className={embedded?"connected-content":"jungle"} data-role={role.toLowerCase()}>
    {!embedded&&<><Toaster position="top-center" richColors/><a href="#main" className="skip-link">Skip to content</a>
    <header className="topbar"><div className="header-inner"><button className="brand" onClick={()=>navigate("discover")}><Leaf/><span>jungle market<small>ROOTED IN PEOPLE</small></span></button>
      <div className="row"><span>{session?.user.full_name}</span>{session?<Btn tone="ghost" onClick={onSignOut}><LogOut/>Sign out</Btn>:<Link className="jm-btn primary" href="/">Sign in</Link>}</div></div></header>

    <nav className="live-nav" aria-label="Marketplace navigation">{nav.map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>navigate(id)}>{label}</button>)}</nav></>}
    <section aria-label="Saved marketplace records" className="work-main" style={{maxWidth:1200,margin:"auto",padding:"24px"}}>
    <div className="notice">Payments, delivery updates and settlements are a sandbox. No real money is moved.</div>
    {error&&<div className="notice error" role="alert">{error}</div>}
    {loading&&<p role="status">Loading saved records…</p>}
    {!["product","edit"].includes(view)&&<div className="row between"><h1>{{discover:"Craft with a known story.","my-crafts":"Your crafts.",review:"Field review.",orders:"Your orders.",messages:"Craft conversations.",visits:"Village visits.",reports:"Recorded impact.",account:"Your account."}[view]}</h1><Btn tone="secondary" disabled={busy||loading} onClick={()=>void load()}><RefreshCw/>Refresh</Btn></div>}
    {view==="discover"&&<>
      <p>Meet the maker, hear the original story, and see the field checks behind each published craft.</p>
      <form className="row live-search" onSubmit={e=>{e.preventDefault();void load();}}><Field label="Search crafts"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or story"/></Field><Field label="Category"><Input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Any category"/></Field><Field label="Maximum price (₹)"><Input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></Field><Btn type="submit">Search</Btn></form>
      {!loading&&!error&&!crafts.length&&<Panel><h2>No published crafts yet.</h2><p>A craft appears here after AI or ambassador review and publication by its maker.</p>{role==="ARTISAN"&&<Btn onClick={createDraft}>Create your first craft</Btn>}</Panel>}
      <div className="product-grid">{crafts.map(c=><article key={c.id} className="product-card"><div className="product-photo"><button className="image-button" onClick={()=>openCraft(c.id)} aria-label={"View "+c.title}>{c.image_uri&&<img src={c.image_uri} alt={c.title}/>}</button><Badge><ShieldCheck size={13}/>{c.verification_state==='AI_REVIEWED'?'AI reviewed':'Field reviewed'}</Badge></div><div className="product-meta"><span className="eyebrow">{c.category}</span><span>{c.stock} available</span></div><button className="text-link title-link" onClick={()=>openCraft(c.id)}>{c.title}</button><p>by {c.artisan} · {c.region}</p><div className="row between"><strong className="price">{money(c.price)}</strong><Btn tone="ghost" aria-label={"View "+c.title+" and evidence"} onClick={()=>openCraft(c.id)}><Plus/></Btn></div><small>Maker receives {money(c.maker_share)}</small></article>)}</div>
    </>}
    {view==="my-crafts"&&<><Btn disabled={busy} onClick={createDraft}><Plus/>New craft</Btn><div className="live-grid">{mine.map(c=><Panel key={c.id} className="stack"><Badge tone={c.status==="PUBLISHED"?"green":"amber"}>{c.status.replaceAll("_"," ")}</Badge><h2>{c.title||"Untitled draft"}</h2><small>Saved {new Date(c.updated_at).toLocaleString()}</small>
      {c.last_review&&<blockquote><strong>{c.last_review.decision.replaceAll("_"," ")} · version {c.last_review.version}</strong><p>{c.last_review.notes}</p></blockquote>}
      {c.status==="DRAFT"&&<Btn onClick={()=>{setEditor(c);setView("edit");}}>Continue draft</Btn>}
      {c.status==="VERIFIED"&&<Btn disabled={busy} onClick={()=>action(async()=>{await send("/v1/products/"+c.id+"/publish",token);toast.success("Craft published.");await load();})}>Publish approved craft</Btn>}
      {c.status==="PUBLISHED"&&<Btn tone="secondary" onClick={()=>openCraft(c.id)}>View live craft</Btn>}
      {!["DRAFT","ARCHIVED"].includes(c.status)&&<Btn tone="secondary" disabled={busy} onClick={()=>action(async()=>{const row=await send<SavedCraft>("/v1/products/"+c.id+"/withdraw",token);setEditor(row);setView("edit");})}>Withdraw and edit</Btn>}
    </Panel>)}</div></>}
    {view==="edit"&&editor&&<PublishFlow key={editor.id} craft={editor} token={token} onSaved={setEditor} onClose={()=>navigate("my-crafts")}/>}
    {view==="product"&&selected&&<section className="section stack"><Btn tone="ghost" onClick={()=>navigate("discover")}><ArrowLeft/>Back to discovery</Btn><div className="two-col">
      <Panel className="stack">
        <div className="row between" style={{marginBottom: 8}}>
          <h2 style={{margin:0}}>Product Media</h2>
          <Btn tone="secondary" onClick={() => setShow3D(!show3D)}>{show3D ? "View 2D Photo" : "View in 3D & AR"}</Btn>
        </div>
        {show3D ? <Craft3DViewer /> : (selected.image_uri&&<img src={selected.image_uri} alt={selected.title} style={{width:"100%",maxHeight:500,objectFit:"contain"}}/>)}
        <Badge><ShieldCheck/>Materials, dimensions, origin and story reviewed</Badge>
        {selected.audio_uri?<><h2>Hear {selected.artisan}&apos;s story</h2><audio controls src={selected.audio_uri} preload="metadata" style={{width:"100%"}}/></>:<p>The maker has not shared a public recording.</p>}
        {selected.transcript&&<><h3>Original words · {selected.language}</h3><p style={{whiteSpace:"pre-wrap"}}>{selected.transcript}</p></>}
        {selected.translation&&<><h3>Reviewed English translation</h3><p style={{whiteSpace:"pre-wrap"}}>{selected.translation}</p></>}
      </Panel><Panel className="stack"><div className="eyebrow">{selected.category} · {selected.region}</div><h1>{selected.title}</h1><p>Made by {selected.artisan}</p><p style={{whiteSpace:"pre-wrap"}}>{selected.description}</p><strong className="big-price">{money(selected.price)}</strong><Payout price={selected.price}/><small>Delivery and network amounts are sandbox allowances, not carrier quotes.</small><dl className="spec-table"><div><dt>Materials</dt><dd>{selected.materials}</dd></div><div><dt>Dimensions</dt><dd>{Object.values(selected.dimensions).join(" × ")} cm</dd></div><div><dt>Evidence</dt><dd>{selected.dimension_source}</dd></div><div><dt>Available</dt><dd>{selected.stock}</dd></div></dl>
        {selected.evidence?.map((e,i)=><blockquote key={i}>{e.notes}<small>Field checked {new Date(e.checked_at).toLocaleDateString()}</small></blockquote>)}
        <div className="row"><a className="jm-btn secondary" href={API_URL+"/v1/certificates/"+selected.id+".pdf"}><Download/>Provenance PDF</a><Btn tone="secondary" onClick={()=>action(async()=>{await navigator.clipboard.writeText(selected.provenance_url);toast.success("Craft link copied.");})}><Copy/>Copy craft link</Btn></div>
        {session&&selected.artisan_id!==session.user.id?<form className="stack" onSubmit={e=>{e.preventDefault();void action(async()=>{const cart=JSON.stringify([selected.id,quantity,address]);if(checkoutAttempt.current.cart!==cart)checkoutAttempt.current={cart,id:crypto.randomUUID()};setPayment(await createPaymentOrder(selected.id,quantity,address,token,checkoutAttempt.current.id));});}}>
          <Field label="Quantity"><Input type="number" min="1" max={Math.min(20,selected.stock)} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></Field><Field label="Delivery address"><Textarea required minLength={10} maxLength={1000} value={address} onChange={e=>setAddress(e.target.value)}/></Field><Btn type="submit" disabled={busy||selected.stock<1}>{selected.stock?"Checkout · "+money(selected.price*quantity):"Sold out"}</Btn></form>:!session?<Link href="/" className="jm-btn primary">Sign in to buy or contact the maker</Link>:<p>This is your craft.</p>}
      </Panel></div>
      {session&&selected.artisan_id!==session.user.id&&<div className="two-col"><Panel><h2>Ask the maker</h2><form className="stack" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,data=new FormData(form);void action(async()=>{await send("/v1/messages",token,{product_id:selected.id,body:data.get("body")});form.reset();toast.success("Message saved for the maker.");});}}><Field label="Your message"><Textarea name="body" required maxLength={4000}/></Field><Btn disabled={busy}>Send message</Btn></form></Panel><Panel><h2>Request a custom version</h2><form className="stack" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,data=new FormData(form);void action(async()=>{await send("/v1/custom-orders",token,{product_id:selected.id,dimensions:data.get("dimensions"),finish:data.get("finish"),quantity:Number(data.get("quantity")),notes:data.get("notes")});form.reset();toast.success("Custom request saved for the maker.");});}}><Field label="Requested dimensions"><Input name="dimensions" required minLength={2}/></Field><Field label="Finish"><Input name="finish" required minLength={2}/></Field><Field label="Pieces"><Input name="quantity" type="number" min="1" max="500" defaultValue="1" required/></Field><Field label="Notes"><Textarea name="notes"/></Field><Btn disabled={busy}>Request a quote · no charge</Btn></form></Panel></div>}
    </section>}
    {view==="review"&&<div className="stack">{!queue.length&&!loading&&!error&&<Panel>No crafts currently need your review.</Panel>}{queue.map(c=><Panel key={c.id} className="stack"><h2>{c.title}</h2><ProtectedMedia craft={c} token={token}/><p>{c.draft.materials} · {c.draft.region} · {c.draft.length_cm} × {c.draft.width_cm} × {c.draft.height_cm} cm</p><p>{c.draft.description}</p><Payout price={c.price}/><form className="stack" onSubmit={e=>review(e,c)}>{["materials","dimensions","origin","story"].map(check=><label className="check-row" key={check}><input type="checkbox" name="checks" value={check}/>I checked the {check} evidence.</label>)}<Field label="Field notes"><Textarea name="notes" required minLength={10} maxLength={3000}/></Field><Field label="Decision"><select name="decision"><option value="REQUEST_REVISION">Request changes</option><option value="APPROVE">Approve all checks</option><option value="REJECT">Reject</option></select></Field><Btn disabled={busy}>Save review</Btn></form></Panel>)}</div>}
    {view==="orders"&&<div className="stack">{!orders.length&&!loading&&!error&&<Panel>No orders yet.</Panel>}{orders.map(o=><Panel key={o.order_id} className="stack"><div className="row between"><Badge>{o.fulfillment_stage.replaceAll("_"," ")}</Badge><small>{o.network_order_id}</small></div>{o.items.map((i,index)=><h2 key={index}>{i.title} × {i.quantity}</h2>)}<p>Total {money(o.total_amount)} · Maker proceeds {money(o.maker_amount)}</p><p>Delivery: {o.shipping_address}</p><p>Payment: {o.payment_status.replaceAll("_"," ")} · ONDC local sandbox</p>
      {!o.is_seller&&o.status==="PENDING"&&<Btn disabled={busy} onClick={()=>action(async()=>{setPayment(await request<PaymentOrder>("/v1/orders/"+o.order_id+"/payment",token));})}>Resume mock payment</Btn>}
      {!o.is_seller&&["PENDING","PAID"].includes(o.status)&&<Btn tone="secondary" disabled={busy} onClick={()=>action(async()=>{await send("/v1/orders/"+o.order_id+"/cancel",token,{reason:"Cancelled by buyer"});await loadOrders();})}>Cancel order</Btn>}
      {o.is_seller&&["CONFIRMED","PROCESSING","READY_TO_SHIP","SHIPPED"].includes(o.fulfillment_stage)&&<Btn disabled={busy} onClick={()=>action(async()=>{const next={CONFIRMED:"PROCESSING",PROCESSING:"READY_TO_SHIP",READY_TO_SHIP:"SHIPPED",SHIPPED:"DELIVERED"}[o.fulfillment_stage as "CONFIRMED"];await send("/v1/orders/"+o.order_id+"/fulfill?status="+next,token);await loadOrders();})}>Advance to next fulfillment step</Btn>}
      {o.is_seller&&o.status==="DELIVERED"&&<Btn disabled={busy} onClick={()=>action(async()=>{const result=await send<{message:string}>("/v1/orders/"+o.order_id+"/payout",token);toast.success(result.message);})}>Record simulated settlement</Btn>}
    </Panel>)}</div>}
    {view==="messages"&&<div className="two-col"><Panel className="stack"><h2>Messages</h2>{messages.length===0&&<p>No messages yet. Contact a maker from a published craft.</p>}{messages.map(row=><div key={row.id}><h3>{row.title}</h3><small>{row.sender} · {new Date(row.created_at).toLocaleString()}</small><p>{row.body}</p>{row.owner_id!==session?.user.id&&<form className="row" onSubmit={e=>reply(e,row)}><Input aria-label={"Reply about "+row.title} name="body" required maxLength={4000}/><Btn disabled={busy}>Reply</Btn></form>}</div>)}</Panel><Panel className="stack"><h2>Custom requests</h2>{custom.length===0&&<p>No custom requests yet.</p>}{custom.map(row=><div key={row.id}><h3>{row.title}</h3><p>{row.quantity} pieces · {row.dimensions} · {row.finish}</p><Badge>{row.status}</Badge>{row.owner_id!==session?.user.id&&<form className="row" onSubmit={e=>reply(e,row)}><Input name="body" aria-label="Reply to custom request" required/><Btn disabled={busy}>Discuss request</Btn></form>}</div>)}</Panel></div>}
    {view==="reports"&&report&&<Panel className="stack"><p>These figures come from saved records. Simulated settlements are not real artisan income.</p><dl className="spec-table">{Object.entries(report).map(([key,value])=><div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{String(value)}</dd></div>)}</dl><div className="row"><a className="jm-btn secondary" href={API_URL+"/v1/reports/impact.pdf"}>Download PDF</a><a className="jm-btn secondary" href={API_URL+"/v1/reports/impact.pptx"}>Download PowerPoint</a></div></Panel>}
    {view==="account"&&<Panel className="stack"><h2>{session?.user.full_name}</h2><p>{session?.user.email} · {role}</p><p>Ambassador access is assigned by an administrator after onboarding.</p><h3>Remove my craft media and profile data</h3><p>This withdraws your listings and removes your uploaded recordings, photos, and forms. Transaction records and your Supabase sign-in account remain.</p><Field label="Type DELETE MY MEDIA to confirm"><Input value={deletion} onChange={e=>setDeletion(e.target.value)}/></Field><Btn disabled={busy||deletion!=="DELETE MY MEDIA"} onClick={()=>action(async()=>{const result=await send<{status:string}>("/v1/consent/delete-data",token);for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith("jungle-draft-"))localStorage.removeItem(key);}setDeletion("");toast.success("Media and craft profile deletion "+result.status.toLowerCase());})}>Delete my media and withdraw listings</Btn></Panel>}
    </section><MockPaymentGateway key={payment?.order_id||"closed"} order={payment} accessToken={token} onCancel={()=>{setPayment(null);toast.info("Payment closed. Resume payment or cancel the unpaid order from Orders.");}} onPaid={finishPayment}/>
    {!embedded&&<footer style={{padding:24,textAlign:"center"}}>Maker-supplied facts. Human field review. Original stories shared by permission.</footer>}
  </div>;
}

