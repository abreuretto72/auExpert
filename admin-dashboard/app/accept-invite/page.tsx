import { AcceptInviteForm } from './accept-invite-form';

export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? '';

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl mb-2">
            <span className="italic text-ametista">au</span>Expert
          </h1>
          <p className="text-text-muted text-sm">Aceite seu convite para o painel admin</p>
        </div>

        {!token ? (
          <div className="text-danger text-sm text-center py-4">
            Token de convite ausente. Verifique se você abriu o link completo do e-mail.
          </div>
        ) : (
          <AcceptInviteForm token={token} />
        )}
      </div>
    </main>
  );
}
