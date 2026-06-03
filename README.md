# Cloud AI Research Blog - Next.js

Academic minimalism blog built with Next.js, featuring MongoDB integration for content management.

## Features

- ✅ Static generation with Next.js App Router
- ✅ MDX support for blog posts
- ✅ Optional MongoDB integration for dynamic content
- ✅ Admin panel for content management
- ✅ Academic minimalism design
- ✅ Math equations with KaTeX
- ✅ Syntax highlighting for code blocks
- ✅ Fully optimized for Vercel deployment

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Content Management

### Option 1: File-based (Default)

Add your content to:
- `content/posts/` - Blog posts (MDX)
- `content/projects/` - Projects (Markdown)
- `content/reading/` - Reading list (Markdown)

### Option 2: MongoDB (Optional)

1. Create a MongoDB database (free tier available at https://www.mongodb.com/cloud/atlas)

2. Get your connection string:
   - Go to MongoDB Atlas Dashboard
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. Update `.env.local`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
MONGODB_DB=cloud-ai-research-blog
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
```

4. Setup admin user:
   - Visit http://localhost:3000/admin/setup
   - Click "Create Admin User"
   - Go to http://localhost:3000/admin/login

## MongoDB Authentication Issues

If you get "bad auth : authentication failed":

1. **Check your MongoDB user credentials:**
   - Go to MongoDB Atlas → Database Access
   - Verify username and password
   - Create new user if needed

2. **URL encode your password:**
   - If password contains special characters (!, @, #, $, etc.)
   - Use URL encoding: https://www.urlencoder.org/
   - Example: `Pass@123` → `Pass%40123`

3. **Update connection string:**
```env
MONGODB_URI=mongodb+srv://username:encoded-password@cluster0.xxxxx.mongodb.net/
```

4. **Whitelist your IP:**
   - Go to MongoDB Atlas → Network Access
   - Add your IP address or allow all (0.0.0.0/0)

## Deployment on Vercel

1. Push your code to GitHub

2. Import on Vercel:
   - Visit https://vercel.com
   - Click "New Project"
   - Import your GitHub repository

3. Add Environment Variables:
   - `SITE_URL` - Your Vercel URL
   - `MONGODB_URI` - (Optional) Your MongoDB connection string
   - `MONGODB_DB` - Database name
   - `ADMIN_EMAIL` - Admin email
   - `ADMIN_PASSWORD` - Admin password

4. Deploy!

After deployment:
- Visit `/admin/setup` to create admin user
- Visit `/admin/login` to sign in
- Visit `/admin` to manage posts

## Project Structure

```
blog-nextjs/
├── app/
│   ├── admin/          # Admin pages
│   ├── api/            # API routes
│   ├── blog/           # Blog post pages
│   ├── projects/       # Projects page
│   └── reading-list/   # Reading list page
├── content/
│   ├── posts/          # MDX blog posts
│   ├── projects/       # Project markdown files
│   └── reading/        # Reading list markdown files
├── lib/
│   ├── mongodb.ts      # MongoDB connection
│   ├── auth.ts         # Authentication
│   └── posts.ts        # Content management
└── public/             # Static assets
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Inline styles with CSS variables
- **Database:** MongoDB (optional)
- **Auth:** bcryptjs with HTTP-only cookies
- **Markdown:** gray-matter, remark, rehype
- **Math:** KaTeX
- **Deployment:** Vercel

## License

MIT
