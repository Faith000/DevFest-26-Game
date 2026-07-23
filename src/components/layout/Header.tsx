"use client";

import Link from"next/link";
import Image from"next/image";
import { useState } from"react";
import { site } from"@/config/site";
import { track } from"@/services/analytics";

const NAV = [
 { href:"/play", label:"PLAY" },
 { href:"/leaderboard", label:"LEADERBOARD" },
];

export function Header() {
 const [open, setOpen] = useState(false);

 return (
 <header className="sticky top-0 z-40 border-b border-ink/12 bg-paper/85 backdrop-blur-md">
 <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
 <Link href="/" className="group flex items-center" aria-label="DevFest Lagos home">
 <Image
 src="/devfest-logo.svg"
 alt="DevFest Lagos"
 width={137}
 height={18}
 priority
 className="h-6 w-auto"
 />
 </Link>

 <nav className="hidden items-center gap-6 sm:flex" aria-label="Main">
 {NAV.map((n) => (
 <Link key={n.href} href={n.href} className="df-label hover:text-core-red">
 {n.label}
 </Link>
 ))}
 <a
 href={site.officialUrl}
 target="_blank"
 rel="noopener noreferrer"
 onClick={() => track("devfest_link_clicked", { from:"header" })}
 className="df-label hover:text-core-red"
 >
 DEVFEST SITE ↗
 </a>
 <Link href="/play" className="df-btn df-btn-accent px-4 py-2 text-sm">
 Start Driving
 </Link>
 </nav>

 <button
 className="flex h-10 w-10 flex-col items-center justify-center gap-1 border-2 border-ink bg-surface df-shadow sm:hidden"
 aria-expanded={open}
 aria-controls="mobile-nav"
 aria-label="Menu"
 onClick={() => setOpen(!open)}
 >
 <span className={`h-0.5 w-5 bg-ink transition-transform ${open ?"translate-y-1.5 rotate-45" :""}`} />
 <span className={`h-0.5 w-5 bg-ink ${open ?"opacity-0" :""}`} />
 <span className={`h-0.5 w-5 bg-ink transition-transform ${open ?"-translate-y-1.5 -rotate-45" :""}`} />
 </button>
 </div>

 {open && (
 <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ink/12 bg-surface sm:hidden">
 <ul>
 {NAV.map((n) => (
 <li key={n.href} className="border-b border-ink/10">
 <Link
 href={n.href}
 onClick={() => setOpen(false)}
 className="df-label block px-5 py-4"
 >
 {n.label}
 </Link>
 </li>
 ))}
 <li className="border-b border-ink/10">
 <a
 href={site.officialUrl}
 target="_blank"
 rel="noopener noreferrer"
 onClick={() => track("devfest_link_clicked", { from:"header" })}
 className="df-label block px-5 py-4"
 >
 DEVFEST SITE ↗
 </a>
 </li>
 <li className="p-4">
 <Link
 href="/play"
 onClick={() => setOpen(false)}
 className="df-btn df-btn-accent w-full"
 >
 Start Driving
 </Link>
 </li>
 </ul>
 </nav>
 )}
 </header>
 );
}
