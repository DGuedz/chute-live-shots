/** Node globals exigidos por @coral-xyz/anchor e @solana/spl-token no navegador.
 * Deve ser o primeiro import de main.tsx para executar antes dessas libs. */
import {Buffer} from 'buffer';

const g=globalThis as Record<string,unknown>;
if(!g.Buffer)g.Buffer=Buffer;
if(!g.process)g.process={env:{}};
