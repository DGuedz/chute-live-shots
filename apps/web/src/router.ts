export type AppRoute =
  | { kind: 'home'; showIntro: boolean }
  | { kind: 'setup'; walletQr: boolean }
  | { kind: 'match'; fixtureId: string }
  | { kind: 'quiz'; quizId: string }
  | { kind: 'result'; quizId: string }
  | { kind: 'icons' };

const DEFAULT_FIXTURE_ID = 'argentina-spain';

function safeSegment(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? encodeURIComponent(trimmed) : encodeURIComponent(fallback);
}

export function homeRoute(options?: { showIntro?: boolean }): AppRoute {
  return { kind: 'home', showIntro: Boolean(options?.showIntro) };
}

export function setupRoute(options?: { walletQr?: boolean }): AppRoute {
  return { kind: 'setup', walletQr: Boolean(options?.walletQr) };
}

export function matchRoute(fixtureId = DEFAULT_FIXTURE_ID): AppRoute {
  return { kind: 'match', fixtureId };
}

export function quizRoute(quizId: string): AppRoute {
  return { kind: 'quiz', quizId };
}

export function resultRoute(quizId: string): AppRoute {
  return { kind: 'result', quizId };
}

export function iconsRoute(): AppRoute {
  return { kind: 'icons' };
}

export function routeToHref(route: AppRoute): string {
  switch (route.kind) {
    case 'home':
      return route.showIntro ? '/?show-intro=1' : '/';
    case 'setup':
      return route.walletQr ? '/setup?wallet=qr' : '/setup';
    case 'match':
      return `/match/${safeSegment(route.fixtureId, DEFAULT_FIXTURE_ID)}`;
    case 'quiz':
      return `/quiz/${safeSegment(route.quizId, 'unknown')}`;
    case 'result':
      return `/result/${safeSegment(route.quizId, 'unknown')}`;
    case 'icons':
      return '/icons';
  }
}

export function parseRoute(current: Location = window.location): AppRoute {
  const url = new URL(current.href);
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 0) {
    return homeRoute({ showIntro: url.searchParams.has('show-intro') });
  }
  if (segments[0] === 'setup') {
    return setupRoute({ walletQr: url.searchParams.get('wallet') === 'qr' });
  }
  if (segments[0] === 'match') {
    return matchRoute(segments[1] || DEFAULT_FIXTURE_ID);
  }
  if (segments[0] === 'quiz' && segments[1]) {
    return quizRoute(segments[1]);
  }
  if (segments[0] === 'result' && segments[1]) {
    return resultRoute(segments[1]);
  }
  if (segments[0] === 'icons') {
    return iconsRoute();
  }
  return homeRoute();
}
