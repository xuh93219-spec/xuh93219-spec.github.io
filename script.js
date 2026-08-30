const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');

function updateBridgeParallax() {
  if (!hero || reduceMotion.matches) return;
  const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
  hero.style.setProperty('--bridge-shift', `${progress * 12}px`);
}

window.addEventListener('scroll', updateBridgeParallax, { passive: true });
reduceMotion.addEventListener('change', () => {
  hero?.style.setProperty('--bridge-shift', '0px');
  updateBridgeParallax();
});
updateBridgeParallax();

// Preserve the approved drawing while moving the water through its control points.
// A travelling wave makes the river visibly flow instead of sliding a few pixels.
const rivers = [...document.querySelectorAll('.river')].map((path, index) => {
  const original = path.getAttribute('d');
  return { path, index, original, coordinates: original.match(/-?\d+(?:\.\d+)?/g).map(Number) };
});
const boat = document.querySelector('.boat');
const supportingRiver = rivers.find(({ path }) => path.classList.contains('river--two'));

// Locate fixed positions on the existing cubic river path once. Reusing the
// curve's weights keeps the boat tied to the rendered water, not a second timer.
function waterSupport(coordinates, x) {
  for (let i = 2; i + 5 < coordinates.length; i += 6) {
    if (x < coordinates[i - 2] || x > coordinates[i + 4]) continue;
    const indices = [i - 1, i + 1, i + 3, i + 5];
    let low = 0, high = 1;
    for (let n = 0; n < 32; n++) {
      const t = (low + high) / 2, u = 1 - t;
      const sampleX = u ** 3 * coordinates[i - 2] + 3 * u ** 2 * t * coordinates[i]
        + 3 * u * t ** 2 * coordinates[i + 2] + t ** 3 * coordinates[i + 4];
      if (sampleX < x) low = t; else high = t;
    }
    const t = (low + high) / 2, u = 1 - t;
    const weights = [u ** 3, 3 * u ** 2 * t, 3 * u * t ** 2, t ** 3];
    const height = values => indices.reduce((sum, index, n) => sum + values[index] * weights[n], 0);
    return { height, baseline: height(coordinates) };
  }
  return null;
}
const boatSupports = supportingRiver && [820, 1110].map(x => waterSupport(supportingRiver.coordinates, x));

function followWater() {
  if (!boat || !boatSupports?.every(Boolean)) return;
  const [left, right] = boatSupports.map(({ height, baseline }) => height(supportingRiver.current) - baseline);
  const lift = (left + right) / 2;
  const tilt = Math.max(-2.5, Math.min(2.5, Math.atan2(right - left, 290) * 180 / Math.PI));
  boat.style.setProperty('--boat-lift', `${lift.toFixed(3)}px`);
  boat.style.setProperty('--boat-tilt', `${tilt.toFixed(3)}deg`);
}
let riverFrame = 0;
let heroInView = true;
let riverTime = 0;
let lastRiverFrame = 0;

function animateRiver(now) {
  riverTime += lastRiverFrame ? Math.min(now - lastRiverFrame, 40) : 0;
  lastRiverFrame = now;
  const phase = riverTime / 1000 * 1.15;
  rivers.forEach((river) => {
    const { path, index, original, coordinates } = river;
    river.current = [...coordinates];
    let coordinateIndex = 0;
    path.setAttribute('d', original.replace(/-?\d+(?:\.\d+)?/g, () => {
      const i = coordinateIndex++;
      if (i % 2 === 0) return coordinates[i];
      const x = coordinates[i - 1];
      const wave = Math.sin(x / 260 - phase + index * 1.2) * 13
        + Math.sin(x / 140 + phase * .65 + index) * 4;
      // Let the short lower line settle before its endpoint, preserving the
      // finance caption's clearance even at the widest viewport and wave crest.
      const taper = index === 2 ? Math.min(1, Math.max(0, (1302 - x) / 172)) : 1;
      river.current[i] = Number((coordinates[i] + wave * taper).toFixed(2));
      return river.current[i];
    }));
  });
  followWater();
  riverFrame = requestAnimationFrame(animateRiver);
}

function syncRiverMotion() {
  cancelAnimationFrame(riverFrame);
  lastRiverFrame = 0;
  if (reduceMotion.matches) {
    rivers.forEach(({ path, original }) => path.setAttribute('d', original));
    boat?.style.removeProperty('--boat-lift');
    boat?.style.removeProperty('--boat-tilt');
  } else if (heroInView && !document.hidden && rivers.length) {
    riverFrame = requestAnimationFrame(animateRiver);
  }
}
if (hero && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting && entry.intersectionRatio > .001;
    syncRiverMotion();
  }, { threshold: .001 }).observe(hero);
}
document.addEventListener('visibilitychange', syncRiverMotion);
reduceMotion.addEventListener('change', syncRiverMotion);
syncRiverMotion();

if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');
  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('is-visible');
        observer.unobserve(target);
      }
    });
  }, { threshold: .15 });
  document.querySelectorAll('.section').forEach((section) => sectionObserver.observe(section));
}
