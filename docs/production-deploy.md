# Deploy de produção

Este projeto já tem suporte para deploy em um servidor com Docker Compose.

## O que é necessário

- Um servidor Linux (VPS, máquina virtual ou máquina dedicada)
- Docker e Docker Compose instalados no servidor
- Um domínio ou subdomínio para acesso público (opcional, mas recomendado)
- Um arquivo `.env` com variáveis de produção

## Passo a passo

1. Conecte-se ao servidor via SSH.
2. Clone o repositório:

```bash
git clone https://github.com/rafaelrfl0900-ship-it/nexus-operacional.git
cd nexus-operacional
```

3. Crie um arquivo `.env` a partir do `.env.example` e atualize os valores:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `WEB_ORIGIN` (o URL público do frontend)
- `NEXT_PUBLIC_API_URL` (o URL público da API)
- `DATABASE_URL` (a string de conexão PostgreSQL)

4. Execute o deploy:

```bash
docker compose up -d --build
```

5. Aplique as migrações do Prisma e seed:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

## URLs recomendadas

- Frontend: `http://seu-dominio-ou-ip/`
- API: `http://seu-dominio-ou-ip:3333/api`
- Health: `http://seu-dominio-ou-ip:3333/api/health`

## Domínio profissional

Para ter um link profissional, você pode usar um domínio próprio e apontar o registro DNS para o IP do servidor.

- Configure um `A record` para `@` para o IP do servidor
- Configure um `CNAME` para `www` se quiser `www.seu-dominio.com`
- Use um proxy reverso como Nginx, Caddy ou Traefik para servir o frontend e a API em portas padrão (80/443)

## Observação

Este deploy coloca o backend e o frontend no mesmo servidor. Se você preferir, pode continuar usando o frontend estático no GitHub Pages e hospedar apenas a API em um servidor separado.
