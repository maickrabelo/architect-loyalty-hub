import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Award, TrendingUp, LogOut, Search, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DestinoCard } from "@/components/DestinoCard";
import { RelatorioGestor } from "@/components/RelatorioGestor";
import AdminOverview from "@/components/dashboard/AdminOverview";

const GestorDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEmpresaDialogOpen, setIsEmpresaDialogOpen] = useState(false);
  const [editingDestino, setEditingDestino] = useState<any>(null);
  const [mesRelatorio, setMesRelatorio] = useState("2025-01");
  
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    pontos: "",
    imagem: "",
  });
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string>("");

  // Empresa form state
  const [empresaFormData, setEmpresaFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    senha: "",
  });

  // Fetch empresas do banco de dados
  const { data: empresas = [], isLoading: isLoadingEmpresas } = useQuery({
    queryKey: ['empresas-gestor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch overview agregado (fonte única de verdade para pontos/vendas)
  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_overview');
      if (error) throw error;
      return data as any;
    },
  });

  const rankingEmpresas: Array<{ id: string; nome: string; vendas: number; pontos: number; profissionais: number }> =
    overview?.ranking_empresas ?? [];
  const rankingArquitetos: Array<{ id: string; nome: string; vendas: number; pontos: number; empresas: number }> =
    overview?.ranking_arquitetos ?? [];

  // Fetch arquitetos (para contador do card superior)
  const { data: arquitetos = [] } = useQuery({
    queryKey: ['arquitetos-gestor'],
    queryFn: async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'arquiteto');
      
      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      const arquitetosIds = rolesData.map(r => r.user_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('id', arquitetosIds);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Função para calcular pontos baseado em valor de vendas (R$ 1.000 = 1 ponto)
  const calcularPontos = (valorVendas: number) => {
    return Math.floor(valorVendas / 1000);
  };

  // Totais agregados vindos do RPC
  const vendasTotais = Number(overview?.kpis?.total_vendas ?? 0);
  const pontosTotais = Number(overview?.kpis?.total_pontos ?? 0);

  // Mutation para criar empresa
  const createEmpresaMutation = useMutation({
    mutationFn: async (data: typeof empresaFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-empresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar empresa');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-gestor'] });
      toast.success("Empresa cadastrada com sucesso!");
      setIsEmpresaDialogOpen(false);
      setEmpresaFormData({
        nome: "",
        cnpj: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        senha: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar empresa");
    },
  });

  // Buscar premiações do banco ordenadas por pontos
  const { data: destinos = [] } = useQuery({
    queryKey: ['premiacoes-gestor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premiacoes')
        .select('*')
        .order('pontos_necessarios', { ascending: true });
      
      if (error) throw error;
      
      // Mapear para o formato esperado
      return (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || '',
        pontos: p.pontos_necessarios,
        imagem: p.imagem_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
      }));
    },
  });

  const handleLogout = () => {
    navigate("/");
  };

  const handleOpenDialog = (destino?: any) => {
    if (destino) {
      setEditingDestino(destino);
      setFormData({
        nome: destino.nome,
        descricao: destino.descricao,
        pontos: destino.pontos.toString(),
        imagem: destino.imagem,
      });
      setImagemPreview(destino.imagem);
      setImagemFile(null);
    } else {
      setEditingDestino(null);
      setFormData({
        nome: "",
        descricao: "",
        pontos: "",
        imagem: "",
      });
      setImagemPreview("");
      setImagemFile(null);
    }
    setIsDialogOpen(true);
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagemFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mutation para salvar premiação
  const saveDestinacaoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let imagemUrl = data.imagem;

      // Se há um arquivo de imagem para upload
      if (imagemFile) {
        const fileExt = imagemFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('premiacoes')
          .upload(filePath, imagemFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Obter URL pública da imagem
        const { data: urlData } = supabase.storage
          .from('premiacoes')
          .getPublicUrl(filePath);

        imagemUrl = urlData.publicUrl;
      }

      if (editingDestino) {
        // Update
        const { data: result, error } = await supabase
          .from('premiacoes')
          .update({
            nome: data.nome,
            descricao: data.descricao,
            pontos_necessarios: parseInt(data.pontos),
            imagem_url: imagemUrl,
          })
          .eq('id', editingDestino.id)
          .select();
        
        if (error) throw error;
        if (!result || result.length === 0) {
          throw new Error('Nenhuma premiação foi atualizada. Verifique suas permissões.');
        }
      } else {
        // Insert
        const { error } = await supabase
          .from('premiacoes')
          .insert({
            nome: data.nome,
            descricao: data.descricao,
            pontos_necessarios: parseInt(data.pontos),
            imagem_url: imagemUrl,
            ativa: true,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes-gestor'] });
      toast.success(editingDestino ? "Premiação atualizada com sucesso!" : "Premiação criada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ nome: "", descricao: "", pontos: "", imagem: "" });
      setImagemFile(null);
      setImagemPreview("");
      setEditingDestino(null);
    },
    onError: (error: any) => {
      console.error('Erro ao salvar premiação:', error);
      toast.error("Erro ao salvar premiação: " + (error.message || 'Erro desconhecido'));
    },
  });

  // Mutation para deletar premiação
  const deleteDestinacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('premiacoes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes-gestor'] });
      toast.success("Premiação removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover premiação: " + error.message);
    },
  });

  const handleSaveDestino = () => {
    if (!formData.nome || !formData.descricao || !formData.pontos) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    saveDestinacaoMutation.mutate(formData);
  };

  const handleDeleteDestino = (id: string) => {
    deleteDestinacaoMutation.mutate(id);
  };

  const handleSaveEmpresa = () => {
    if (!empresaFormData.nome || !empresaFormData.email || !empresaFormData.senha) {
      toast.error("Preencha os campos obrigatórios: Nome, Email e Senha");
      return;
    }

    createEmpresaMutation.mutate(empresaFormData);
  };

  const filteredArquitetos = rankingArquitetos.filter(arq =>
    arq.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "Platinum": return "text-primary";
      case "Ouro": return "text-yellow-500";
      case "Prata": return "text-gray-400";
      case "Bronze": return "text-orange-700";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard do Gestor</h1>
            <p className="text-xl text-muted-foreground">Visão completa do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/dashboard/financeiro")}>
              Módulo Financeiro
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Profissionais

              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{arquitetos.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{empresas.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-premium border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Pontos Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                {pontosTotais.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                R$ {vendasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-5 bg-card/50">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="arquitetos">Profissionais</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="destinos">Destinos</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          {/* Architects Tab */}
          <TabsContent value="arquitetos">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Todos os Profissionais</CardTitle>
                    <CardDescription>Ranking geral de pontuação</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar profissional..."

                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-secondary"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Empresas Parceiras</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Pontos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArquitetos.map((arquiteto, index) => (
                      <TableRow key={arquiteto.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell className="font-semibold">{arquiteto.nome ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{arquiteto.empresas}</TableCell>
                        <TableCell className="text-muted-foreground">
                          R$ {Number(arquiteto.vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {Number(arquiteto.pontos).toLocaleString()} pts
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="empresas">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Empresas Cadastradas</CardTitle>
                    <CardDescription>Gerenciar empresas parceiras</CardDescription>
                  </div>
                  <Dialog open={isEmpresaDialogOpen} onOpenChange={setIsEmpresaDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="premium">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Empresa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
                        <DialogDescription>
                          Preencha os dados da empresa parceira
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Nome da Empresa *</Label>
                          <Input
                            placeholder="Ex: Construtora ABC"
                            value={empresaFormData.nome}
                            onChange={(e) => setEmpresaFormData({ ...empresaFormData, nome: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CNPJ</Label>
                            <Input
                              placeholder="00.000.000/0000-00"
                              value={empresaFormData.cnpj}
                              onChange={(e) => setEmpresaFormData({ ...empresaFormData, cnpj: e.target.value })}
                              className="bg-secondary"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                              placeholder="(00) 0000-0000"
                              value={empresaFormData.telefone}
                              onChange={(e) => setEmpresaFormData({ ...empresaFormData, telefone: e.target.value })}
                              className="bg-secondary"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            placeholder="contato@empresa.com"
                            value={empresaFormData.email}
                            onChange={(e) => setEmpresaFormData({ ...empresaFormData, email: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Senha de Acesso *</Label>
                          <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={empresaFormData.senha}
                            onChange={(e) => setEmpresaFormData({ ...empresaFormData, senha: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Endereço</Label>
                          <Input
                            placeholder="Rua, número"
                            value={empresaFormData.endereco}
                            onChange={(e) => setEmpresaFormData({ ...empresaFormData, endereco: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input
                              placeholder="Ex: São Paulo"
                              value={empresaFormData.cidade}
                              onChange={(e) => setEmpresaFormData({ ...empresaFormData, cidade: e.target.value })}
                              className="bg-secondary"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Estado</Label>
                            <Input
                              placeholder="Ex: SP"
                              value={empresaFormData.estado}
                              onChange={(e) => setEmpresaFormData({ ...empresaFormData, estado: e.target.value })}
                              className="bg-secondary"
                              maxLength={2}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsEmpresaDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="premium"
                            onClick={handleSaveEmpresa}
                            disabled={createEmpresaMutation.isPending}
                          >
                            {createEmpresaMutation.isPending ? "Salvando..." : "Cadastrar Empresa"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingEmpresas ? (
                  <p className="text-center text-muted-foreground py-8">Carregando empresas...</p>
                ) : empresas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {empresas.map((empresa) => {
                      const rank = rankingEmpresas.find(r => r.id === empresa.id);
                      const totalVendas = Number(rank?.vendas ?? 0);
                      
                      return (
                        <div 
                          key={empresa.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-secondary rounded-lg gap-4 hover:bg-secondary/80 transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-xl mb-1">{empresa.nome}</p>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {empresa.email && <p>Email: {empresa.email}</p>}
                              {empresa.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                              {empresa.telefone && <p>Telefone: {empresa.telefone}</p>}
                              {empresa.cidade && empresa.estado && (
                                <p>Localização: {empresa.cidade}/{empresa.estado}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-primary">
                              {calcularPontos(totalVendas).toLocaleString()} pts
                            </p>
                            <p className="text-sm text-muted-foreground">
                              R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Destinations Tab */}
          <TabsContent value="destinos">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Gerenciar Destinos de Premiação
                    </CardTitle>
                    <CardDescription>Crie e edite destinos exclusivos para os profissionais</CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="premium" onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Destino
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-card">
                      <DialogHeader>
                        <DialogTitle>
                          {editingDestino ? "Editar Destino" : "Novo Destino de Premiação"}
                        </DialogTitle>
                        <DialogDescription>
                          Preencha os detalhes do destino premium
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Nome do Destino</Label>
                          <Input
                            placeholder="Ex: Paris, França"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            placeholder="Descreva a experiência premium que o profissional terá neste destino..."
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            className="bg-secondary min-h-24"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Pontos Necessários</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 5000"
                            value={formData.pontos}
                            onChange={(e) => setFormData({ ...formData, pontos: e.target.value })}
                            className="bg-secondary"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Imagem da Premiação</Label>
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImagemChange}
                              className="bg-secondary"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Faça upload de uma imagem ou deixe em branco para usar a imagem padrão
                          </p>
                        </div>

                        {imagemPreview && (
                          <div className="space-y-2">
                            <Label>Preview da Imagem</Label>
                            <div className="relative h-48 rounded-lg overflow-hidden bg-secondary">
                              <img 
                                src={imagemPreview} 
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop";
                                }}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="premium" 
                            onClick={handleSaveDestino}
                            className="flex-1"
                          >
                            {editingDestino ? "Atualizar Destino" : "Criar Destino"}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {destinos.map((destino) => (
                    <div key={destino.id} className="relative group">
                      <DestinoCard
                        nome={destino.nome}
                        descricao={destino.descricao}
                        pontos={destino.pontos}
                        imagem={destino.imagem}
                      />
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handleOpenDialog(destino)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDeleteDestino(destino.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="relatorios">
            <RelatorioGestor
              mes={mesRelatorio}
              onMesChange={setMesRelatorio}
              dataArquitetos={rankingArquitetos.slice(0, 5).map(arq => ({
                nome: (arq.nome ?? '—').split(' ')[0],
                pontos: Number(arq.pontos),
              }))}
              dataEmpresas={rankingEmpresas.slice(0, 5).map(emp => ({
                nome: emp.nome,
                pontos: Number(emp.pontos),
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GestorDashboard;
