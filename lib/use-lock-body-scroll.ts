'use client'

import { useEffect } from 'react'

// Locks page scroll while a full-screen modal/overlay is mounted. Without this, the
// background page stays interactive/scrollable behind a `fixed inset-0` overlay, which on
// some browsers lets background content (buttons, etc.) visually bleed through the modal.
export function useLockBodyScroll(locked: boolean = true) {
  useEffect(() => {
    if (!locked) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [locked])
}
