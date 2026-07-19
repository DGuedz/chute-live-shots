#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const DEFAULT_CONFIG_PATH = 'config/video-validation.rules.json';
const BUILTIN_CONFIG = {
  version: 1,
  reportPath: 'artifacts/video-validation-report.json',
  profiles: {
    default: {
      maxSizeMb: 35,
      maxKeyframeGapFrames: 24,
      requireFirstFrameKeyframe: true,
      maxWidth: 1920,
      maxHeight: 1080,
      maxBitrateKbps: 12000,
    },
  },
  rules: [],
};

function printHelp() {
  console.log(`Uso:
  node scripts/validate-video-assets.mjs --staged
  node scripts/validate-video-assets.mjs --all
  node scripts/validate-video-assets.mjs --all --write-report
  node scripts/validate-video-assets.mjs <arquivo1.mp4> <arquivo2.mov>

Flags:
  --staged        Valida apenas vídeos staged para commit (padrão).
  --all           Valida todos os vídeos rastreados pelo git.
  --json          Retorna relatório em JSON no stdout.
  --write-report  Persiste o relatório JSON versionável no caminho configurado.
  --report-path   Sobrescreve o caminho de saída do relatório.
  --config        Sobrescreve o caminho do arquivo de regras.
  --help          Mostra esta ajuda.
`);
}

function parseArgs(argv) {
  const flags = new Set();
  const files = [];
  let reportPath = null;
  let configPath = DEFAULT_CONFIG_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report-path') {
      reportPath = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg === '--config') {
      configPath = argv[index + 1] || DEFAULT_CONFIG_PATH;
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) flags.add(arg);
    else files.push(arg);
  }

  return {
    json: flags.has('--json'),
    help: flags.has('--help'),
    all: flags.has('--all'),
    staged: flags.has('--staged') || (!flags.has('--all') && files.length === 0),
    writeReport: flags.has('--write-report'),
    reportPath,
    configPath,
    files,
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(stderr || stdout || `${command} falhou com código ${result.status}.`);
  }

  return result.stdout.trim();
}

function checkFfprobe() {
  try {
    run('ffprobe', ['-version']);
  } catch {
    console.error('ERRO: `ffprobe` não está disponível no ambiente. Instale FFmpeg/ffprobe antes do commit.');
    process.exit(2);
  }
}

function isVideoFile(filePath) {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function unique(items) {
  return [...new Set(items)];
}

function listTrackedVideos() {
  const output = run('git', ['ls-files']);
  return output.split('\n').map((line) => line.trim()).filter(Boolean).filter(isVideoFile);
}

function listStagedVideos() {
  const output = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return output.split('\n').map((line) => line.trim()).filter(Boolean).filter(isVideoFile);
}

function loadConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) return BUILTIN_CONFIG;
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    ...BUILTIN_CONFIG,
    ...parsed,
    profiles: {
      ...BUILTIN_CONFIG.profiles,
      ...(parsed.profiles || {}),
    },
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
  };
}

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function matchesRule(filePath, rule) {
  const normalized = normalizeRelativePath(filePath);
  if (rule.directory) {
    const normalizedDirectory = normalizeRelativePath(rule.directory).replace(/\/$/, '');
    if (!(normalized === normalizedDirectory || normalized.startsWith(`${normalizedDirectory}/`))) {
      return false;
    }
  }
  if (rule.filenamePattern) {
    const pattern = new RegExp(rule.filenamePattern, 'i');
    if (!pattern.test(path.basename(normalized))) return false;
  }
  return true;
}

function pickProfile(filePath, config) {
  for (const rule of config.rules) {
    if (matchesRule(filePath, rule)) {
      const profile = config.profiles[rule.profile];
      if (!profile) {
        throw new Error(`Perfil ausente na configuração: ${rule.profile}`);
      }
      return {name: rule.profile, ...profile};
    }
  }
  return {name: 'default', ...config.profiles.default};
}

function parseFps(value) {
  if (!value || typeof value !== 'string') return 0;
  const [num, den] = value.split('/').map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFrames(value) {
  return Number.isFinite(value) ? value.toFixed(2) : 'n/a';
}

function ffprobeVideo(filePath) {
  const raw = run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,avg_frame_rate,duration,width,height,bit_rate',
    '-show_entries',
    'format=duration,bit_rate',
    '-skip_frame',
    'nokey',
    '-show_entries',
    'frame=best_effort_timestamp_time',
    '-of',
    'json',
    filePath,
  ]);
  return JSON.parse(raw);
}

function validateVideo(filePath, config) {
  const profile = pickProfile(filePath, config);
  const absolutePath = path.resolve(filePath);
  const stat = fs.statSync(absolutePath);
  const probe = ffprobeVideo(absolutePath);
  const stream = probe.streams?.[0];

  if (!stream) {
    return {
      file: filePath,
      ok: false,
      profile: profile.name,
      errors: ['Nenhum stream de vídeo encontrado.'],
      warnings: [],
    };
  }

  const fps = parseFps(stream.avg_frame_rate);
  const duration = toNumber(stream.duration || probe.format?.duration);
  const bitrateKbps = toNumber(stream.bit_rate || probe.format?.bit_rate) / 1000;
  const keyframes = (probe.frames || [])
    .map((frame) => toNumber(frame.best_effort_timestamp_time))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const errors = [];
  const warnings = [];
  const sizeMb = stat.size / (1024 * 1024);

  if (profile.maxSizeMb && sizeMb > profile.maxSizeMb) {
    errors.push(`Peso ${sizeMb.toFixed(2)} MB acima do limite ${profile.maxSizeMb} MB para o perfil ${profile.name}.`);
  }
  if (profile.maxWidth && toNumber(stream.width) > profile.maxWidth) {
    errors.push(`Largura ${stream.width}px acima do limite ${profile.maxWidth}px para o perfil ${profile.name}.`);
  }
  if (profile.maxHeight && toNumber(stream.height) > profile.maxHeight) {
    errors.push(`Altura ${stream.height}px acima do limite ${profile.maxHeight}px para o perfil ${profile.name}.`);
  }
  if (profile.maxBitrateKbps && bitrateKbps > profile.maxBitrateKbps) {
    errors.push(`Bitrate ${bitrateKbps.toFixed(0)} kbps acima do limite ${profile.maxBitrateKbps} kbps para o perfil ${profile.name}.`);
  }
  if (keyframes.length === 0) {
    errors.push('Nenhum keyframe detectado pelo ffprobe.');
  }

  const firstKeyframeAt = keyframes[0] ?? null;
  if (profile.requireFirstFrameKeyframe && firstKeyframeAt !== null && firstKeyframeAt > 0.001) {
    errors.push(`Primeiro keyframe começa em ${firstKeyframeAt.toFixed(3)}s; o ideal é frame 0.`);
  }

  const gapSamples = [];
  for (let index = 1; index < keyframes.length; index += 1) {
    gapSamples.push(keyframes[index] - keyframes[index - 1]);
  }
  if (duration > 0 && keyframes.length > 0) {
    gapSamples.push(Math.max(0, duration - keyframes[keyframes.length - 1]));
  }

  const maxGapSeconds = gapSamples.length ? Math.max(...gapSamples) : 0;
  const maxGapFrames = fps > 0 ? maxGapSeconds * fps : Number.POSITIVE_INFINITY;

  if (profile.maxKeyframeGapFrames && Number.isFinite(maxGapFrames) && maxGapFrames > profile.maxKeyframeGapFrames) {
    errors.push(
      `Gap máximo entre keyframes = ${formatFrames(maxGapFrames)} frames; limite do perfil ${profile.name} = ${profile.maxKeyframeGapFrames} frames.`,
    );
  }
  if (fps === 0) {
    warnings.push('FPS não pôde ser calculado com precisão; revise o encode se o arquivo for para scroll-scrub.');
  }
  if (!bitrateKbps) {
    warnings.push('Bitrate não informado pelo ffprobe; valide o encode manualmente se este asset for crítico.');
  }

  return {
    file: filePath,
    ok: errors.length === 0,
    profile: profile.name,
    policy: profile,
    codec: stream.codec_name || 'unknown',
    width: stream.width || null,
    height: stream.height || null,
    duration,
    fps,
    bitrateKbps,
    sizeBytes: stat.size,
    sizeMb,
    keyframes: keyframes.length,
    firstKeyframeAt,
    maxGapFrames,
    errors,
    warnings,
  };
}

function resolveTargets(options) {
  if (options.all) return listTrackedVideos();
  if (options.files.length > 0) return unique(options.files.filter(isVideoFile));
  return listStagedVideos();
}

function printTextReport(results) {
  for (const result of results) {
    const status = result.ok ? 'OK' : 'FAIL';
    console.log(`${status} ${result.file}`);
    console.log(
      `  perfil=${result.profile} codec=${result.codec} size=${result.sizeMb.toFixed(2)}MB bitrate=${result.bitrateKbps.toFixed(0)}kbps resolucao=${result.width}x${result.height} keyframes=${result.keyframes} max_gap_frames=${formatFrames(result.maxGapFrames)}`,
    );
    for (const warning of result.warnings) console.log(`  warn: ${warning}`);
    for (const error of result.errors) console.log(`  erro: ${error}`);
  }
}

function writeReport(reportPath, report) {
  const absolutePath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
}

function buildEmptyReport(message, config) {
  return {
    ok: true,
    checked: 0,
    configVersion: config.version,
    generatedAt: new Date().toISOString(),
    message,
    results: [],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  checkFfprobe();
  const config = loadConfig(options.configPath);
  const targets = resolveTargets(options).filter((filePath) => fs.existsSync(path.resolve(filePath)));

  if (targets.length === 0) {
    const emptyReport = buildEmptyReport('Nenhum vídeo staged para validar.', config);
    if (options.writeReport) writeReport(options.reportPath || config.reportPath, emptyReport);
    if (options.json) console.log(JSON.stringify(emptyReport, null, 2));
    else console.log(emptyReport.message);
    return;
  }

  const results = targets.map((target) => validateVideo(target, config));
  const ok = results.every((result) => result.ok);
  const report = {
    ok,
    checked: results.length,
    configVersion: config.version,
    generatedAt: new Date().toISOString(),
    configPath: normalizeRelativePath(options.configPath),
    reportPath: normalizeRelativePath(options.reportPath || config.reportPath),
    results,
  };

  if (options.writeReport) {
    writeReport(options.reportPath || config.reportPath, report);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(results);
    console.log(ok ? `PASS ${results.length} vídeo(s) validados.` : `BLOCK ${results.length} vídeo(s) inspecionados; ajuste os arquivos antes do commit.`);
  }

  if (!ok) process.exit(1);
}

main();
