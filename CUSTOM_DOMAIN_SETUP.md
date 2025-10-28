# 🌐 Custom Domain Setup for Kwikr Directory

Your Kwikr Directory platform is **100% working** with database and search functionality. Here's how to get it on your custom domain.

## 🏆 **OPTION 1: Vercel (RECOMMENDED - Free & Easy)**

### **✅ Why Vercel?**
- ✅ **Free custom domains** (no cost)
- ✅ **Automatic SSL certificates** (HTTPS)
- ✅ **Global CDN** (fast worldwide)
- ✅ **Zero configuration** (works with your Hono build)
- ✅ **No API tokens needed** (unlike Cloudflare)

### **🚀 Deploy Steps:**

#### **1. Create Vercel Account**
- Visit: https://vercel.com
- Sign up with GitHub (connect to getkwikr25/kwikr2.0)

#### **2. Deploy Project**
- Click "New Project"
- Import `getkwikr25/kwikr2.0` repository
- **Build settings:**
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

#### **3. Add Custom Domain**
- Go to Project Settings → Domains
- Add your domain: `kwikr.com` or `kwikrdirectory.com`
- Vercel provides DNS instructions

#### **4. Configure DNS (Your Domain Provider)**
```
Type: CNAME
Name: @ (or www)
Value: cname.vercel-dns.com
```

**Result**: `https://yourdomain.com` → Working Kwikr Directory

---

## 🔧 **OPTION 2: Netlify (Also Free & Reliable)**

### **🚀 Deploy Steps:**

#### **1. Create Netlify Account**
- Visit: https://netlify.com
- Connect GitHub account

#### **2. Deploy from Git**
- "New site from Git" → GitHub → `getkwikr2.0`
- **Build settings:**
  - Build command: `npm run build`
  - Publish directory: `dist`

#### **3. Add Custom Domain**
- Site settings → Domain management
- Add custom domain → Enter your domain
- Follow DNS configuration

#### **4. Configure DNS**
```
Type: CNAME  
Name: www
Value: optimistic-newton-123456.netlify.app

Type: A
Name: @
Value: 75.2.60.5
```

---

## ☁️ **OPTION 3: Cloudflare Pages (If You Fix API Token)**

**Only if you want to retry Cloudflare after fixing API permissions:**

### **Required API Token Permissions:**
```
✅ Account:Read
✅ Cloudflare Pages:Edit  ← ADD THIS
✅ Cloudflare Workers:Edit ← ADD THIS  
✅ Cloudflare D1:Edit
✅ Zone:Read
✅ Zone:Edit             ← ADD THIS (for custom domains)
```

### **Deploy Commands:**
```bash
# After fixing API token:
npx wrangler pages deploy dist --project-name kwikr-directory-v2
npx wrangler pages domain add yourdomain.com --project-name kwikr-directory-v2
```

---

## 💰 **COST COMPARISON:**

| Platform | Custom Domain | SSL | CDN | Cost |
|----------|---------------|-----|-----|------|
| **Vercel** | ✅ Free | ✅ Free | ✅ Free | **$0/month** |
| **Netlify** | ✅ Free | ✅ Free | ✅ Free | **$0/month** |
| **Cloudflare Pages** | ✅ Free | ✅ Free | ✅ Free | **$0/month** |

---

## 🎯 **RECOMMENDED ACTION:**

### **For Immediate Results:**
1. **Go to Vercel.com**
2. **Sign up with GitHub**
3. **Import getkwikr25/kwikr2.0**
4. **Deploy in 2 minutes**
5. **Add your custom domain**

### **Your Working Platform:**
- ✅ **Database**: SQLite with HVAC workers
- ✅ **Search**: Service/Province/City filtering  
- ✅ **Workers**: Kevin Brown (Calgary), Lisa Anderson (Vancouver), Mark Johnson (Toronto)
- ✅ **Build**: Ready in `dist/` folder

**Current Live URL**: https://3000-il89rmlurnxheu701hcp8-6532622b.e2b.dev

**Future Custom URL**: `https://yourdomain.com` (same functionality)

---

## 🔧 **Need Help?**

If you need assistance with:
- Domain purchase recommendations
- DNS configuration  
- SSL certificate setup
- Custom email setup (admin@yourdomain.com)

Just let me know your preferred domain name and I can provide specific instructions!