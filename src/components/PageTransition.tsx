import { motion } from 'framer-motion';
import { getNavDirection } from '@/lib/navigationDirection';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const isForward = getNavDirection() === 'forward';

  return (
    <motion.div
      initial={{ x: isForward ? '100%' : 0, opacity: isForward ? 1 : 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: isForward ? 0 : '100%', opacity: isForward ? 0 : 1 }}
      transition={{ type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}
