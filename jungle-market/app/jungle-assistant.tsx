"use client";
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Leaf, ShieldCheck, Plus, RefreshCw } from 'lucide-react';
import { Btn, Badge, money } from './jungle-market';

export default function JungleAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
      {isOpen && (
        <div style={{
          width: '380px',
          height: '600px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #eaeaea'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderBottom: '1px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Leaf size={18} color="#2e7d32" /> Jungle AI Guide
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                <p>Hello! I can help you find authentic crafts.</p>
                <p>Try asking: <i>"Show me terracotta decor under ₹1000"</i></p>
              </div>
            )}
            
            {messages.map((m: any) => {
              const textContent = m.content || m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
              const toolInvocations = m.toolInvocations || m.parts?.filter((p: any) => p.type?.startsWith('tool-') || p.type === 'tool-invocation') || [];

              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {textContent && (
                    <div style={{
                      backgroundColor: m.role === 'user' ? '#1a1a1a' : '#f0f0f0',
                      color: m.role === 'user' ? 'white' : 'black',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      borderBottomRightRadius: m.role === 'user' ? '4px' : '12px',
                      borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '12px',
                      lineHeight: '1.5'
                    }}>
                      {textContent}
                    </div>
                  )}
                  
                  {/* Generative UI for Tools */}
                  {toolInvocations.map((toolInvocation: any, tIdx: number) => {
                    const toolCallId = toolInvocation.toolCallId || String(tIdx);
                    const toolName = toolInvocation.toolName || (toolInvocation.type?.replace('tool-', ''));
                    const isResult = toolInvocation.state === 'result' || toolInvocation.state === 'output-available';
                    const result = toolInvocation.result || toolInvocation.output;
                    
                    if (toolName === 'searchCrafts') {
                      if (isResult && Array.isArray(result)) {
                        return (
                          <div key={toolCallId} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Found these crafts:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                              {result.map((craft: any) => (
                                <article key={craft.id} className="product-card" style={{ margin: 0, padding: '12px' }}>
                                  <div className="product-photo" style={{ height: '140px' }}>
                                    <img src={craft.image_uri} alt={craft.title} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                                    <Badge style={{ top: 8, left: 8 }}><ShieldCheck size={13}/>AI Reviewed</Badge>
                                  </div>
                                  <div style={{ marginTop: '12px' }}>
                                    <span className="eyebrow" style={{ fontSize: '11px' }}>{craft.category}</span>
                                    <h4 style={{ margin: '4px 0', fontSize: '15px' }}>{craft.title}</h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>by {craft.artisan} · {craft.region}</p>
                                    <div className="row between" style={{ marginTop: '8px' }}>
                                      <strong className="price">{money(craft.price)}</strong>
                                      <Btn tone="ghost" aria-label="View" style={{ padding: '4px 8px' }}><Plus size={16} /></Btn>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={toolCallId} style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px', fontSize: '13px', color: '#666', border: '1px dashed #ccc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <RefreshCw className="animate-spin" size={14} /> Searching Jungle Market...
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#f0f0f0', padding: '12px 16px', borderRadius: '12px' }}>
                <span className="dot-typing">...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} style={{ padding: '16px', borderTop: '1px solid #eaeaea', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What are you looking for?"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #ccc', outline: 'none' }}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              style={{ 
                backgroundColor: input.trim() ? '#1a1a1a' : '#ccc', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50%', 
                width: '40px', 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed'
              }}>
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
