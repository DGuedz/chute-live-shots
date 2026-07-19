import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type TextDepthConfig = {
  trigger: HTMLElement;
  depthAmount?: number;
  scaleAmount?: number;
  opacityShift?: number;
  start?: string;
  end?: string;
  scrubSpeed?: number;
};

/** Aplica efeito de profundidade 3D em textos com scroll parallax sincronizado.
 * Cada elemento filho recebe um z-index e parallax baseado na profundidade relativa. */
export function apply3DTextDepth(config: TextDepthConfig): gsap.Context {
  const {
    trigger,
    depthAmount = 50,
    scaleAmount = 0.15,
    opacityShift = 0.3,
    start = 'top center',
    end = 'bottom center',
    scrubSpeed = 0.5,
  } = config;

  return gsap.context(() => {
    const headings = trigger.querySelectorAll('h1, h2, h3');
    const paragraphs = trigger.querySelectorAll('p');
    const kickers = trigger.querySelectorAll('.web-kicker');

    // Kickers: first layer (closest to viewer, most movement)
    kickers.forEach((el, idx) => {
      gsap.fromTo(
        el as HTMLElement,
        {
          z: -depthAmount * 2,
          opacity: 0.4,
          scale: 1 - scaleAmount * 0.5,
        },
        {
          z: depthAmount,
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger,
            start,
            end,
            scrub: scrubSpeed,
            markers: false,
          },
        }
      );
    });

    // Headings: middle layer (main text)
    headings.forEach((el, idx) => {
      gsap.fromTo(
        el as HTMLElement,
        {
          z: -depthAmount * 1.5,
          opacity: 0.6,
          scale: 1 - scaleAmount * 0.3,
        },
        {
          z: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger,
            start,
            end,
            scrub: scrubSpeed,
            markers: false,
          },
        }
      );
    });

    // Paragraphs: background layer (less movement)
    paragraphs.forEach((el, idx) => {
      gsap.fromTo(
        el as HTMLElement,
        {
          z: -depthAmount,
          opacity: 0.5 + opacityShift,
          scale: 1 - scaleAmount,
        },
        {
          z: -depthAmount * 0.5,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger,
            start,
            end,
            scrub: scrubSpeed,
            markers: false,
          },
        }
      );
    });

    // Enable 3D perspective on trigger
    gsap.set(trigger, {perspective: 1200});
  }, trigger);
}

/** Reset 3D depth effect para fallback em prefers-reduced-motion */
export function reset3DTextDepth(trigger: HTMLElement) {
  gsap.set(trigger.querySelectorAll('h1, h2, h3, p, .web-kicker'), {
    z: 0,
    opacity: 1,
    scale: 1,
    perspective: 'none',
  });
}
