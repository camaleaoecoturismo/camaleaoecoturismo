import { motion } from 'framer-motion';
import { getNavDirection } from '@/lib/navigationDirection';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const dir = getNavDirection();
  return (
    <motion.div
      initial={{ x: dir === 'back' ? '-100%' : '100%' }}
      animate={{ x: 0 }}
      exit={{ x: dir === 'back' ? '100%' : '-100%' }}
      transition={{ type: 'tween', duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}
