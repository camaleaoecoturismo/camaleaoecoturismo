import { motion, useIsPresent } from 'framer-motion';
import { getNavDirection } from '@/lib/navigationDirection';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const isPresent = useIsPresent();
  const isForward = getNavDirection() === 'forward';

  // Forward: new page slides in from right ON TOP of current page (which stays still)
  // Back:    current page slides out to the right, revealing the page underneath
  return (
    <motion.div
      initial={{ x: isForward ? '100%' : 0 }}
      animate={{ x: 0 }}
      exit={{ x: isForward ? 0 : '100%' }}
      transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        minHeight: '100vh',
        // Entering forward page sits on top; exiting back page sits on top
        zIndex: isPresent
          ? (isForward ? 2 : 1)
          : (isForward ? 1 : 2),
        overflowX: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
}
