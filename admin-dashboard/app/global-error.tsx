'use client';

import { useEffect } from 'react';

/**
 * Global error boundary do Next.js App Router.
 *
 * Caso especial: ChunkLoadError acontece quando o navegador tem o HTML antigo
 * em cache (apontando pra chunk JS com hash X), mas a Vercel redeployou e o
 * chunk X foi removido. Isso retorna 404 ao tentar carregar o chunk →
 * ChunkLoadError aborta a navegação.
 *
 * Solução: detectar e recarregar a página sozinho. O usuário não vê erro,
 * só uma micro-piscada e a versão nova aparece.
 *
 * Outros erros: mostra fallback amigável + botão de retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message);

  useEffect(() => {
    if (isChunkError && typeof window !== 'undefined') {
      // Sinaliza no sessionStorage pra evitar loop infinito caso o reload
      // também falhe (defesa extra; raro).
      const flag = 'auexpert-chunk-reload-attempted';
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        window.location.reload();
      }
    }
  }, [isChunkError]);

  // Durante o reload, mostra tela neutra (rápida)
  if (isChunkError) {
    return (
      <html lang="pt-BR">
        <body style={{ background: '#0D0E16', color: '#F0EDF5', minHeight: '100vh' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            color: '#A89FB5',
          }}>
            Atualizando…
          </div>
        </body>
      </html>
    );
  }

  // Fallback genérico
  return (
    <html lang="pt-BR">
      <body style={{ background: '#0D0E16', color: '#F0EDF5', minHeight: '100vh', margin: 0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <div style={{
            fontSize: '14px',
            color: '#6B6478',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}>
            auExpert · admin
          </div>
          <h1 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '32px',
            margin: 0,
            color: '#F0EDF5',
          }}>
            Algo não saiu como esperado
          </h1>
          <p style={{ color: '#A89FB5', maxWidth: '480px', lineHeight: 1.5 }}>
            Um erro inesperado aconteceu. Tente recarregar a página. Se persistir,
            me chame com a mensagem abaixo.
          </p>
          {error.digest && (
            <code style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '11px',
              background: '#161826',
              padding: '6px 10px',
              borderRadius: '6px',
              color: '#6B6478',
              border: '1px solid #2A2D3E',
            }}>
              digest: {error.digest}
            </code>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: '1rem',
              padding: '10px 20px',
              background: '#4FA89E',
              color: '#0D0E16',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
