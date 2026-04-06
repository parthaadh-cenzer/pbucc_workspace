import { QrCodeMakerWorkspace } from "@/components/qr-code-maker/qr-code-maker-workspace";

export default function PublicQrPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
      <QrCodeMakerWorkspace />
    </main>
  );
}
