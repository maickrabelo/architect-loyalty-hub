import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";
import { Award, Upload, Eye, EyeOff, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { SectionLabel } from "@/components/brand/SectionLabel";

// Validation schema for registration form
const registerSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  nome: z.string()
    .trim()
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  senha: z.string()
    .min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
  nomeDivulgacao: z.string().max(100).optional(),
  cnpj_cpf: z.string()
    .regex(/^(\d{11}|\d{14})$/, { message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos" })
    .optional()
    .or(z.literal("")),
  rg: z.string().max(20).optional().or(z.literal("")),
  telefone: z.string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, { message: "Telefone inválido. Use o formato (00) 0000-0000" })
    .optional()
    .or(z.literal("")),
  celular: z.string()
    .regex(/^\(\d{2}\)\s?\d{5}-?\d{4}$/, { message: "Celular inválido. Use o formato (00) 00000-0000" })
    .optional()
    .or(z.literal("")),
  instagram: z.string().max(100).optional(),
  facebook: z.string().max(100).optional(),
  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, { message: "CEP inválido. Use o formato 00000-000" })
    .optional()
    .or(z.literal("")),
  endereco: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  bairro: z.string().max(100).optional(),
  complemento: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  estado: z.string().max(2).optional(),
  apresentacao: z.string().max(1000).optional(),
  observacao: z.string().max(500).optional(),
  profissao: z.string().max(100).optional(),
});

const Cadastro = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imagemPreview, setImagemPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoCadastro, setTipoCadastro] = useState<"liberal" | "escritorio">("liberal");
  const [membros, setMembros] = useState<Array<{ nome: string; telefone: string; nascimento: string }>>([
    { nome: "", telefone: "", nascimento: "" },
  ]);

  const addMembro = () => setMembros([...membros, { nome: "", telefone: "", nascimento: "" }]);
  const removeMembro = (i: number) => setMembros(membros.filter((_, idx) => idx !== i));
  const updateMembro = (i: number, field: "nome" | "telefone" | "nascimento", value: string) =>
    setMembros(membros.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    nome: "",
    senha: "",
    confirmacaoSenha: "",
    nomeDivulgacao: "",
    cnpjCpf: "",
    rg: "",
    nascimento: "",
    sexo: "",
    telefone: "",
    celular: "",
    instagram: "",
    facebook: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    complemento: "",
    cidade: "",
    estado: "",
    apresentacao: "",
    observacao: "",
    profissao: "",
    imagemProfissional: null as File | null,
  });

  // Função para calcular força da senha
  const calcularForcaSenha = (senha: string) => {
    let forca = 0;
    if (senha.length >= 8) forca += 25;
    if (senha.length >= 12) forca += 15;
    if (/[a-z]/.test(senha)) forca += 15;
    if (/[A-Z]/.test(senha)) forca += 15;
    if (/[0-9]/.test(senha)) forca += 15;
    if (/[^a-zA-Z0-9]/.test(senha)) forca += 15;
    return Math.min(forca, 100);
  };

  const forcaSenha = calcularForcaSenha(formData.senha);
  
  const getNivelSenha = (forca: number) => {
    if (forca < 30) return { texto: "Fraca", cor: "text-red-500" };
    if (forca < 60) return { texto: "Média", cor: "text-yellow-500" };
    if (forca < 80) return { texto: "Boa", cor: "text-blue-500" };
    return { texto: "Forte", cor: "text-green-500" };
  };

  const nivelSenha = getNivelSenha(forcaSenha);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imagemProfissional: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData({
            ...formData,
            cep,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check password confirmation
    if (formData.senha !== formData.confirmacaoSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (forcaSenha < 30) {
      toast.error("A senha é muito fraca. Por favor, use uma senha mais forte.");
      return;
    }

    // Validate form data using zod schema
    try {
      registerSchema.parse({
        email: formData.email,
        nome: formData.nome,
        senha: formData.senha,
        nomeDivulgacao: formData.nomeDivulgacao,
        cnpj_cpf: formData.cnpjCpf,
        rg: formData.rg,
        telefone: formData.telefone,
        celular: formData.celular,
        instagram: formData.instagram,
        facebook: formData.facebook,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        complemento: formData.complemento,
        cidade: formData.cidade,
        estado: formData.estado,
        apresentacao: formData.apresentacao,
        observacao: formData.observacao,
        profissao: formData.profissao,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: formData.nome,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Atualizar perfil com dados completos
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          nome_divulgacao: formData.nomeDivulgacao || null,
          cnpj_cpf: formData.cnpjCpf || null,
          rg: formData.rg || null,
          nascimento: formData.nascimento || null,
          sexo: formData.sexo as any || null,
          telefone: formData.telefone || null,
          celular: formData.celular || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          cep: formData.cep || null,
          endereco: formData.endereco || null,
          numero: formData.numero || null,
          bairro: formData.bairro || null,
          complemento: formData.complemento || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          apresentacao: formData.apresentacao || null,
          observacao: formData.observacao || null,
          profissao: formData.profissao || null,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Role 'arquiteto' é criada automaticamente pelo trigger do banco de dados
      
      toast.success("Cadastro realizado com sucesso! Você já pode fazer login.");
      navigate("/login");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      if (error.message?.includes('already registered')) {
        toast.error("Este email já está cadastrado. Tente fazer login ou use outro email.");
      } else {
        toast.error("Erro ao realizar cadastro: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />

      <div className="max-w-4xl mx-auto pt-28 px-4">
        <Link to="/login" className="inline-flex items-center gap-2 label-tag-muted hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Voltar para login
        </Link>

        <Card className="bg-card border border-border rounded-[1.25rem] shadow-[var(--shadow-soft)] animate-fade-in overflow-hidden">
          <CardHeader className="text-center pt-10">
            <div className="flex justify-center mb-4">
              <Award className="h-8 w-8 text-primary-deep" strokeWidth={1.5} />
            </div>
            <SectionLabel className="mb-2">Cadastro</SectionLabel>
            <CardTitle className="text-display text-4xl">Cadastro de Profissional</CardTitle>
            <CardDescription className="text-base mt-2">
              Preencha seus dados para se cadastrar no Grupo Conexão
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 md:px-12 pb-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Dados de Acesso */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Dados de Acesso</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      required
                      value={formData.nome}
                      onChange={(e) => updateField("nome", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Nova Senha *</Label>
                    <div className="relative">
                      <Input
                        id="senha"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.senha}
                        onChange={(e) => updateField("senha", e.target.value)}
                        className="bg-secondary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.senha && (
                      <div className="space-y-1">
                        <Progress value={forcaSenha} className="h-2" />
                        <p className={`text-xs font-medium ${nivelSenha.cor}`}>
                          Nível de dificuldade: {nivelSenha.texto}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmacaoSenha">Confirmação de Senha *</Label>
                    <div className="relative">
                      <Input
                        id="confirmacaoSenha"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmacaoSenha}
                        onChange={(e) => updateField("confirmacaoSenha", e.target.value)}
                        className="bg-secondary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Dados Pessoais</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeDivulgacao">Nome Divulgação</Label>
                    <Input
                      id="nomeDivulgacao"
                      value={formData.nomeDivulgacao}
                      onChange={(e) => updateField("nomeDivulgacao", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpjCpf">CNPJ/CPF</Label>
                    <Input
                      id="cnpjCpf"
                      value={formData.cnpjCpf}
                      onChange={(e) => updateField("cnpjCpf", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => updateField("rg", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nascimento">Data de Nascimento</Label>
                    <Input
                      id="nascimento"
                      type="date"
                      value={formData.nascimento}
                      onChange={(e) => updateField("nascimento", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo</Label>
                    <Select value={formData.sexo} onValueChange={(value) => updateField("sexo", value)}>
                      <SelectTrigger id="sexo" className="bg-secondary">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                        <SelectItem value="nao-informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input
                      id="profissao"
                      value={formData.profissao}
                      onChange={(e) => updateField("profissao", e.target.value)}
                      className="bg-secondary"
                      placeholder="Ex: Arquiteto(a), Designer, Decorador(a)"
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Contato</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => updateField("telefone", e.target.value)}
                      className="bg-secondary"
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input
                      id="celular"
                      type="tel"
                      value={formData.celular}
                      onChange={(e) => updateField("celular", e.target.value)}
                      className="bg-secondary"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => updateField("instagram", e.target.value)}
                      className="bg-secondary"
                      placeholder="@seu_instagram"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={formData.facebook}
                      onChange={(e) => updateField("facebook", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Endereço</h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => updateField("cep", e.target.value)}
                      onBlur={(e) => buscarCep(e.target.value)}
                      className="bg-secondary"
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => updateField("endereco", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => updateField("numero", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => updateField("bairro", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => updateField("complemento", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => updateField("cidade", e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(value) => updateField("estado", value)}>
                      <SelectTrigger id="estado" className="bg-secondary">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="AL">AL</SelectItem>
                        <SelectItem value="AP">AP</SelectItem>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="BA">BA</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="DF">DF</SelectItem>
                        <SelectItem value="ES">ES</SelectItem>
                        <SelectItem value="GO">GO</SelectItem>
                        <SelectItem value="MA">MA</SelectItem>
                        <SelectItem value="MT">MT</SelectItem>
                        <SelectItem value="MS">MS</SelectItem>
                        <SelectItem value="MG">MG</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        <SelectItem value="PB">PB</SelectItem>
                        <SelectItem value="PR">PR</SelectItem>
                        <SelectItem value="PE">PE</SelectItem>
                        <SelectItem value="PI">PI</SelectItem>
                        <SelectItem value="RJ">RJ</SelectItem>
                        <SelectItem value="RN">RN</SelectItem>
                        <SelectItem value="RS">RS</SelectItem>
                        <SelectItem value="RO">RO</SelectItem>
                        <SelectItem value="RR">RR</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="SP">SP</SelectItem>
                        <SelectItem value="SE">SE</SelectItem>
                        <SelectItem value="TO">TO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-border pb-2">Informações Adicionais</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apresentacao">Apresentação</Label>
                    <Textarea
                      id="apresentacao"
                      value={formData.apresentacao}
                      onChange={(e) => updateField("apresentacao", e.target.value)}
                      className="bg-secondary min-h-24"
                      placeholder="Conte um pouco sobre você e sua experiência profissional..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacao">Observação</Label>
                    <Textarea
                      id="observacao"
                      value={formData.observacao}
                      onChange={(e) => updateField("observacao", e.target.value)}
                      className="bg-secondary min-h-24"
                      placeholder="Informações adicionais relevantes..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imagemProfissional">Imagem Profissional</Label>
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="imagemProfissional"
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md cursor-pointer transition-colors border border-border"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Selecionar Imagem</span>
                      </label>
                      <input
                        id="imagemProfissional"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      {formData.imagemProfissional && (
                        <span className="text-sm text-muted-foreground">
                          {formData.imagemProfissional.name}
                        </span>
                      )}
                    </div>
                    {imagemPreview && (
                      <div className="mt-4">
                        <img
                          src={imagemPreview}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border border-border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="premium" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;
