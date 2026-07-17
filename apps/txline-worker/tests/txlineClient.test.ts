import {describe, expect, it} from 'vitest';
import {loadConfig} from '../src/config.js';

describe('TxLINE worker configuration', () => {
  it('uses matching devnet defaults', () => {
    const config = loadConfig({});
    expect(config.network).toBe('devnet');
    expect(config.apiOrigin).toBe('https://txline-dev.txodds.com');
    expect(config.programId).toBe('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
  });
  it('blocks data calls without activated credentials', () => {
    const config = loadConfig({});
    expect(config.jwt).toBeUndefined();
    expect(config.apiToken).toBeUndefined();
  });
});
