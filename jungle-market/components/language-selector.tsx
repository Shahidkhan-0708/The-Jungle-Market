"use client";
import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export default function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-block text-left ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '4px 10px' : '6px 14px',
          borderRadius: '20px',
          backgroundColor: '#0E4C3A',
          color: '#FAF7EE',
          border: '1px solid #1c6d54',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={15} style={{ color: '#C99A45' }} />
        <span>{currentLanguage.nativeName}</span>
        <ChevronDown size={13} style={{ opacity: 0.8, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: '240px',
              maxHeight: '340px',
              overflowY: 'auto',
              backgroundColor: '#FAF7EE',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              border: '1px solid #E6DEC8',
              padding: '6px',
              zIndex: 999,
            }}
          >
            <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid #E6DEC8', fontSize: '11px', fontWeight: 'bold', color: '#835331', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('select_language', 'Select Language')}
            </div>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: active ? '#E8F8E7' : 'transparent',
                    color: active ? '#004525' : '#0A3D2E',
                    fontWeight: active ? '600' : '400',
                    fontSize: '13px',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: active ? '700' : '500' }}>{lang.nativeName}</span>
                    <span style={{ fontSize: '11px', color: '#526259' }}>{lang.name} · {lang.region}</span>
                  </div>
                  {active && <Check size={16} color="#059669" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
