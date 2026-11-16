import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ExportarFinanceiroPdf({ mes }: { mes: string }) {
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    setGerando(true);
    try {
      const { gerarFinanceiroPdf } = await import('@/lib/financeiroPdf');
      await gerarFinanceiroPdf(mes);
    } catch (error) {
      toast.error('Não foi possível gerar o PDF. Tente novamente.', { description: error instanceof Error ? error.message : undefined });
    } finally { setGerando(false); }
  };
  return <Button variant="outline" size="sm" onClick={gerar} disabled={gerando}>
    {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
    {gerando ? 'Gerando PDF…' : 'Gerar PDF'}
  </Button>;
}