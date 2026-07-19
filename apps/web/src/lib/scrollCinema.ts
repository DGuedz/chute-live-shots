/* Motor de scroll-cinema: GSAP ScrollTrigger (pin + scrub) dirigindo Canvas de vídeo e
 * timelines de texto/cards a partir de um único progresso de rolagem por seção.
 *
 * Contrato de cue por asset: enterStart → enterEnd → hold → exitStart → exitEnd, todos
 * normalizados em "unidades de timeline" (a timeline inteira da seção soma sua duração
 * total em unidades arbitrárias — usamos 1 unidade = 1% do scrub por convenção abaixo).
 */
import {useEffect, useLayoutEffect, useRef} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

let registered = false;
export function ensureGsapRegistered() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type Cue = {enterStart: number; enterEnd: number; hold?: number; exitStart: number; exitEnd: number};

/** Adiciona um par enter/exit à timeline nas posições absolutas do cue (em segundos-unidade
 * da timeline). `hold` é implícito: o elemento permanece nos toVars entre enterEnd e exitStart. */
export function addCue(
  tl: gsap.core.Timeline,
  target: gsap.TweenTarget,
  cue: Cue,
  fromVars: gsap.TweenVars,
  toVars: gsap.TweenVars,
) {
  tl.fromTo(target, fromVars, {...toVars, duration: Math.max(0.001, cue.enterEnd - cue.enterStart), ease: 'power2.out'}, cue.enterStart);
  tl.to(target, {...fromVars, duration: Math.max(0.001, cue.exitEnd - cue.exitStart), ease: 'power2.in'}, cue.exitStart);
}

/** Desenha o frame atual do <video> num <canvas> em regime "object-fit: cover", num loop de
 * requestAnimationFrame independente do scrub — o scrub só define QUAL frame o vídeo decodifica;
 * o loop garante que o canvas sempre pinte o frame mais recente já decodificado, sem esperar
 * o evento `seeked` (que trava em scrubs rápidos). */
function useCanvasVideoPainter(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current, video = videoRef.current, container = containerRef.current;
    if (!canvas || !video || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    };

    const drawCover = () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return;
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale, dh = vh * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.drawImage(video, dx, dy, dw, dh);
    };

    const loop = () => {
      resize();
      if (video.readyState >= 2) drawCover();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, [active, canvasRef, videoRef, containerRef]);
}

export type VideoScrubSectionOptions = {
  /** true trava a seção na tela durante o scrub (cinematográfico); false deixa rolar normal. */
  pin: boolean;
  /** quantos "vh" de rolagem a seção consome para completar o scrub (ex.: 220 = 2.2x a tela). */
  scrollLength: number;
  /** duração de fallback (s) se o vídeo ainda não expôs `duration` real. */
  fallbackDuration?: number;
};

/**
 * Seção cinematográfica com vídeo em Canvas. Retorna refs para o container, canvas, vídeo
 * escondido e a timeline GSAP da seção — o chamador usa `timelineRef.current` para adicionar
 * cues de texto/cards com `addCue`, todos sincronizados ao mesmo scrub do vídeo.
 */
export function useVideoScrubSection(options: VideoScrubSectionOptions) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = prefersReducedMotion();

  useCanvasVideoPainter(canvasRef, videoRef, sectionRef, !reduced);

  useLayoutEffect(() => {
    ensureGsapRegistered();
    const section = sectionRef.current, video = videoRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (reduced) {
        // Sem scrub: mostra o primeiro frame estático e revela a copy num fade simples ao entrar em vista.
        if (video) {
          const paint = () => {
            video.currentTime = 0;
          };
          if (video.readyState >= 1) paint();
          else video.addEventListener('loadedmetadata', paint, {once: true});
        }
        const tl = gsap.timeline({
          scrollTrigger: {trigger: section, start: 'top 70%', toggleActions: 'play none none reverse'},
        });
        timelineRef.current = tl;
        return;
      }

      const videoProxy = {time: 0};
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: `+=${options.scrollLength}%`,
          scrub: 0.6,
          pin: options.pin,
          pinSpacing: options.pin,
          anticipatePin: 1,
        },
      });
      timelineRef.current = tl;

      if (video) {
        const bindVideoScrub = () => {
          const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (options.fallbackDuration || 8);
          tl.fromTo(
            videoProxy,
            {time: 0},
            {
              time: duration - 0.05,
              duration: 1,
              ease: 'none',
              onUpdate: () => {
                if (Math.abs(video.currentTime - videoProxy.time) > 0.02) video.currentTime = videoProxy.time;
              },
            },
            0,
          );
        };
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) bindVideoScrub();
        else video.addEventListener('loadedmetadata', bindVideoScrub, {once: true});
      }
    }, section);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.pin, options.scrollLength]);

  return {sectionRef, canvasRef, videoRef, timelineRef, reduced};
}

/**
 * Seção narrativa sem vídeo: cards com stagger + parallax discreto, dirigidos por scrub
 * (sem pin) atado à própria altura natural da seção. `timelineRef` recebe cues via `addCue`.
 */
export function useNarrativeScrubSection(scrollLength = 60) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = prefersReducedMotion();

  useLayoutEffect(() => {
    ensureGsapRegistered();
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      if (reduced) {
        const tl = gsap.timeline({
          scrollTrigger: {trigger: section, start: 'top 75%', toggleActions: 'play none none reverse'},
        });
        timelineRef.current = tl;
        return;
      }
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          end: `+=${scrollLength}%`,
          scrub: 0.5,
        },
      });
      timelineRef.current = tl;
    }, section);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLength]);

  return {sectionRef, timelineRef, reduced};
}
