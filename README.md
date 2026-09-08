# Studio Mūza ✦

> **"Mūza propose. Vous choisissez. Mūza s'occupe du reste."**

Studio Mūza est une plateforme SaaS mobile-first agissant comme un coach de communication et de visibilité intelligent pour les entrepreneurs, indépendants, TPE et petites entreprises.

---

## 🛠️ Stack Technique

- **Framework** : Next.js (App Router, React 19)
- **Langage** : TypeScript Strict
- **Design System** : Tailwind CSS v4 + Typographies éditoriales (`Instrument Serif` pour les titres, `Plus Jakarta Sans` pour l'interface)
- **Base de données & Auth** : Supabase (`@supabase/ssr` + PostgreSQL RLS)
- **Architecture** : SaaS Multi-tenant (Contextualisé par `workspace` et `business`)

---

## 🚀 Guide de Connexion Supabase

### 1. Variables d'environnement

Copiez le fichier exemple `.env.local.example` vers `.env.local` :

```bash
cp .env.local.example .env.local
```

Renseignez vos identifiants Supabase (disponibles dans **Supabase Dashboard > Project Settings > API**) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

> ⚠️ **Sécurité** : Ne renseignez jamais la clé `service_role` côté navigateur. Seule la clé publique `anon` doit être exposée via `NEXT_PUBLIC_`.

### 2. Génération automatique des types TypeScript Supabase

Pour synchroniser la définition des types avec votre schéma Supabase PostgreSQL existant :

```bash
# Avec la CLI Supabase
npx supabase gen types typescript --project-id <votre-project-id> > src/types/database.types.ts
```

---

## 🔒 Architecture Authentification & Multi-Tenancy

- **Gestion des sessions** : Assurée de manière transparente par `@supabase/ssr` dans les Server Components, Server Actions et Middleware Next.js.
- **Trigger Profil** : Lors de l'inscription d'un utilisateur (`auth.users`), le trigger PostgreSQL Supabase existant crée automatiquement l'entrée correspondante dans la table `profiles`.
- **Protection des routes** : Le middleware (`src/middleware.ts`) intercepte l'accès à la zone `/app` et redirige automatiquement les utilisateurs non authentifiés vers `/login`.
- **Isolation RLS** : Toutes les requêtes vers PostgreSQL respectent strictement les règles Row Level Security (RLS) associées au workspace / business de l'utilisateur.

---

## 📁 Structure du Projet

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Page de connexion
│   │   └── signup/         # Page d'inscription
│   ├── (dashboard)/
│   │   └── app/            # Zone protégée Studio Mūza ✦
│   ├── auth/
│   │   ├── actions.ts      # Server Actions (login, signup, logout)
│   │   └── callback/       # Route d'échange du code auth Supabase
│   ├── globals.css         # Tokens du Design System (Ivoire, Terracotta, Encre)
│   └── layout.tsx          # Configuration globale et polices Google Fonts
├── components/
│   ├── ui/                 # Composants réutilisables (Button, Card, Input, Badge, MuzaSymbol)
│   └── layout/             # Header et BottomNav mobile-first
├── features/               # Modules domaine (auth, business, content, recommendations...)
├── lib/
│   └── supabase/           # Clients Supabase SSR (client, server, middleware)
└── types/
    └── database.types.ts   # Typage TypeScript de la base Supabase
```

---

## ⚡ Commandes Utiles

```bash
# Démarrer le serveur de développement
npm run dev

# Vérifier les types TypeScript
npx tsc --noEmit

# Exécuter l'analyseur ESLint
npm run lint

# Compiler pour la production
npm run build
```
