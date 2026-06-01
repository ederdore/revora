# ⭐ StarLoop — Setup Completo

## Stack
- **Frontend:** React + Vite
- **Banco:** Supabase (PostgreSQL)
- **Deploy:** Vercel
- **Código:** GitHub

---

## 1. GitHub — criar repositório

```bash
# No terminal do VS Code:
cd starloop
git init
git add .
git commit -m "feat: StarLoop MVP v0.1"
```

Acesse github.com → New Repository → nome: `starloop`

```bash
git remote add origin https://github.com/SEU_USER/starloop.git
git branch -M main
git push -u origin main
```

---

## 2. Supabase — banco de dados

1. Acesse **supabase.com** → New Project
2. Dê um nome: `starloop` → crie senha forte → região: **South America (São Paulo)**
3. Aguarde criar (~2 min)
4. Vá em **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → Run
5. Vá em **Settings > API** e copie:
   - `Project URL`
   - `anon public key`

---

## 3. Variáveis de ambiente

Crie um arquivo `.env` na raiz (não commitar):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## 4. Rodar local

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

- `/` → Página inicial com os 2 links
- `/admin` → Painel do dono
- `/atendente` → Tela do funcionário

---

## 5. Vercel — deploy

1. Acesse **vercel.com** → Add New Project
2. Importe o repositório do GitHub
3. Em **Environment Variables** adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

Pronto! URL gerada automaticamente tipo `starloop-xxx.vercel.app`

---

## Links úteis para validação

| Rota | Quem usa |
|---|---|
| `/` | Página inicial |
| `/admin` | Dono do negócio |
| `/atendente` | Funcionário na recepção |

---

## Próximos passos (pós-validação)

- [ ] Integração Telegram Bot API
- [ ] Auth por negócio (login)
- [ ] Cobrança recorrente (Asaas)
- [ ] Suporte a múltiplas empresas
- [ ] Idiomas: PT-BR, PT-PT, IT

## cod 
9RwqJxV6cNPQdCWi
c3,88t!j3-AZKyu