type Direction = 'forward' | 'back';

let direction: Direction = 'forward';

export const setNavDirection = (d: Direction) => { direction = d; };
export const getNavDirection = () => direction;
