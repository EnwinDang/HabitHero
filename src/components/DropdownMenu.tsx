import React, { useState, cloneElement, Children, useEffect, useRef } from 'react';

interface DropdownMenuProps {
  children: React.ReactNode;
  trigger: React.ReactElement;
}

export function DropdownMenu({ children, trigger }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [triggerRect, setTriggerRect] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setTriggerRect(null);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      // Get trigger button position for fixed positioning
      const rect = e.currentTarget.getBoundingClientRect();
      setTriggerRect({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTriggerRect(null);
  };

  // Clone trigger to add click handler
  const triggerWithClick = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      handleToggle(e);
      // Call original onClick if it exists
      if (trigger.props && typeof trigger.props === 'object' && 'onClick' in trigger.props) {
        const onClick = (trigger.props as any).onClick;
        if (typeof onClick === 'function') {
          onClick(e);
        }
      }
    },
  } as any);

  // Clone children to add close handler
  const childrenWithClose = Children.map(children, (child) => {
    if (child && typeof child === 'object' && 'type' in child) {
      return cloneElement(child as React.ReactElement, { onItemClick: handleClose } as any);
    }
    return child;
  });

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {triggerWithClick}
      {isOpen && triggerRect && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
            onClick={handleClose}
          />
          <div
            style={{
              position: 'fixed',
              top: `${triggerRect.top}px`,
              right: `${triggerRect.right}px`,
              zIndex: 1000,
              background: '#fff',
              border: '1px solid var(--hh-border)',
              borderRadius: 8,
              boxShadow: 'var(--hh-shadow)',
              minWidth: 160,
              padding: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {childrenWithClose}
          </div>
        </>
      )}
    </div>
  );
}

