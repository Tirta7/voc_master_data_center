"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  return (
    <header className="main-header">
      <div className="header-container">
        <Link href="/" className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          ProductDocs
        </Link>
        
        {/* Desktop Nav */}
        <nav className="nav-links desktop-only">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/updates" className="nav-link">Updates</Link>
          <Link href="/manual" className="nav-link">Manual Book</Link>
        </nav>
        <div className="desktop-only">
          <button className="btn-primary">Download App</button>
        </div>

        {/* Mobile Menu Label (acts as button) */}
        <label 
          htmlFor="mobile-menu-toggle"
          className="mobile-menu-btn"
          style={{ padding: '0.5rem', cursor: 'pointer', zIndex: 60, position: 'relative' }}
        >
          <svg style={{ pointerEvents: 'none' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </label>
      </div>

      {/* Pure CSS Checkbox for Toggle */}
      <input type="checkbox" id="mobile-menu-toggle" className="mobile-menu-checkbox" />

      {/* Mobile Nav Overlay */}
      <div className="mobile-nav">
        <Link 
          href="/" 
          className="nav-link" 
          onClick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}
        >
          Home
        </Link>
        <Link 
          href="/updates" 
          className="nav-link" 
          onClick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}
        >
          Updates
        </Link>
        <Link 
          href="/manual" 
          className="nav-link" 
          onClick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}
        >
          Manual Book
        </Link>
        <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Download App</button>
      </div>
    </header>
  );
}
