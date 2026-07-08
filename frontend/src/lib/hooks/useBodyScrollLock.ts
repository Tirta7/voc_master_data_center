import { useEffect } from 'react';

// Global state to handle multiple stacked modals properly
let lockCount = 0;
let originalStyle = '';
let originalHtmlStyle = '';
let touchStartY = 0;

const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
};

const handleTouchMove = (e: TouchEvent) => {
    let target = e.target as HTMLElement | null;
    let shouldAllowScroll = false;
    
    while (target && target !== document.body && target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowX === 'auto' || style.overflowX === 'scroll') {
            const isScrollableY = target.scrollHeight > target.clientHeight;
            const isScrollableX = target.scrollWidth > target.clientWidth;
            
            if (isScrollableY || isScrollableX) {
                const touchY = e.touches[0].clientY;
                const isScrollingUp = touchY > touchStartY; // Dragging down
                const isScrollingDown = touchY < touchStartY; // Dragging up

                const isAtTop = target.scrollTop <= 0;
                const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;

                if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                    // Prevent scroll at boundaries to stop rubber-banding bubbling to body
                    shouldAllowScroll = false;
                } else {
                    shouldAllowScroll = true;
                }
                break;
            }
        }
        target = target.parentElement;
    }

    if (!shouldAllowScroll && e.cancelable) {
        e.preventDefault();
    }
};

export const useBodyScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) return;

        if (lockCount === 0) {
            originalStyle = document.body.style.overflow;
            originalHtmlStyle = document.documentElement.style.overflow;

            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            // Add non-passive event listeners to block touch scroll bubbling
            document.addEventListener('touchstart', handleTouchStart, { passive: true });
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
        }
        
        lockCount++;

        return () => {
            lockCount = Math.max(0, lockCount - 1);

            if (lockCount === 0) {
                document.body.style.overflow = originalStyle;
                document.documentElement.style.overflow = originalHtmlStyle;
                
                document.removeEventListener('touchstart', handleTouchStart);
                document.removeEventListener('touchmove', handleTouchMove);
            }
        };
    }, [isLocked]);
};
