'use client';

import { useEffect } from 'react';
import { logSecurityEvent } from '@/app/actions/security';
import { usePathname } from 'next/navigation';
import { useWatermark } from './WatermarkProvider';

export default function SecurityGuard() {
  const pathname = usePathname();
  const { userRole } = useWatermark();

  useEffect(() => {
    // Basic "Blur on Focus Loss" - effective against Snipping Tool users who click away
    const handleBlur = () => {
       // Only apply if checking out specific secure pages? Or global?
       // Client wants "Where blocking is not possible... obscure".
       // We'll apply global for now.
       document.body.classList.add('secure-blur');
    };

    const handleFocus = () => {
        document.body.classList.remove('secure-blur');
    };

    // PrintScreen Detection
    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && e.key === '4')) {
         
         // 1. Immediately Log
         console.warn('Security Alert: Screenshot attempt detected');
         await logSecurityEvent('SCREENSHOT_ATTEMPT', { 
            path: pathname, 
            key: e.key,
            role: userRole 
         });
         
         // 2. Alert User
         alert('Security Watchdog:\nUnauthorised screen capture attempt detected and logged.\nThis incident has been reported to the administrator.');
      }
    };
    
    // Disable Right Click Globally
    const handleContextMenu = (e: MouseEvent) => {
        // Allow ONLY on inputs (so they can paste)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.body.classList.remove('secure-blur');
    };
  }, [pathname, userRole]);

  return null;
}
